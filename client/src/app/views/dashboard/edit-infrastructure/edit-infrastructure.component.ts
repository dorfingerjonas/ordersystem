import { Component } from '@angular/core';
import { Category, InfrastructureConfig, Printer } from '../../../models/models';
import { DataService } from '../../../services/data.service';
import { HeaderService } from '../../../services/header.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-edit-infrastructure',
  templateUrl: './edit-infrastructure.component.html',
  styleUrls: [ './edit-infrastructure.component.scss' ]
})
export class EditInfrastructureComponent {

  public categories: Category[];
  public printers: Printer[];
  public infrastructure: InfrastructureConfig[];
  public loaded: boolean;

  constructor(private readonly data: DataService,
              private readonly header: HeaderService,
              private readonly dialog: MatDialog,
              private readonly snackBar: MatSnackBar) {
    this.categories = [];
    this.printers = [];
    this.infrastructure = [];
    this.loaded = false;

    this.data.categories.subscribe(categories => {
      this.categories = categories.sort((a, b) => a.ordering - b.ordering);
      this.loaded = true;
    });

    this.data.printers.subscribe(printers => {
      this.printers = printers;
      this.loaded = true;
    });

    this.data.infrastructure.subscribe(infrastructure => {
      if (this.categories.length === 0) {
        setTimeout(() => this.data.fetchData(), 1000);
        return;
      }

      this.infrastructure = infrastructure.map(i => {
        if (!isNaN(i.printer as never)) {
          i.printer = this.printers.find(printer => printer.id === i.printer as never) as Printer;
        }

        return {
          ...i,
          categories: i.categories
            .map(c => this.categories.find(cat => c === cat.id))
            .filter(c => c !== undefined)
        } as InfrastructureConfig;
      });
    });

    this.data.fetchData();

    this.header.text = 'Infrastruktur bearbeiten';
  }

  public getAvailablePrinters(): Printer[] {
    return this.printers.filter(p => !this.infrastructure.find(i => i.printer.id === p.id));
  }

  public addInfrastructure(printer: Printer): void {
    this.infrastructure.push({
      id: NaN,
      categories: [],
      printer: printer,
      lastPing: Date.now()
    });
  }

  public saveInfrastructureConfig(config: InfrastructureConfig): void {
    if (isNaN(config.id)) {
      delete (config as any).id;
    }

    this.data.upsert('infrastructure', {
      ...config,
      categories: config.categories.map(c => c.id),
      printer: config.printer.id
    }).then(res => {
      console.log(res);
      this.snackBar.open('Infrastruktur gespeichert', 'X', { duration: 2500 });
    });
  }

  public deleteInfrastructureConfig(config: InfrastructureConfig): void {
    if (isNaN(config.id)) {
      console.log('Infrastructure config not saved yet, removing from local list');
      this.infrastructure = this.infrastructure.filter(c => !isNaN(c.id));
      this.snackBar.open('Infrastruktur gelöscht', 'X', { duration: 2500 });
      return;
    }

    this.data.delete('infrastructure', config.id).then(res => {
      console.log(res);
      this.snackBar.open('Infrastruktur gelöscht', 'X', { duration: 2500 });
    });
  }
}
