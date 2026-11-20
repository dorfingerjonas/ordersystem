import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AutoFocusModule } from 'primeng/autofocus';
import { ConfirmationService } from 'primeng/api';
import { DataService } from '../../../services/data.service';
import { NotifyService } from '../../../services/notify.service';
import { Area, Table } from '../../../models/models';
import { naturalCompare } from '../../../utils/format';

@Component({
  selector: 'app-admin-tables',
  imports: [ FormsModule, RouterLink, DialogModule, ButtonModule, InputTextModule, AutoFocusModule ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-tables.page.html',
  styles: `
    .area { display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
    .area-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .area-head .icon-btn { width: 40px; height: 40px; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
    .t {
      height: 64px;
      border-radius: var(--os-radius);
      background: var(--os-card);
      border: 1.5px solid var(--os-border-strong);
      font-size: 22px;
      font-weight: 800;
      color: var(--os-text);
      cursor: pointer;
    }
    .t:active { background: var(--os-primary-soft); }
    .t.add { border-style: dashed; color: var(--os-muted); font-size: 18px; background: transparent; }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .move { display: flex; gap: 8px; }
    .move .btn-ghost { flex: 1 1 0; }
    .hint { font-size: 13px; color: var(--os-muted); }
    .warn { color: var(--os-danger); font-size: 13px; font-weight: 600; }
  `
})
export class AdminTablesPage {

  protected readonly data = inject(DataService);
  private readonly notify = inject(NotifyService);
  private readonly confirm = inject(ConfirmationService);

  protected readonly saving = signal(false);

  // ----- table dialog -----
  protected readonly tableDialog = signal(false);
  protected readonly editingTable = signal<Table | null>(null);
  protected readonly tableNr = signal('');
  protected readonly tableArea = signal<number | null>(null);

  protected readonly duplicateNr = computed(() => {
    const nr = this.tableNr().trim().toLowerCase();
    return !!nr && this.data.tables().some(t => t.nr.toLowerCase() === nr && t.id !== this.editingTable()?.id);
  });

  // ----- area dialog -----
  protected readonly areaDialog = signal(false);
  protected readonly editingArea = signal<Area | null>(null);
  protected readonly areaName = signal('');

  // ---------- tables ----------

  protected openTable(table: Table | null, area: number | null): void {
    this.editingTable.set(table);
    this.tableArea.set(table ? table.area : area);
    this.tableNr.set(table ? table.nr : this.suggestNr(area));
    this.tableDialog.set(true);
  }

  /** next free number in the area: "13" -> "14", "O4" -> "O5" */
  private suggestNr(area: number | null): string {
    const nrs = this.data.tables().filter(t => t.area === area).map(t => t.nr).sort(naturalCompare);
    const last = nrs[nrs.length - 1];
    const match = last?.match(/^(.*?)(\d+)$/);

    if (!match) return '';

    let n = Number(match[2]) + 1;
    let candidate = match[1] + n;

    while (this.data.tables().some(t => t.nr.toLowerCase() === candidate.toLowerCase())) {
      candidate = match[1] + (++n);
    }

    return candidate;
  }

  protected async saveTable(): Promise<void> {
    const nr = this.tableNr().trim();
    if (!nr || this.saving() || this.duplicateNr()) return;

    this.saving.set(true);

    try {
      const editing = this.editingTable();

      if (editing) {
        await this.data.update(this.data.tableStore, editing.id, { nr, area: this.tableArea() });
        this.notify.success(`Tisch ${ nr } gespeichert`);
      } else {
        await this.data.insert(this.data.tableStore, { nr, area: this.tableArea() });
        this.notify.success(`Tisch ${ nr } angelegt`);
      }

      this.tableDialog.set(false);
    } catch (e) {
      this.notify.error('Tisch konnte nicht gespeichert werden', e);
    } finally {
      this.saving.set(false);
    }
  }

  protected async moveTable(delta: number): Promise<void> {
    const table = this.editingTable();
    if (!table) return;

    const list = this.data.tables().filter(t => t.area === table.area);
    const i = list.findIndex(t => t.id === table.id);
    const j = i + delta;

    if (i === -1 || j < 0 || j >= list.length) return;

    [ list[i], list[j] ] = [ list[j], list[i] ];

    try {
      await this.data.saveOrdering(this.data.tableStore, list);
    } catch (e) {
      this.notify.error('Reihenfolge konnte nicht gespeichert werden', e);
    }
  }

  protected tableIndex(): { index: number; count: number } {
    const table = this.editingTable();
    const list = this.data.tables().filter(t => t.area === table?.area);
    return { index: list.findIndex(t => t.id === table?.id), count: list.length };
  }

  protected deleteTable(): void {
    const table = this.editingTable();
    if (!table) return;

    const open = (this.data.openCentsByTable().get(table.id) ?? 0) > 0;

    this.confirm.confirm({
      header: `Tisch ${ table.nr } löschen?`,
      message: (open ? 'Achtung: Der Tisch hat noch offene Beträge! ' : '')
        + 'Alle Bestellungen und Verkäufe dieses Tisches werden ebenfalls gelöscht.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Endgültig löschen',
      rejectLabel: 'Abbrechen',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary' },
      accept: async () => {
        try {
          await this.data.remove(this.data.tableStore, table.id);
          this.tableDialog.set(false);
          this.notify.success(`Tisch ${ table.nr } gelöscht`);
        } catch (e) {
          this.notify.error('Tisch konnte nicht gelöscht werden', e);
        }
      }
    });
  }

  // ---------- areas ----------

  protected openArea(area: Area | null): void {
    this.editingArea.set(area);
    this.areaName.set(area?.name ?? '');
    this.areaDialog.set(true);
  }

  protected async saveArea(): Promise<void> {
    const name = this.areaName().trim();
    if (!name || this.saving()) return;

    this.saving.set(true);

    try {
      const editing = this.editingArea();

      if (editing) {
        await this.data.update(this.data.areaStore, editing.id, { name });
        this.notify.success(`Bereich „${ name }“ gespeichert`);
      } else {
        await this.data.insert(this.data.areaStore, { name });
        this.notify.success(`Bereich „${ name }“ angelegt`, 'Jetzt mit + Tische hinzufügen.');
      }

      this.areaDialog.set(false);
    } catch (e) {
      this.notify.error('Bereich konnte nicht gespeichert werden', e);
    } finally {
      this.saving.set(false);
    }
  }

  protected async moveArea(delta: number): Promise<void> {
    const area = this.editingArea();
    if (!area) return;

    const list = [ ...this.data.areas() ];
    const i = list.findIndex(a => a.id === area.id);
    const j = i + delta;

    if (i === -1 || j < 0 || j >= list.length) return;

    [ list[i], list[j] ] = [ list[j], list[i] ];

    try {
      await this.data.saveOrdering(this.data.areaStore, list);
    } catch (e) {
      this.notify.error('Reihenfolge konnte nicht gespeichert werden', e);
    }
  }

  protected areaIndex(): { index: number; count: number } {
    const list = this.data.areas();
    return { index: list.findIndex(a => a.id === this.editingArea()?.id), count: list.length };
  }

  protected deleteArea(): void {
    const area = this.editingArea();
    if (!area) return;

    const count = this.data.tables().filter(t => t.area === area.id).length;

    this.confirm.confirm({
      header: `Bereich „${ area.name }“ löschen?`,
      message: count > 0
        ? `Die ${ count } Tische bleiben erhalten und landen unter „Weitere Tische“.`
        : 'Der Bereich ist leer.',
      icon: 'pi pi-trash',
      acceptLabel: 'Löschen',
      rejectLabel: 'Abbrechen',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary' },
      accept: async () => {
        try {
          await this.data.remove(this.data.areaStore, area.id);
          // FK sets tables.area to null – mirror locally until realtime arrives
          this.data.tableStore.upsertLocal(...this.data.tables().filter(t => t.area === area.id).map(t => ({ ...t, area: null })));
          this.areaDialog.set(false);
          this.notify.success(`Bereich „${ area.name }“ gelöscht`);
        } catch (e) {
          this.notify.error('Bereich konnte nicht gelöscht werden', e);
        }
      }
    });
  }
}
