import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ManageUseCasesComponent } from './manage-use-cases.component';
import { AuthService } from '../../services/auth.service';
import { UsecasesService } from '../../services/usecases.service';
import { RouterTestingModule } from '@angular/router/testing';

describe('ManageUseCasesComponent', () => {
  let component: ManageUseCasesComponent;
  let fixture: ComponentFixture<ManageUseCasesComponent>;
  let authServiceMock: any;
  let usecasesServiceMock: any;

  beforeEach(async () => {
    authServiceMock = {
      loggedInInfo: jasmine.createSpy('loggedInInfo').and.returnValue(of({ companies: [] }))
    };

    usecasesServiceMock = {
      getUseCases: jasmine.createSpy('getUseCases').and.returnValue(of([])),
      deleteUseCase: jasmine.createSpy('deleteUseCase').and.returnValue(of({}))
    };

    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        ManageUseCasesComponent,
        RouterTestingModule
      ],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: UsecasesService, useValue: usecasesServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ManageUseCasesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
