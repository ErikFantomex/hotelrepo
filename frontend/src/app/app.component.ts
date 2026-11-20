import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Employee, EmployeeService } from './employee.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);

  employees: Employee[] = [];
  loading = true;
  saving = false;
  formOpen = false;
  editingEmployee: Employee | null = null;
  notice = '';
  noticeType: 'success' | 'error' = 'success';

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly employeeForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    salary: new FormControl<number>(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] })
  });

  ngOnInit(): void {
    this.loadEmployees();
  }

  get filteredEmployees(): Employee[] {
    const query = this.searchControl.value.trim().toLowerCase();
    if (!query) return this.employees;
    return this.employees.filter(employee =>
      employee.name.toLowerCase().includes(query) ||
      employee.email.toLowerCase().includes(query)
    );
  }

  loadEmployees(): void {
    this.loading = true;
    this.employeeService.getAll().subscribe({
      next: employees => {
        this.employees = employees;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.showNotice('Could not load employees. Check that the API is running.', 'error');
      }
    });
  }

  openCreate(): void {
    this.editingEmployee = null;
    this.employeeForm.reset({ name: '', email: '', salary: 0 });
    this.formOpen = true;
  }

  openEdit(employee: Employee): void {
    this.editingEmployee = employee;
    this.employeeForm.reset({
      name: employee.name,
      email: employee.email,
      salary: employee.salary
    });
    this.formOpen = true;
  }

  closeForm(): void {
    if (!this.saving) this.formOpen = false;
  }

  saveEmployee(): void {
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      return;
    }

    const value = this.employeeForm.getRawValue();
    const employee: Employee = {
      id: this.editingEmployee?.id,
      name: value.name.trim(),
      email: value.email.trim(),
      salary: value.salary
    };

    this.saving = true;
    const request = this.editingEmployee?.id
      ? this.employeeService.update(this.editingEmployee.id, employee)
      : this.employeeService.create(employee);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.formOpen = false;
        this.showNotice(this.editingEmployee ? 'Employee updated.' : 'Employee created.');
        this.loadEmployees();
      },
      error: error => {
        this.saving = false;
        const message = error.error?.message ?? 'Could not save employee.';
        this.showNotice(message, 'error');
      }
    });
  }

  deleteEmployee(employee: Employee): void {
    if (!employee.id || !window.confirm(`Delete ${employee.name}?`)) return;
    this.employeeService.delete(employee.id).subscribe({
      next: () => {
        this.showNotice('Employee deleted.');
        this.loadEmployees();
      },
      error: () => this.showNotice('Could not delete employee.', 'error')
    });
  }

  controlInvalid(controlName: 'name' | 'email' | 'salary'): boolean {
    const control = this.employeeForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  initials(name: string): string {
    return name.split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase();
  }

  private showNotice(message: string, type: 'success' | 'error' = 'success'): void {
    this.notice = message;
    this.noticeType = type;
  }
}
