import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RulesPerTypeComponent } from './rules-per-type.component';

describe('RulesPerTypeComponent', () => {
  let component: RulesPerTypeComponent;
  let fixture: ComponentFixture<RulesPerTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RulesPerTypeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RulesPerTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
