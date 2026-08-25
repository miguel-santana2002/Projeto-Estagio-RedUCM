import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { AuthService } from '../services/auth.service';
import { UsecasesService } from '../services/usecases.service';
import { RulesService } from '../services/rules.service';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from "../layout/header/header.component";
import { TitlebannerComponent } from "../layout/titlebanner/titlebanner.component";
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockUsecasesService: jasmine.SpyObj<UsecasesService>;
  let mockRulesService: jasmine.SpyObj<RulesService>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['loggedInInfo']);
    mockUsecasesService = jasmine.createSpyObj('UsecasesService', ['getUseCases']);
    mockRulesService = jasmine.createSpyObj('RulesService', ['getRules', 'getRuleModels']);

    await TestBed.configureTestingModule({
   
      imports: [CommonModule, HomeComponent, HttpClientTestingModule, HeaderComponent, TitlebannerComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsecasesService, useValue: mockUsecasesService },
        { provide: RulesService, useValue: mockRulesService }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize user and counts on ngOnInit', () => {
    const mockUser = { username: 'testuser', companies: [] };
    const mockUseCases = [{ id: 1 }, { id: 2 }];
    const mockRules = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const mockRuleModels = [{ id: 1 }, { id: 2 }];

    mockAuthService.loggedInInfo.and.returnValue(of(mockUser));
    mockUsecasesService.getUseCases.and.returnValue(of(mockUseCases));
    mockRulesService.getRules.and.returnValue(of(mockRules));
    mockRulesService.getRuleModels.and.returnValue(of(mockRuleModels));

    fixture.detectChanges(); // Chama detectChanges para iniciar o ngOnInit

    expect(component.user).toEqual(mockUser);
    expect(component.numberOfUseCases).toBe(mockUseCases.length);
    expect(component.numberOfRules).toBe(mockRules.length);
    expect(component.numberOfRuleModels).toBe(mockRuleModels.length);
  });
});
