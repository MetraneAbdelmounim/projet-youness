import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanneausComponent } from './panneaus.component';

describe('PanneausComponent', () => {
  let component: PanneausComponent;
  let fixture: ComponentFixture<PanneausComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PanneausComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PanneausComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
