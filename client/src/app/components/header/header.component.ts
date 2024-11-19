import { Component, OnInit } from '@angular/core';
import { HeaderService } from '../../services/header.service';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MenuComponent } from '../menu/menu.component';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: [ './header.component.scss' ]
})
export class HeaderComponent implements OnInit {

  public text: string;

  constructor(private readonly header: HeaderService,
              private readonly bottomSheet: MatBottomSheet) {
    this.text = this.header.text;
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.header.getTextAsObservable().subscribe(text => {
        this.text = text;
      });
    });
  }

  public openBottomSheet(): void {
    this.bottomSheet.open(MenuComponent);
  }
}
