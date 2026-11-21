import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DataService } from '../services/data.service';
import { NotifyService } from '../services/notify.service';
import { ReceiptService } from '../services/receipt.service';
import { eur } from '../utils/format';

/**
 * Small "Beleg drucken" row shown for a few minutes after a payment,
 * plus the dialog to pick a printer and print the payment confirmation.
 */
@Component({
  selector: 'app-receipt-offer',
  imports: [ FormsModule, DialogModule, ButtonModule, InputTextModule ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (receipt.last(); as last) {
      <div class="offer">
        <i class="pi pi-receipt" aria-hidden="true"></i>
        <span class="offer-text">
          Letzte Zahlung · {{ last.table === null ? 'Direktverkauf' : 'Tisch ' + last.table }} · {{ eur(last.total) }}
        </span>
        <button type="button" class="btn-ghost small" (click)="open()">Beleg drucken</button>
        <button type="button" class="icon-btn small" (click)="receipt.dismiss()" aria-label="Beleg-Angebot ausblenden">
          <i class="pi pi-times" aria-hidden="true"></i>
        </button>
      </div>
    }

    <p-dialog [visible]="receipt.dialogOpen()" (visibleChange)="receipt.dialogOpen.set($event)" [modal]="true"
              header="Zahlungsbestätigung drucken" [draggable]="false" [dismissableMask]="true"
              [style]="{ width: 'calc(100vw - 32px)', maxWidth: '420px' }">
      @if (receipt.last(); as last) {
        <form class="dialog-form" (ngSubmit)="print()">
          <div class="summary">
            @for (l of last.lines; track $index) {
              <div class="line"><span>{{ l.amount }}× {{ l.name }}</span><span>{{ eur(l.price * l.amount) }}</span></div>
            }
            <div class="line total"><span>Summe</span><span>{{ eur(last.total) }}</span></div>
          </div>

          <fieldset class="field">
            <legend class="label">Drucker</legend>
            <div class="chips">
              @for (d of data.printerDevices(); track d.id) {
                <button type="button" class="chip" [attr.aria-pressed]="printer() === d.id" (click)="printer.set(d.id)">
                  <span class="status-dot" [class.online]="online().has(d.id)" [class.offline]="!online().has(d.id)" aria-hidden="true"></span>
                  {{ d.name }}
                </button>
              } @empty {
                <span class="hint">Kein Drucker angelegt.</span>
              }
            </div>
          </fieldset>

          <div class="field">
            <label for="receipt-recipient">Für (optional)</label>
            <input pInputText id="receipt-recipient" name="recipient" [ngModel]="recipient()" (ngModelChange)="recipient.set($event)"
                   placeholder="z. B. Verein, Firma" autocomplete="off" maxlength="40">
          </div>

          <span class="hint">Keine Rechnung – nur Zahlungsnachweis, z. B. für die Vereinsbuchhaltung.</span>
        </form>
      }
      <ng-template #footer>
        <p-button label="Abbrechen" severity="secondary" (onClick)="receipt.dialogOpen.set(false)" />
        <p-button label="Drucken" icon="pi pi-print" severity="contrast" [loading]="printing()"
                  [disabled]="printer() === null" (onClick)="print()" />
      </ng-template>
    </p-dialog>
  `,
  styles: `
    :host { display: contents; }
    .offer {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 4px 4px 14px;
      border-radius: var(--os-radius);
      background: var(--os-card);
      border: 1px solid var(--os-divider);
      color: var(--os-text-2);
      font-size: 14px;
      flex-shrink: 0;
    }
    .offer-text { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .btn-ghost.small { min-height: 40px; font-size: 14px; white-space: nowrap; }
    .icon-btn.small { width: 40px; height: 40px; }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .hint { font-size: 13px; color: var(--os-muted); }
    .summary { display: flex; flex-direction: column; gap: 4px; font-size: 14px; }
    .line { display: flex; justify-content: space-between; gap: 12px; }
    .line.total { font-weight: 800; font-size: 16px; border-top: 1px solid var(--os-divider); padding-top: 6px; margin-top: 2px; }
  `
})
export class ReceiptOfferComponent {

  protected readonly data = inject(DataService);
  protected readonly receipt = inject(ReceiptService);
  private readonly notify = inject(NotifyService);

  protected readonly eur = eur;
  protected readonly printer = signal<number | null>(null);
  protected readonly recipient = signal('');
  protected readonly printing = signal(false);

  /** device ids of printers the printer service reached recently */
  protected readonly online = computed(() => new Set(this.data.printers()
    .filter(p => p.online && p.device)
    .map(p => p.device!.id)));

  constructor() {
    // a new payment starts with an empty recipient
    effect(() => {
      this.receipt.last();
      this.recipient.set('');
    });
  }

  protected open(): void {
    const devices = this.data.printerDevices();
    const remembered = this.receipt.printerId;
    const fallback = devices.find(d => this.online().has(d.id)) ?? devices[0];

    this.printer.set(devices.some(d => d.id === remembered) ? remembered : fallback?.id ?? null);
    this.receipt.dialogOpen.set(true);
  }

  protected async print(): Promise<void> {
    const last = this.receipt.last();
    const printer = this.printer();

    if (!last || printer === null || this.printing()) return;

    this.receipt.printerId = printer;
    this.printing.set(true);

    try {
      const recipient = this.recipient().trim();
      const job = await this.data.printReceipt(printer, { ...last, recipient: recipient || undefined });

      if (job.status === 'DONE') {
        this.notify.success('Beleg gedruckt', `Beleg-Nr. ${ job.id }`);
        this.receipt.dismiss();
      } else {
        this.notify.error('Beleg nicht gedruckt', job.message ?? undefined);
      }
    } catch (e) {
      this.notify.error('Beleg nicht gedruckt', e);
    } finally {
      this.printing.set(false);
    }
  }
}
