import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReadUseCasesComponent } from './read-use-cases.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ReadUseCasesComponent', () => {
  let component: ReadUseCasesComponent;
  let fixture: ComponentFixture<ReadUseCasesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReadUseCasesComponent, HttpClientTestingModule]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReadUseCasesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
