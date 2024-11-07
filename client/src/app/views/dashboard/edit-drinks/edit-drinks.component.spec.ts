import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditDrinksComponent } from './edit-drinks.component';

describe('EditDrinksComponent', () => {
  let component: EditDrinksComponent;
  let fixture: ComponentFixture<EditDrinksComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ EditDrinksComponent ]
    });
    fixture = TestBed.createComponent(EditDrinksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
