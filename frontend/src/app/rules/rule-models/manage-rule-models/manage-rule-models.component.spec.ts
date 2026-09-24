import { ComponentFixture, TestBed, tick, fakeAsync } from '@angular/core/testing';
import { ManageRuleModelsComponent } from './manage-rule-models.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { of } from 'rxjs';

describe('ManageRuleModelsComponent', () => {
  let component: ManageRuleModelsComponent;
  let fixture: ComponentFixture<ManageRuleModelsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        FormsModule,
        ReactiveFormsModule,
        CommonModule,
        RouterTestingModule,
        MatFormFieldModule,
        MatSelectModule,
        MatIconModule
      ],
      declarations: [],
      providers: [DatePipe]
    }).compileComponents();

    fixture = TestBed.createComponent(ManageRuleModelsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize ruleModels with data from rulesService', fakeAsync(() => {
    const mockRuleModels = [
      { id: 1, title: 'Rule Model 1', syntax: 'Sigma Rule', type: 'SIEM', logsources: ['Logsource A', 'Logsource B'] },
      { id: 2, title: 'Rule Model 2', syntax: 'Splunk Rule', type: 'SOAR', logsources: ['Logsource C', 'Logsource D'] }
    ];
    spyOn((component as any).rulesService, 'getRuleModels').and.returnValue(of(mockRuleModels));

    component.ngOnInit();
    tick();
    fixture.detectChanges();

    expect(component.ruleModels).toEqual(mockRuleModels);
  }));

  it('should filter ruleModels based on nameSearch', () => {
    const mockRuleModels = [
      { id: 1, title: 'Rule Model 1', syntax: 'Sigma Rule', type: 'SIEM', logsources: ['Logsource A', 'Logsource B'] },
      { id: 2, title: 'Rule Model 2', syntax: 'Splunk Rule', type: 'SOAR', logsources: ['Logsource C', 'Logsource D'] }
    ];
    component.ruleModels = mockRuleModels;
    component.nameSearch = 'Rule Model 1';

    const filteredModels = component.filteredRuleModels;

    expect(filteredModels.length).toBe(1);
    expect(filteredModels[0].title).toBe('Rule Model 1');
  });

  it('should update selectDelete when updateSelectDelete is called', () => {
    const mockEvent = new Event('click');
    component.updateSelectDelete(mockEvent, 1);

    expect(component.selectDelete).toBe(1);
  });

  it('should sort ruleModels based on column', () => {
    const mockRuleModels = [
      { id: 1, title: 'Rule Model B', syntax: 'Sigma Rule', type: 'SIEM', logsources: ['Logsource A', 'Logsource B'] },
      { id: 2, title: 'Rule Model A', syntax: 'Splunk Rule', type: 'SOAR', logsources: ['Logsource C', 'Logsource D'] }
    ];
    component.ruleModels = mockRuleModels;

    component.sortTable('title');

    expect(component.ruleModels[0].title).toBe('Rule Model A');
    expect(component.ruleModels[1].title).toBe('Rule Model B');
  });

  it('should clear selectedSintaxes, selectedTypes, selectedLogSources and nameSearch on clearFilters', () => {
    component.selectedSintaxes = ['Sigma Rule'];
    component.selectedTypes = ['SIEM'];
    component.selectedLogSources = ['Logsource A'];
    component.nameSearch = 'Rule';

    component.clearFilters();

    expect(component.selectedSintaxes.length).toBe(0);
    expect(component.selectedTypes.length).toBe(0);
    expect(component.selectedLogSources.length).toBe(0);
    expect(component.nameSearch).toBe('');
  });

  // Test other functionalities such as deleteRuleModel, updateSelectedTypes, etc.
});

