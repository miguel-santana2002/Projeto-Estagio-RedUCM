import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RulesService } from '../../services/rules.service';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ManageLogsourcesComponent } from '../../rules/manage-logsources/manage-logsources.component';

describe('ManageLogsourcesComponent', () => {
  let component: ManageLogsourcesComponent;
  let fixture: ComponentFixture<ManageLogsourcesComponent>;
  let rulesService: RulesService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RulesService]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ManageLogsourcesComponent);
    component = fixture.componentInstance;
    rulesService = TestBed.inject(RulesService);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load logsources on init', () => {
    const logsourcesMock = [{ id: 1, name: 'Test Logsource' }];
    spyOn(rulesService, 'getRegisteredLogSources').and.returnValue(of(logsourcesMock));

    component.ngOnInit();

    expect(component.logsources).toEqual(logsourcesMock);
  });

  it('should create a new logsource', () => {
    const newLogsourceMock = { id: 2, name: 'New Logsource' };
    const logsourcesMock = [{ id: 1, name: 'Test Logsource' }, newLogsourceMock];

    spyOn(rulesService, 'createRegisteredLogSource').and.returnValue(of(newLogsourceMock));
    spyOn(rulesService, 'getRegisteredLogSources').and.returnValue(of(logsourcesMock));

    component.newLog = { name: 'New Logsource', description: 'Description' };
    component.createLogSource();

    expect(rulesService.createRegisteredLogSource).toHaveBeenCalledWith(component.newLog);
    expect(component.logsources).toEqual(logsourcesMock);
    expect(component.errorMessage).toBeNull();
  });

  it('should handle error on create logsource', () => {
    const errorResponse = new HttpErrorResponse({
      error: { error: 'Bad Request' },
      status: 400
    });

    spyOn(rulesService, 'createRegisteredLogSource').and.returnValue(throwError(() => errorResponse));

    component.newLog = { name: 'Invalid Logsource', description: 'Description' };
    component.createLogSource();

    expect(rulesService.createRegisteredLogSource).toHaveBeenCalledWith(component.newLog);
    expect(component.errorMessage).toBe('Bad Request');
  });

  it('should delete a logsource by id', () => {
    const logsourcesMock = [{ id: 1, name: 'Test Logsource' }];
    const updatedLogsourcesMock = [{ id: 1, name: 'Test Logsource' }];

    spyOn(rulesService, 'deleteLogSourceById').and.returnValue(of({}));
    spyOn(rulesService, 'getRegisteredLogSources').and.returnValue(of(updatedLogsourcesMock));

    component.logsources = logsourcesMock;
    component.deleteLogSourceById(1);

    expect(rulesService.deleteLogSourceById).toHaveBeenCalledWith(1);
    expect(component.logsources).toEqual(updatedLogsourcesMock);
  });
});
