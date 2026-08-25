import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyInstanceRulesComponent } from './my-instance-rules.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

describe('MyInstanceRulesComponent', () => {
  let component: MyInstanceRulesComponent;
  let fixture: ComponentFixture<MyInstanceRulesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyInstanceRulesComponent, HttpClientTestingModule, RouterTestingModule]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MyInstanceRulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
