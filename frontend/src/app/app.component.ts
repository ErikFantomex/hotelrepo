import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Employee, EmployeeService } from './employee.service';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export type SortColumn = 'id' | 'name' | 'email' | 'salary';
export type SortDirection = 'asc' | 'desc';
export type SalaryFilter = 'all' | 'under50k' | '50kTo100k' | 'over100k';

@Component({
  selector: 'app-root',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);

  // Data state
  employees: Employee[] = [];
  loading = true;
  refreshing = false;
  apiConnected = true;

  // Filter & Sort state
  readonly searchControl = new FormControl('', { nonNullable: true });
  salaryFilter: SalaryFilter = 'all';
  sortBy: SortColumn = 'name';
  sortDirection: SortDirection = 'asc';

  // Pagination state
  currentPage = 1;
  pageSize = 8;
  readonly pageSizeOptions = [5, 8, 15, 25];

  // Form & Modals state
  formOpen = false;
  saving = false;
  editingEmployee: Employee | null = null;
  serverErrors: Record<string, string> = {};

  deleteModalOpen = false;
  employeeToDelete: Employee | null = null;
  deleting = false;

  viewDrawerOpen = false;
  selectedEmployee: Employee | null = null;

  // Toast notifications
  toasts: Toast[] = [];
  private toastCounter = 0;

  readonly employeeForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(60)]
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    salary: new FormControl<number>(50000, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(10000000)]
    })
  });

  readonly salaryPresets = [35000, 55000, 75000, 100000, 130000];

  ngOnInit(): void {
    this.loadEmployees();
    this.searchControl.valueChanges.subscribe(() => {
      this.currentPage = 1;
    });
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    if (this.deleteModalOpen && !this.deleting) {
      this.cancelDelete();
    } else if (this.formOpen && !this.saving) {
      this.closeForm();
    } else if (this.viewDrawerOpen) {
      this.closeView();
    }
  }

  // --- Data Loading ---
  loadEmployees(isRefresh = false): void {
    if (isRefresh) {
      this.refreshing = true;
    } else {
      this.loading = true;
    }

    this.employeeService.getAll().subscribe({
      next: (employees) => {
        this.employees = employees;
        this.loading = false;
        this.refreshing = false;
        this.apiConnected = true;
        if (isRefresh) {
          this.showToast('Employee roster refreshed.', 'info');
        }
      },
      error: () => {
        this.loading = false;
        this.refreshing = false;
        this.apiConnected = false;
        this.showToast('Could not connect to backend API. Please verify server status.', 'error');
      }
    });
  }

  // --- Metrics & KPI Getters ---
  get totalStaffCount(): number {
    return this.employees.length;
  }

  get totalPayroll(): number {
    return this.employees.reduce((acc, curr) => acc + (curr.salary || 0), 0);
  }

  get averageSalary(): number {
    return this.totalStaffCount > 0 ? Math.round(this.totalPayroll / this.totalStaffCount) : 0;
  }

  get topEarner(): Employee | null {
    if (this.employees.length === 0) return null;
    return this.employees.reduce((max, e) => (e.salary > (max?.salary || 0) ? e : max), this.employees[0]);
  }

  // --- Filtering & Sorting ---
  get filteredEmployees(): Employee[] {
    const query = this.searchControl.value.trim().toLowerCase();

    return this.employees.filter((emp) => {
      // Search text match
      const matchesSearch =
        !query ||
        emp.name.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query) ||
        (emp.id !== undefined && emp.id.toString().includes(query));

      // Salary filter
      let matchesSalary = true;
      if (this.salaryFilter === 'under50k') {
        matchesSalary = emp.salary < 50000;
      } else if (this.salaryFilter === '50kTo100k') {
        matchesSalary = emp.salary >= 50000 && emp.salary <= 100000;
      } else if (this.salaryFilter === 'over100k') {
        matchesSalary = emp.salary > 100000;
      }

      return matchesSearch && matchesSalary;
    });
  }

  get sortedEmployees(): Employee[] {
    const list = [...this.filteredEmployees];
    list.sort((a, b) => {
      let comparison = 0;
      switch (this.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'salary':
          comparison = (a.salary || 0) - (b.salary || 0);
          break;
        case 'id':
          comparison = (a.id || 0) - (b.id || 0);
          break;
      }
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
    return list;
  }

  get paginatedEmployees(): Employee[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.sortedEmployees.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.sortedEmployees.length / this.pageSize));
  }

  get pageStart(): number {
    if (this.sortedEmployees.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.sortedEmployees.length);
  }

  setSort(column: SortColumn): void {
    if (this.sortBy === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDirection = 'asc';
    }
  }

  setSalaryFilter(filter: SalaryFilter): void {
    this.salaryFilter = filter;
    this.currentPage = 1;
  }

  clearSearch(): void {
    this.searchControl.setValue('');
  }

  resetAllFilters(): void {
    this.searchControl.setValue('');
    this.salaryFilter = 'all';
    this.currentPage = 1;
  }

  setPageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // --- CRUD Modals ---
  openCreate(): void {
    this.editingEmployee = null;
    this.serverErrors = {};
    this.employeeForm.reset({ name: '', email: '', salary: 50000 });
    this.formOpen = true;
  }

  openEdit(employee: Employee, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.editingEmployee = employee;
    this.serverErrors = {};
    this.employeeForm.reset({
      name: employee.name,
      email: employee.email,
      salary: employee.salary
    });
    this.formOpen = true;
  }

  closeForm(): void {
    if (!this.saving) {
      this.formOpen = false;
      this.serverErrors = {};
    }
  }

  applySalaryPreset(amount: number): void {
    this.employeeForm.controls.salary.setValue(amount);
    this.employeeForm.controls.salary.markAsDirty();
  }

  saveEmployee(): void {
    this.serverErrors = {};

    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      return;
    }

    const value = this.employeeForm.getRawValue();
    const payload: Employee = {
      id: this.editingEmployee?.id,
      name: value.name.trim(),
      email: value.email.trim(),
      salary: Number(value.salary)
    };

    this.saving = true;
    const request = this.editingEmployee?.id
      ? this.employeeService.update(this.editingEmployee.id, payload)
      : this.employeeService.create(payload);

    request.subscribe({
      next: (saved) => {
        this.saving = false;
        this.formOpen = false;
        const msg = this.editingEmployee
          ? `Updated details for ${saved.name}.`
          : `Added ${saved.name} to the team.`;
        this.showToast(msg, 'success');
        this.loadEmployees();
        if (this.selectedEmployee?.id === saved.id) {
          this.selectedEmployee = saved;
        }
      },
      error: (error) => {
        this.saving = false;
        if (error.status === 400 && error.error && typeof error.error === 'object') {
          // Field validation errors from backend
          this.serverErrors = error.error;
          this.showToast('Please fix the indicated validation errors.', 'error');
        } else if (error.status === 409) {
          // Conflict / duplicate email
          const msg = error.error?.message || 'An employee with this email already exists.';
          this.serverErrors['email'] = msg;
          this.showToast(msg, 'error');
        } else {
          const fallback = error.error?.message || 'An unexpected error occurred while saving.';
          this.showToast(fallback, 'error');
        }
      }
    });
  }

  // --- Delete confirmation ---
  openDeleteModal(employee: Employee, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.employeeToDelete = employee;
    this.deleteModalOpen = true;
  }

  cancelDelete(): void {
    if (!this.deleting) {
      this.deleteModalOpen = false;
      this.employeeToDelete = null;
    }
  }

  executeDelete(): void {
    if (!this.employeeToDelete?.id) return;

    this.deleting = true;
    const targetName = this.employeeToDelete.name;
    const targetId = this.employeeToDelete.id;

    this.employeeService.delete(targetId).subscribe({
      next: () => {
        this.deleting = false;
        this.deleteModalOpen = false;
        this.employeeToDelete = null;
        if (this.selectedEmployee?.id === targetId) {
          this.selectedEmployee = null;
          this.viewDrawerOpen = false;
        }
        this.showToast(`Removed ${targetName} from the team.`, 'success');
        this.loadEmployees();
      },
      error: () => {
        this.deleting = false;
        this.showToast(`Failed to delete ${targetName}. Please try again.`, 'error');
      }
    });
  }

  // --- View Details Drawer ---
  openView(employee: Employee): void {
    this.selectedEmployee = employee;
    this.viewDrawerOpen = true;
  }

  closeView(): void {
    this.viewDrawerOpen = false;
    this.selectedEmployee = null;
  }

  // --- Export to CSV ---
  exportToCsv(): void {
    const listToExport = this.sortedEmployees.length > 0 ? this.sortedEmployees : this.employees;
    if (listToExport.length === 0) {
      this.showToast('No employee records available to export.', 'info');
      return;
    }

    const headers = ['ID', 'Full Name', 'Email Address', 'Annual Salary (USD)', 'Monthly Estimate (USD)'];
    const rows = listToExport.map((emp) => [
      emp.id ?? '',
      `"${emp.name.replace(/"/g, '""')}"`,
      `"${emp.email.replace(/"/g, '""')}"`,
      emp.salary,
      Math.round(emp.salary / 12)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `employees_roster_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToast(`Exported ${listToExport.length} employees to CSV.`, 'success');
  }

  // --- UI Helpers ---
  controlInvalid(name: 'name' | 'email' | 'salary'): boolean {
    const control = this.employeeForm.controls[name];
    return (control.invalid && (control.touched || control.dirty)) || !!this.serverErrors[name];
  }

  getErrorMessage(name: 'name' | 'email' | 'salary'): string {
    if (this.serverErrors[name]) return this.serverErrors[name];
    const control = this.employeeForm.controls[name];
    if (control.hasError('required')) return 'This field is required';
    if (control.hasError('email')) return 'Please enter a valid email address';
    if (control.hasError('minlength')) return 'Must be at least 2 characters';
    if (control.hasError('min')) return 'Salary cannot be negative';
    return 'Invalid input';
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  getAvatarTheme(name: string): { bg: string; text: string } {
    const palette = [
      { bg: '#dbeafe', text: '#1d4ed8' }, // Blue
      { bg: '#ede9fe', text: '#6d28d9' }, // Violet
      { bg: '#fce7f3', text: '#be185d' }, // Pink
      { bg: '#d1fae5', text: '#047857' }, // Emerald
      { bg: '#fef3c7', text: '#b45309' }, // Amber
      { bg: '#cffafe', text: '#0e7490' }, // Cyan
      { bg: '#ffedd5', text: '#c2410c' }  // Orange
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % palette.length;
    return palette[index];
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    const id = ++this.toastCounter;
    this.toasts.push({ id, message, type });
    setTimeout(() => {
      this.dismissToast(id);
    }, 4000);
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }
}
