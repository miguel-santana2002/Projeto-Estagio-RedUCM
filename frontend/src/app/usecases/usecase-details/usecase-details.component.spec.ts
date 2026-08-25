import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsecaseDetailsComponent } from './usecase-details.component';
import { HeaderComponent } from '../../layout/header/header.component';
import { TitlebannerComponent } from '../../layout/titlebanner/titlebanner.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UsecasesService } from '../../services/usecases.service';
import { AuthService } from '../../services/auth.service';
import { RulesService } from '../../services/rules.service';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('UsecaseDetailsComponent', () => {
  let component: UsecaseDetailsComponent;
  let fixture: ComponentFixture<UsecaseDetailsComponent>;

  beforeEach(async () => {
    const mockUsecasesService = {
      getUseCaseById: jasmine.createSpy('getUseCaseById').and.returnValue(of({ id: 1, title: 'Test Use Case', phaseTasks: [] })),
      updatePhaseTasks: jasmine.createSpy('updatePhaseTasks').and.returnValue(of({}))
    };

    const mockAuthService = {
      loggedInInfo: jasmine.createSpy('loggedInInfo').and.returnValue(of({ email: 'test@example.com', companies: [] }))
    };

    const mockRulesService = {
      getRuleModelsByUseCase: jasmine.createSpy('getRuleModelsByUseCase').and.returnValue(of([]))
    };

    const mockActivatedRoute = {
      snapshot: { params: { id: '1' } }
    };

    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
      providers: [
        DecimalPipe,
        { provide: UsecasesService, useValue: mockUsecasesService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: RulesService, useValue: mockRulesService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UsecaseDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the createTaskForm', () => {
    expect(component.createTaskForm).toBeTruthy();
    expect(component.createTaskForm.get('title')).toBeTruthy();
    expect(component.createTaskForm.get('description')).toBeTruthy();
  });

  it('should open the task modal', () => {
    const modalSpy = spyOn(component.modalFlowbite, 'show');
    component.openTaskModal('Preparation');
    expect(modalSpy).toHaveBeenCalled();
    expect(component.selectedPhase).toBe('Preparation');
  });

  it('should close the task modal', () => {
    const modalSpy = spyOn(component.modalFlowbite, 'hide');
    const resetSpy = spyOn(component.createTaskForm, 'reset');
    component.closeTaskModal();
    expect(modalSpy).toHaveBeenCalled();
    expect(resetSpy).toHaveBeenCalled();
  });

});
