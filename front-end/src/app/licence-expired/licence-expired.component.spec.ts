import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LicenceExpiredComponent } from './licence-expired.component';

describe('LicenceExpiredComponent', () => {
  let component: LicenceExpiredComponent;
  let fixture: ComponentFixture<LicenceExpiredComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LicenceExpiredComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LicenceExpiredComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
