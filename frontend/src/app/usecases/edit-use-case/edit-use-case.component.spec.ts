import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditUseCaseComponent } from './edit-use-case.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { TitlebannerComponent } from "../../layout/titlebanner/titlebanner.component";
import { HeaderComponent } from "../../layout/header/header.component";
import { TagInputModule } from 'ngx-chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

describe('EditUseCaseComponent', () => {
  let component: EditUseCaseComponent;
  let fixture: ComponentFixture<EditUseCaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        TitlebannerComponent,
        HeaderComponent,
        TagInputModule,
        MatFormFieldModule,
        MatSelectModule,
        MatIconModule,
        ReactiveFormsModule,
        FormsModule,
        CommonModule
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => '123'
              }
            },
            params: of({ id: 123 })
          }
        },
        {
          provide: Router,
          useClass: class { navigate = jasmine.createSpy("navigate"); }
        }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditUseCaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with use case data', () => {
    const useCase = {
      title: 'Test Title',
      description: 'Test Description',
      mitigation: 'Test Mitigation',
      mitreTechniques: ['Tactic1', 'Tactic2'],
      cncsClass: 'Código Malicioso',
      cncsType: 'Sistema Infetado',
      attackVectors: ['Vector1', 'Vector2'],
      playbook: '/media/playbook.pdf'
    };

    spyOn(component['usecasesService'], 'getUseCaseById').and.returnValue(of(useCase));
    component.ngOnInit();
    expect(component.editUseCaseForm.value.title).toBe(useCase.title);
    expect(component.editUseCaseForm.value.description).toBe(useCase.description);
    expect(component.editUseCaseForm.value.mitigation).toBe(useCase.mitigation);
    expect(component.editUseCaseForm.value.cncsClass).toBe(useCase.cncsClass);
    expect(component.editUseCaseForm.value.cncsType).toBe(useCase.cncsType);
  });

});
