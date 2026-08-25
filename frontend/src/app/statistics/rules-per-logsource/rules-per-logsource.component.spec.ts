import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RulesPerLogsourceComponent } from './rules-per-logsource.component';

describe('RulesPerLogsourceComponent', () => {
  let component: RulesPerLogsourceComponent;
  let fixture: ComponentFixture<RulesPerLogsourceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RulesPerLogsourceComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RulesPerLogsourceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
