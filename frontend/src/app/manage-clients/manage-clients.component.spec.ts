import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ManageClientsComponent } from './manage-clients.component';
import { AuthService } from '../services/auth.service';
import { RulesService } from '../services/rules.service';
import { of } from 'rxjs';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';
import { TitlebannerComponent } from '../layout/titlebanner/titlebanner.component';
import { HeaderComponent } from '../layout/header/header.component';
import { TagInputModule } from 'ngx-chips';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('ManageClientsComponent', () => {
  let component: ManageClientsComponent;
  let fixture: ComponentFixture<ManageClientsComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let rulesServiceSpy: jasmine.SpyObj<RulesService>;

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', ['getClients', 'deleteCompany', 'createClient', 'loggedInInfo']);
    const rulesSpy = jasmine.createSpyObj('RulesService', ['getRegisteredLogSources']);

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, FormsModule, CommonModule, RouterTestingModule, TagInputModule, BrowserAnimationsModule],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: RulesService, useValue: rulesSpy }
      ]
    }).compileComponents();

    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    rulesServiceSpy = TestBed.inject(RulesService) as jasmine.SpyObj<RulesService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageClientsComponent);
    component = fixture.componentInstance;

    authServiceSpy.getClients.and.returnValue(of([]));
    authServiceSpy.loggedInInfo.and.returnValue(of({}));  // Mock the loggedInInfo method
    rulesServiceSpy.getRegisteredLogSources.and.returnValue(of([]));

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize clients on init', () => {
    const mockClients = [{ id: 1, name: 'Client 1' }];
    authServiceSpy.getClients.and.returnValue(of(mockClients));
    
    component.ngOnInit();

    expect(authServiceSpy.getClients).toHaveBeenCalled();
    expect(component.clients).toEqual(mockClients);
  });

  it('should delete client', () => {
    const mockResponse = {};
    authServiceSpy.deleteCompany.and.returnValue(of(mockResponse));
    authServiceSpy.getClients.and.returnValue(of([]));

    component.selectDelete = 1;
    component.deleteClient();

    expect(authServiceSpy.deleteCompany).toHaveBeenCalledWith(1);
    expect(authServiceSpy.getClients).toHaveBeenCalled();
  });

});
