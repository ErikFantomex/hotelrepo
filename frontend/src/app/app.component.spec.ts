import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { EmployeeService, Employee } from './employee.service';
import { of, throwError } from 'rxjs';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let mockEmployeeService: jasmine.SpyObj<EmployeeService>;

  const initialEmployees: Employee[] = [
    { id: 1, name: 'Alice Smith', email: 'alice@company.com', salary: 60000 },
    { id: 2, name: 'Bob Jones', email: 'bob@company.com', salary: 120000 },
    { id: 3, name: 'Charlie Brown', email: 'charlie@company.com', salary: 45000 }
  ];

  beforeEach(async () => {
    mockEmployeeService = jasmine.createSpyObj('EmployeeService', ['getAll', 'getById', 'create', 'update', 'delete']);
    mockEmployeeService.getAll.and.returnValue(of(initialEmployees));

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: EmployeeService, useValue: mockEmployeeService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component and load employees', () => {
    expect(component).toBeTruthy();
    expect(mockEmployeeService.getAll).toHaveBeenCalled();
    expect(component.employees.length).toBe(3);
    expect(component.loading).toBeFalse();
  });

  it('should calculate KPI metrics accurately', () => {
    expect(component.totalStaffCount).toBe(3);
    expect(component.totalPayroll).toBe(225000);
    expect(component.averageSalary).toBe(75000);
    expect(component.topEarner?.name).toBe('Bob Jones');
  });

  it('should filter employees by text query', () => {
    component.searchControl.setValue('alice');
    expect(component.filteredEmployees.length).toBe(1);
    expect(component.filteredEmployees[0].name).toBe('Alice Smith');

    component.searchControl.setValue('company.com');
    expect(component.filteredEmployees.length).toBe(3);

    component.searchControl.setValue('nonexistent');
    expect(component.filteredEmployees.length).toBe(0);
  });

  it('should filter employees by salary tier', () => {
    component.setSalaryFilter('under50k');
    expect(component.filteredEmployees.length).toBe(1);
    expect(component.filteredEmployees[0].name).toBe('Charlie Brown');

    component.setSalaryFilter('50kTo100k');
    expect(component.filteredEmployees.length).toBe(1);
    expect(component.filteredEmployees[0].name).toBe('Alice Smith');

    component.setSalaryFilter('over100k');
    expect(component.filteredEmployees.length).toBe(1);
    expect(component.filteredEmployees[0].name).toBe('Bob Jones');
  });

  it('should sort employees by column and toggle direction', () => {
    component.setSort('salary');
    expect(component.sortBy).toBe('salary');
    expect(component.sortDirection).toBe('asc');
    expect(component.sortedEmployees[0].salary).toBe(45000);

    component.setSort('salary');
    expect(component.sortDirection).toBe('desc');
    expect(component.sortedEmployees[0].salary).toBe(120000);
  });

  it('should handle pagination properly', () => {
    component.pageSize = 2;
    expect(component.totalPages).toBe(2);
    expect(component.paginatedEmployees.length).toBe(2);

    component.goToPage(2);
    expect(component.currentPage).toBe(2);
    expect(component.paginatedEmployees.length).toBe(1);
  });

  it('should open and populate edit modal', () => {
    const emp = initialEmployees[0];
    component.openEdit(emp);

    expect(component.formOpen).toBeTrue();
    expect(component.editingEmployee).toBe(emp);
    expect(component.employeeForm.value.name).toBe(emp.name);
    expect(component.employeeForm.value.email).toBe(emp.email);
    expect(component.employeeForm.value.salary).toBe(emp.salary);
  });

  it('should open and reset create modal', () => {
    component.openCreate();

    expect(component.formOpen).toBeTrue();
    expect(component.editingEmployee).toBeNull();
    expect(component.employeeForm.value.name).toBe('');
    expect(component.employeeForm.value.email).toBe('');
  });

  it('should create employee when valid form submitted', () => {
    const newEmp: Employee = { id: 4, name: 'Dana Scully', email: 'dana@company.com', salary: 90000 };
    mockEmployeeService.create.and.returnValue(of(newEmp));

    component.openCreate();
    component.employeeForm.setValue({
      name: newEmp.name,
      email: newEmp.email,
      salary: newEmp.salary
    });

    component.saveEmployee();

    expect(mockEmployeeService.create).toHaveBeenCalled();
    expect(component.formOpen).toBeFalse();
    expect(component.toasts.length).toBeGreaterThan(0);
  });

  it('should delete employee after confirmation', () => {
    mockEmployeeService.delete.and.returnValue(of(void 0));
    const target = initialEmployees[0];

    component.openDeleteModal(target);
    expect(component.deleteModalOpen).toBeTrue();
    expect(component.employeeToDelete).toBe(target);

    component.executeDelete();
    expect(mockEmployeeService.delete).toHaveBeenCalledWith(target.id!);
    expect(component.deleteModalOpen).toBeFalse();
    expect(component.employeeToDelete).toBeNull();
  });

  it('should generate accurate initials and avatar theme', () => {
    expect(component.getInitials('John Doe')).toBe('JD');
    expect(component.getInitials('Single')).toBe('SI');
    const theme = component.getAvatarTheme('John Doe');
    expect(theme.bg).toBeDefined();
    expect(theme.text).toBeDefined();
  });
});
