import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateRuleModelComponent } from './create-rule-model.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('CreateRuleModelComponent', () => {
  let component: CreateRuleModelComponent;
  let fixture: ComponentFixture<CreateRuleModelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, BrowserAnimationsModule],
    }).compileComponents();
    
    fixture = TestBed.createComponent(CreateRuleModelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
