import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RefreshSiteComponent } from './refresh-site.component';

describe('RefreshSiteComponent', () => {
  let component: RefreshSiteComponent;
  let fixture: ComponentFixture<RefreshSiteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RefreshSiteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RefreshSiteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
