import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientMonitor } from './patient-monitor';

describe('PatientMonitor', () => {
  let component: PatientMonitor;
  let fixture: ComponentFixture<PatientMonitor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientMonitor],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientMonitor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
