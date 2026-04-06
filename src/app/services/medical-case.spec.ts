import { TestBed } from '@angular/core/testing';

import { MedicalCase } from './medical-case';

describe('MedicalCase', () => {
  let service: MedicalCase;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MedicalCase);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
