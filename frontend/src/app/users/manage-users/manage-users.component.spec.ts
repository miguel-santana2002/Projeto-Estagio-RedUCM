import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManageUsersComponent } from './manage-users.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from '../../services/auth.service';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';
import { HeaderComponent } from '../../layout/header/header.component';
import { TitlebannerComponent } from '../../layout/titlebanner/titlebanner.component';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';

describe('ManageUsersComponent', () => {
  let component: ManageUsersComponent;
  let fixture: ComponentFixture<ManageUsersComponent>;
  let authService: AuthService;

  const mockUsers = [
    {
      id: 1,
      name: 'Alice',
      email: 'alice@example.com',
      companies: ['Company1'],
      role: 'Administrador',
    },
    {
      id: 2,
      name: 'Bob',
      email: 'bob@example.com',
      companies: ['Company2'],
      role: 'Operador',
    },
    {
      id: 3,
      name: 'Charlie',
      email: 'charlie@example.com',
      companies: [],
      role: 'Administrador',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        FormsModule,
        CommonModule,
        RouterModule,
      ],
      providers: [
        DatePipe,
        {
          provide: AuthService,
          useValue: {
            getUsers: jasmine
              .createSpy('getUsers')
              .and.returnValue(of(mockUsers)),
            deleteUser: jasmine.createSpy('deleteUser').and.returnValue(of({})),
            loggedInInfo: jasmine
              .createSpy('loggedInInfo')
              .and.returnValue(of({ userName: 'Test User' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageUsersComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load users on init', () => {
    expect(component.users.length).toBe(3);
    expect(component.users[0].name).toBe('Alice');
  });

  it('should filter users by email', () => {
    component.nameSearch = 'bob';
    const filteredUsers = component.filteredUsers;
    expect(filteredUsers.length).toBe(1);
    expect(filteredUsers[0].email).toBe('bob@example.com');
  });

  it('should delete user', () => {
    component.updateSelectDelete(2);
    component.deleteUser();
    expect(authService.deleteUser).toHaveBeenCalledWith(2);
  });

  it('should update selected user for deletion', () => {
    component.updateSelectDelete(2);
    expect(component.selectDelete).toBe(2);
  });
});
