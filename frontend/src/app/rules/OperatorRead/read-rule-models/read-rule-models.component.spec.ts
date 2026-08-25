import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReadRuleModelsComponent } from './read-rule-models.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ReadRuleModelsComponent', () => {
  let component: ReadRuleModelsComponent;
  let fixture: ComponentFixture<ReadRuleModelsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReadRuleModelsComponent, HttpClientTestingModule]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReadRuleModelsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
