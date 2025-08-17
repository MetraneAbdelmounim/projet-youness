import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminModemsComponent } from './admin-modems.component';

describe('AdminModemsComponent', () => {
  let component: AdminModemsComponent;
  let fixture: ComponentFixture<AdminModemsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminModemsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminModemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
