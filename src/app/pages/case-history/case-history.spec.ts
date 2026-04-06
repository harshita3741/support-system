import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CaseHistory } from './case-history';

describe('CaseHistory', () => {
  let component: CaseHistory;
  let fixture: ComponentFixture<CaseHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaseHistory],
    }).compileComponents();

    fixture = TestBed.createComponent(CaseHistory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
