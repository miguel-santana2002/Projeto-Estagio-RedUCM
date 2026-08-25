import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateUseCaseComponent } from './create-use-case.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { MitreService } from '../../services/mitre.service';
import { UsecasesService } from '../../services/usecases.service';
import { Router } from '@angular/router';

describe('CreateUseCaseComponent', () => {
  let component: CreateUseCaseComponent;
  let fixture: ComponentFixture<CreateUseCaseComponent>;
  let mitreService: MitreService;
  let usecasesService: UsecasesService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        ReactiveFormsModule,
        FormsModule,
        RouterTestingModule
      ],
      providers: [
        {
          provide: MitreService,
          useValue: {}
        },
        {
          provide: UsecasesService,
          useValue: {
            createUseCase: jasmine.createSpy('createUseCase').and.returnValue(of({}))
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateUseCaseComponent);
    component = fixture.componentInstance;
    mitreService = TestBed.inject(MitreService);
    usecasesService = TestBed.inject(UsecasesService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    const form = component.createUseCaseForm;
    expect(form).toBeDefined();
    expect(form.get('title')?.value).toBe('');
    expect(form.get('description')?.value).toBe('');
    expect(form.get('mitigation')?.value).toBe('');
    expect(form.get('playbook')?.value).toBe('');
    expect(form.get('mitreTechniques')?.value).toEqual([]);
    expect(form.get('cncsClass')?.value).toBe('');
    expect(form.get('cncsType')?.value).toBe('');
    expect(form.get('attackVectors')?.value).toEqual([]);
  });


  it('should update CNCS values based on selected category', () => {
    component.createUseCaseForm.get('cncsClass')?.setValue('Código Malicioso');
    component.updateCNCSValues();
    expect(component.selectedCategoryValues).toEqual(['Sistema Infetado', 'Distribuição de Malware', 'Servidor C2', 'Configuração de Malware']);
  });


  it('should handle file selection', () => {
    const file = new File([''], 'test-file.txt');
    const event = {
      target: {
        files: [file]
      }
    } as unknown as Event;

    component.onFileSelected(event);
    expect(component.selectedFile).toBe(file);
  });
});
