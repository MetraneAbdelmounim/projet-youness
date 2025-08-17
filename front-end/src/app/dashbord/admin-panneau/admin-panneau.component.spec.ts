import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPanneauComponent } from './admin-panneau.component';

describe('AdminPanneauComponent', () => {
  let component: AdminPanneauComponent;
  let fixture: ComponentFixture<AdminPanneauComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminPanneauComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminPanneauComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
