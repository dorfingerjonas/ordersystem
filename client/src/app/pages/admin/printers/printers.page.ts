import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ConfirmationService } from 'primeng/api';
import { DataService, PrinterInfo } from '../../../services/data.service';
import { NotifyService } from '../../../services/notify.service';
import { Device, DeviceType, PrinterType } from '../../../models/models';

@Component({
  selector: 'app-printers',
  imports: [ FormsModule, RouterLink, DatePipe, DialogModule, ButtonModule, InputTextModule, MessageModule ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './printers.page.html',
  styles: `
    .printer { flex-shrink: 0; }
    .p-head { padding: 14px 12px 12px 16px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--os-divider); }
    .p-head .icon-btn { width: 40px; height: 40px; }
    .p-body { padding: 12px 16px 14px; display: flex; flex-direction: column; gap: 10px; }
    .p-label { font-size: 13px; font-weight: 600; color: var(--os-text-2); }
    .p-actions { display: flex; gap: 8px; padding: 0 16px 16px; }
    .p-actions .btn-ghost { flex: 1 1 0; }
    .online-text { color: #187245; font-weight: 600; }
    .offline-text { color: var(--os-danger); font-weight: 600; }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    fieldset { border: none; padding: 0; margin: 0; }
    legend { margin-bottom: 6px; }
    .hint { font-size: 13px; color: var(--os-muted); }
  `
})
export class PrintersPage {

  protected readonly data = inject(DataService);
  private readonly notify = inject(NotifyService);
  private readonly confirm = inject(ConfirmationService);

  protected readonly printerTypes = Object.values(PrinterType);
  protected readonly testing = signal<Set<number>>(new Set());
  protected readonly saving = signal(false);

  /** categories no printer prints – orders with them would never be printed */
  protected readonly unassigned = computed(() => {
    const assigned = this.data.printersByCategory();
    return this.data.categories().filter(c => !assigned.has(c.id));
  });

  protected readonly unassignedNames = computed(() => this.unassigned().map(c => c.name).join(', '));

  /** printer devices not used in the infrastructure yet */
  protected readonly unusedDevices = computed(() => {
    const used = new Set(this.data.infrastructureStore.items().map(i => i.printer));
    return this.data.printerDevices().filter(d => !used.has(d.id));
  });

  // ----- device dialog (add / edit) -----
  protected readonly dialogOpen = signal(false);
  protected readonly editingDevice = signal<Device | null>(null);
  protected readonly pickDevice = signal<number | 'new'>('new');
  protected readonly devName = signal('');
  protected readonly devType = signal<PrinterType>(PrinterType.EPSON);
  protected readonly devInterface = signal('tcp://192.168.1.100');

  protected readonly dialogValid = computed(() =>
    (this.editingDevice() === null && this.pickDevice() !== 'new')
    || (!!this.devName().trim() && !!this.devInterface().trim()));

  protected hasCategory(p: PrinterInfo, id: number): boolean {
    return (p.infrastructure.categories ?? []).includes(id);
  }

  protected async toggleCategory(p: PrinterInfo, categoryId: number): Promise<void> {
    const current = p.infrastructure.categories ?? [];
    const categories = current.includes(categoryId) ? current.filter(c => c !== categoryId) : [ ...current, categoryId ];
    const name = this.data.categoryById().get(categoryId)?.name ?? '';

    try {
      await this.data.update(this.data.infrastructureStore, p.infrastructure.id, { categories });
      this.notify.success(
        current.includes(categoryId) ? `${ name } wird nicht mehr gedruckt` : `${ name } wird jetzt gedruckt`,
        `auf ${ p.device?.name ?? 'Drucker' }`, 1800);
    } catch (e) {
      this.notify.error('Konnte nicht gespeichert werden', e);
    }
  }

  protected async testPrint(p: PrinterInfo): Promise<void> {
    const device = p.device;
    if (!device || this.testing().has(device.id)) return;

    this.testing.update(s => new Set(s).add(device.id));
    this.notify.info(`Testdruck an ${ device.name } gesendet`, 'Warte auf Rückmeldung vom Drucker …', 2500);

    try {
      const job = await this.data.testPrint(device.id);

      if (job.status === 'DONE') {
        this.notify.success(`Testdruck auf ${ device.name } erfolgreich`, 'Bon prüfen – der Drucker funktioniert.', 4000);
      } else {
        this.notify.error(`Testdruck auf ${ device.name } fehlgeschlagen`, job.message ?? undefined, 8000);
      }
    } catch (e) {
      this.notify.error('Testdruck konnte nicht gestartet werden', e);
    } finally {
      this.testing.update(s => {
        const next = new Set(s);
        next.delete(device.id);
        return next;
      });
    }
  }

  protected remove(p: PrinterInfo): void {
    this.confirm.confirm({
      header: `${ p.device?.name ?? 'Drucker' } entfernen?`,
      message: 'Der Drucker druckt danach keine Bestellungen mehr. Das Gerät selbst bleibt gespeichert und kann wieder hinzugefügt werden.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Entfernen',
      rejectLabel: 'Abbrechen',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary' },
      accept: async () => {
        try {
          await this.data.remove(this.data.infrastructureStore, p.infrastructure.id);
          this.notify.success(`${ p.device?.name ?? 'Drucker' } entfernt`);
        } catch (e) {
          this.notify.error('Drucker konnte nicht entfernt werden', e);
        }
      }
    });
  }

  protected openAdd(): void {
    this.editingDevice.set(null);
    this.pickDevice.set(this.unusedDevices()[0]?.id ?? 'new');
    this.devName.set('');
    this.devType.set(PrinterType.EPSON);
    this.devInterface.set('tcp://192.168.1.100');
    this.dialogOpen.set(true);
  }

  protected openEdit(device: Device): void {
    this.editingDevice.set(device);
    this.devName.set(device.name);
    this.devType.set(device.type);
    this.devInterface.set(device.interface);
    this.dialogOpen.set(true);
  }

  protected async saveDevice(): Promise<void> {
    if (!this.dialogValid() || this.saving()) return;

    this.saving.set(true);

    const fields = {
      name: this.devName().trim(),
      type: this.devType(),
      interface: this.devInterface().trim()
    };

    try {
      const editing = this.editingDevice();

      if (editing) {
        await this.data.update(this.data.deviceStore, editing.id, fields);
        this.notify.success(`${ fields.name } gespeichert`, 'Der Druckservice verbindet sich neu.');
      } else {
        let deviceId = this.pickDevice();

        if (deviceId === 'new') {
          const created = await this.data.insert(this.data.deviceStore, {
            ...fields,
            deviceType: DeviceType.PRINTER,
            controlInterval: 10
          });
          deviceId = created.id;
        }

        await this.data.insert(this.data.infrastructureStore, { printer: deviceId, categories: [] });
        this.notify.success('Drucker hinzugefügt', 'Jetzt Kategorien auswählen und Testdruck machen.', 4000);
      }

      this.dialogOpen.set(false);
    } catch (e) {
      this.notify.error('Drucker konnte nicht gespeichert werden', e);
    } finally {
      this.saving.set(false);
    }
  }
}
