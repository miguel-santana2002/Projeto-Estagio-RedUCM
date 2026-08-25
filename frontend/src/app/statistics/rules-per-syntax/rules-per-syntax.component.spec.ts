import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RulesPerSyntaxComponent } from './rules-per-syntax.component';

describe('RulesPerSyntaxComponent', () => {
  let component: RulesPerSyntaxComponent;
  let fixture: ComponentFixture<RulesPerSyntaxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RulesPerSyntaxComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RulesPerSyntaxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
