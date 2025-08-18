import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TotalComponantComponent } from './total-componant.component';

describe('TotalComponantComponent', () => {
  let component: TotalComponantComponent;
  let fixture: ComponentFixture<TotalComponantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TotalComponantComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TotalComponantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
