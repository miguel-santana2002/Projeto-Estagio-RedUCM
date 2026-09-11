import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditClientComponent } from './edit-client.component';
import { AuthService } from '../../services/auth.service';
import { RulesService } from '../../services/rules.service';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TagInputModule } from 'ngx-chips';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

describe('EditClientComponent', () => {
  let component: EditClientComponent;
  let fixture: ComponentFixture<EditClientComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let rulesServiceSpy: jasmine.SpyObj<RulesService>;
  let router: Router;

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', [
      'getClientById',
      'updateCompany',
    ]);
    const rulesSpy = jasmine.createSpyObj('RulesService', [
      'getRegisteredLogSources',
    ]);

    await TestBed.configureTestingModule({
      declarations: [EditClientComponent],
      imports: [
        ReactiveFormsModule,
        FormsModule,
        CommonModule,
        RouterTestingModule,
        TagInputModule,
        BrowserAnimationsModule,
      ],
      providers: [
        FormBuilder,
        { provide: AuthService, useValue: authSpy },
        { provide: RulesService, useValue: rulesSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => '10',
              },
            },
          },
        },
      ],
    }).compileComponents();

    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    rulesServiceSpy = TestBed.inject(
      RulesService,
    ) as jasmine.SpyObj<RulesService>;
    router = TestBed.inject(Router);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditClientComponent);
    component = fixture.componentInstance;

    authServiceSpy.getClientById.and.returnValue(
      of({
        pk: 10,
        name: 'Cliente Teste',
        logsources: ['Syslog', 'Windows Event Log'],
      }),
    );
    rulesServiceSpy.getRegisteredLogSources.and.returnValue(
      of(['Syslog', 'Windows Event Log']),
    );

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should populate form on init with client data', () => {
    expect(component.clientId).toBe(10);
    expect(authServiceSpy.getClientById).toHaveBeenCalledWith(10);
    expect(component.editClientForm.value.name).toBe('Cliente Teste');
  });

  it('should redirect to /manage-clients on cancel', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.cancel();
    expect(navigateSpy).toHaveBeenCalledWith(['/manage-clients']);
  });
});
