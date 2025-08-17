import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModemsComponent } from './modems.component';

describe('ModemsComponent', () => {
  let component: ModemsComponent;
  let fixture: ComponentFixture<ModemsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ModemsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
