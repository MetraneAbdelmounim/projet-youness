import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReloadSiteComponent } from './reload-site.component';

describe('ReloadSiteComponent', () => {
  let component: ReloadSiteComponent;
  let fixture: ComponentFixture<ReloadSiteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReloadSiteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReloadSiteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
