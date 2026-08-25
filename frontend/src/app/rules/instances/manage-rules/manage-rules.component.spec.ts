import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManageRulesComponent } from './manage-rules.component'; // Certifique-se de que o caminho está correto
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ManageRulesComponent', () => {
  let component: ManageRulesComponent;
  let fixture: ComponentFixture<ManageRulesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        ManageRulesComponent 
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: 123 }) 
          }
        }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageRulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
