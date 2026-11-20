import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Employee, EmployeeService } from './employee.service';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let httpMock: HttpTestingController;

  const mockEmployees: Employee[] = [
    { id: 1, name: 'Alice Smith', email: 'alice@example.com', salary: 60000 },
    { id: 2, name: 'Bob Jones', email: 'bob@example.com', salary: 80000 }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        EmployeeService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(EmployeeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch all employees via GET /employees', () => {
    service.getAll().subscribe((employees) => {
      expect(employees.length).toBe(2);
      expect(employees).toEqual(mockEmployees);
    });

    const req = httpMock.expectOne('/employees');
    expect(req.request.method).toBe('GET');
    req.flush(mockEmployees);
  });

  it('should fetch single employee by id via GET /employees/{id}', () => {
    service.getById(1).subscribe((employee) => {
      expect(employee).toEqual(mockEmployees[0]);
    });

    const req = httpMock.expectOne('/employees/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockEmployees[0]);
  });

  it('should create employee via POST /employees', () => {
    const newEmp: Employee = { name: 'Charlie Day', email: 'charlie@example.com', salary: 55000 };
    const createdEmp: Employee = { id: 3, ...newEmp };

    service.create(newEmp).subscribe((res) => {
      expect(res).toEqual(createdEmp);
    });

    const req = httpMock.expectOne('/employees');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newEmp);
    req.flush(createdEmp);
  });

  it('should update employee via PUT /employees/{id}', () => {
    const updatedEmp: Employee = { id: 1, name: 'Alice Walker', email: 'alice.w@example.com', salary: 75000 };

    service.update(1, updatedEmp).subscribe((res) => {
      expect(res).toEqual(updatedEmp);
    });

    const req = httpMock.expectOne('/employees/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updatedEmp);
    req.flush(updatedEmp);
  });

  it('should delete employee via DELETE /employees/{id}', () => {
    service.delete(1).subscribe((res) => {
      expect(res).toBeNull();
    });

    const req = httpMock.expectOne('/employees/1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
