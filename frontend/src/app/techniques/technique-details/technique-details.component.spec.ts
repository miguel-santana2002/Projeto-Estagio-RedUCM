import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TechniqueDetailsComponent } from './technique-details.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

describe('TechniqueDetailsComponent', () => {
  let component: TechniqueDetailsComponent;
  let fixture: ComponentFixture<TechniqueDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechniqueDetailsComponent, HttpClientTestingModule, RouterTestingModule]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TechniqueDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
