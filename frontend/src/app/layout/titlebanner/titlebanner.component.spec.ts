import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TitlebannerComponent } from './titlebanner.component';
import { Component } from '@angular/core';

describe('TitlebannerComponent', () => {
  let component: TitlebannerComponent;
  let fixture: ComponentFixture<TitlebannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TitlebannerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TitlebannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display default title', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('h1').textContent).toContain('Loading');
  });

  it('should display input title', () => {
    component.title = 'Test Title';
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('h1').textContent).toContain('Test Title');
  });

  it('should display input image', () => {
    component.image = 'test-image.jpg';
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('img').src).toContain('test-image.jpg');
  });

  it('should have empty image src by default', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('img').src).toContain('');
  });
});
