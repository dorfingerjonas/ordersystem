import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDragPlaceholder, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { DataService } from '../../../services/data.service';
import { NotifyService } from '../../../services/notify.service';
import { eur } from '../../../utils/format';
import {
  combinations,
  euroInput,
  GroupShape,
  MAX_ATTRIBUTES,
  MAX_VALUES,
  parseEuro,
  planGroupSave,
  regridPrices,
  renameValueInDraft,
  renameVariant,
  addRename,
  ValueRenames,
  priceAttributes,
  priceKey,
  surchargeAttribute,
  validateGroup,
  variantName,
  variantKey,
  variantPriceCents
} from '../../../utils/groups';
import { GroupAttribute, ProductGroup } from '../../../models/models';

let attributeCounter = 0;
const newAttributeId = () => `a${ Date.now().toString(36) }${ (attributeCounter++).toString(36) }`;

interface PriceCell {
  key: string;
  label: string;
  text: string;
  invalid: boolean;
  required: boolean;
}

@Component({
  selector: 'app-group-edit',
  imports: [ FormsModule, InputTextModule, ToggleSwitchModule, CdkDropList, CdkDrag, CdkDragHandle, CdkDragPlaceholder ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './group-edit.page.html',
  styleUrl: './group-edit.page.scss'
})
export class GroupEditPage {

  protected readonly data = inject(DataService);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmationService);

  public readonly groupId = input.required<string>();
  /** preselected category for new groups (?category=) */
  public readonly categoryParam = input<string | undefined>(undefined, { alias: 'category' });

  protected readonly eur = eur;
  protected readonly maxAttributes = MAX_ATTRIBUTES;
  protected readonly maxValues = MAX_VALUES;

  protected readonly isNew = computed(() => this.groupId() === 'new');
  protected readonly group = computed<ProductGroup | null>(() =>
    this.isNew() ? null : this.data.groupById().get(Number(this.groupId())) ?? null);

  // ---------- draft ----------
  protected readonly name = signal('');
  protected readonly category = signal<number | null>(null);
  protected readonly prefixName = signal(false);
  protected readonly attributes = signal<GroupAttribute[]>([]);
  /** raw input text per price cell */
  protected readonly priceText = signal<Record<string, string>>({});
  /** raw input text per value of the first attribute */
  protected readonly surchargeText = signal<Record<string, string>>({});
  protected readonly showSurcharge = signal(false);
  protected readonly excluded = signal<Set<string>>(new Set());

  /** value input under an attribute: adding a new value (original = null) or editing one */
  protected readonly editing = signal<{ attributeId: string; original: string | null } | null>(null);
  /** renamed values so existing products keep their id / revenue / sold out state */
  private readonly renames = signal<ValueRenames>({});
  protected readonly valueDraft = signal('');
  protected readonly valueError = signal('');
  protected readonly dirty = signal(false);
  protected readonly saving = signal(false);

  // ---------- derived ----------
  protected readonly printers = computed(() => this.data.printersByCategory().get(this.category() ?? -1) ?? []);
  protected readonly categoryName = computed(() => this.data.categoryById().get(this.category() ?? -1)?.name ?? '');

  protected readonly priceAttrs = computed(() => priceAttributes(this.attributes()));
  protected readonly surchargeAttr = computed(() => surchargeAttribute(this.attributes()));

  /** the draft in the shape the save logic expects (invalid / empty prices are left out) */
  protected readonly shape = computed<GroupShape & { category: number | null; ordering: number }>(() => {
    const prices: Record<string, number> = {};
    const surcharges: Record<string, number> = {};
    const surchargeAttr = this.surchargeAttr();

    Object.entries(this.priceText()).forEach(([ k, v ]) => {
      const c = parseEuro(v);
      if (c !== null) prices[k] = c / 100;
    });

    if (surchargeAttr && this.showSurcharge()) {
      Object.entries(this.surchargeText()).forEach(([ k, v ]) => {
        const c = parseEuro(v);
        if (c !== null && c > 0 && surchargeAttr.values.includes(k)) surcharges[k] = c / 100;
      });
    }

    const allKeys = new Set(combinations(this.attributes()).map(c => c.key));

    return {
      name: this.name().trim(),
      category: this.category(),
      ordering: this.group()?.ordering ?? 0,
      attributes: this.attributes(),
      prices: this.cleanPrices(prices),
      surcharges,
      excluded: [ ...this.excluded() ].filter(k => allKeys.has(k)),
      prefix_name: this.prefixName()
    };
  });

  protected readonly combos = computed(() => {
    const shape = this.shape();
    const excluded = new Set(shape.excluded);
    const existing = new Set((this.data.productsByGroup().get(this.group()?.id ?? -1) ?? [])
      .filter(p => !p.archived && p.variant)
      .map(p => variantKey(renameVariant(p.variant!, this.renames()))));

    return combinations(shape.attributes).map(c => {
      const cents = variantPriceCents(shape, c.values);
      return {
        ...c,
        name: variantName(shape, c.values),
        cents,
        on: !excluded.has(c.key),
        isNew: !this.isNew() && !existing.has(c.key)
      };
    });
  });

  protected readonly activeCount = computed(() => this.combos().filter(c => c.on).length);

  /** section 3 grouped by the first attribute (only with 2+ attributes) */
  protected readonly comboGroups = computed(() => {
    const attributes = this.attributes();
    const combos = this.combos();

    if (attributes.length < 2) return [ { label: '', surcharge: 0, combos } ];

    const surcharges = this.shape().surcharges;

    return attributes[0].values.map(v => ({
      label: v,
      surcharge: Math.round((surcharges[v] ?? 0) * 100),
      combos: combos.filter(c => c.values[0] === v)
    }));
  });

  /** keys of price cells needed by at least one active variant */
  private readonly requiredPriceKeys = computed(() => {
    const n = this.attributes().length;
    return new Set(this.combos().filter(c => c.on).map(c => priceKey(n <= 1 ? c.values.slice(0, 1) : c.values.slice(1))));
  });

  protected readonly priceGrid = computed(() => {
    const [ rowsAttr, colsAttr ] = this.priceAttrs();
    const text = this.priceText();
    const required = this.requiredPriceKeys();

    if (!rowsAttr) return { heads: [] as string[], rows: [] as { label: string; cells: PriceCell[] }[] };

    const heads = colsAttr ? colsAttr.values : [ 'Preis' ];

    return {
      heads,
      rows: rowsAttr.values.map(r => ({
        label: r,
        cells: (colsAttr ? colsAttr.values : [ null ]).map(c => {
          const key = priceKey(c === null ? [ r ] : [ r, c ]);
          const value = text[key] ?? '';
          return {
            key,
            label: c === null ? r : `${ r } ${ c }`,
            text: value,
            invalid: value.trim() !== '' && parseEuro(value) === null,
            required: required.has(key) && parseEuro(value) === null
          };
        })
      }))
    };
  });

  protected readonly surchargeRows = computed(() => {
    const attr = this.surchargeAttr();
    const text = this.surchargeText();

    return (attr?.values ?? []).map(v => ({
      value: v,
      text: text[v] ?? '',
      invalid: (text[v] ?? '').trim() !== '' && parseEuro(text[v]) === null
    }));
  });

  protected readonly hasInvalidInput = computed(() =>
    this.priceGrid().rows.some(r => r.cells.some(c => c.invalid)) || (this.showSurcharge() && this.surchargeRows().some(r => r.invalid)));

  protected readonly error = computed(() => {
    if (this.hasInvalidInput()) return 'Ungültiger Preis – bitte z. B. 2,50 eingeben';

    const shape = this.shape();
    return validateGroup(shape);
  });

  /** what saving will do to existing products */
  protected readonly plan = computed(() => {
    const shape = this.shape();
    if (shape.category === null) return null;

    return planGroupSave({ ...shape, category: shape.category }, this.data.productsByGroup().get(this.group()?.id ?? -1) ?? [], this.renames());
  });

  /** generated names that clash with other (visible) products or with each other */
  protected readonly nameClashes = computed(() => {
    const groupId = this.group()?.id ?? -1;
    const others = new Set(this.data.products().filter(p => p.product_group !== groupId).map(p => p.name.trim().toLowerCase()));
    const clashes = this.combos().filter(c => c.on && others.has(c.name.toLowerCase())).map(c => c.name);

    return [ ...new Set([ ...clashes, ...(this.plan()?.duplicateNames ?? []) ]) ];
  });

  protected readonly example = computed(() => {
    const first = this.combos()[0];
    return first ? first.name : '';
  });

  private initialized = false;

  constructor() {
    effect(() => {
      const loaded = this.data.loaded();
      const group = this.group();

      if (!loaded || this.initialized) return;

      untracked(() => {
        this.initialized = true;

        if (this.isNew()) {
          const preselected = Number(this.categoryParam());
          this.category.set(this.data.categoryById().has(preselected) ? preselected : this.data.categories()[0]?.id ?? null);
          this.attributes.set([
            { id: newAttributeId(), name: 'Sorte', values: [] },
            { id: newAttributeId(), name: 'Größe', values: [] }
          ]);
        } else if (group) {
          this.load(group);
        } else {
          this.notify.warn('Produktgruppe nicht gefunden');
          void this.router.navigate([ '/admin/products' ], { replaceUrl: true });
        }
      });
    });
  }

  private load(group: ProductGroup): void {
    this.name.set(group.name);
    this.category.set(group.category);
    this.prefixName.set(group.prefix_name);
    this.attributes.set(group.attributes.map(a => ({ ...a, values: [ ...a.values ] })));

    const prices: Record<string, string> = {};
    Object.entries(group.prices).forEach(([ k, v ]) => prices[k] = euroInput(Math.round(Number(v) * 100)));
    this.priceText.set(prices);

    const surcharges: Record<string, string> = {};
    Object.entries(group.surcharges).forEach(([ k, v ]) => {
      if (Number(v) > 0) surcharges[k] = euroInput(Math.round(Number(v) * 100));
    });
    this.surchargeText.set(surcharges);
    this.showSurcharge.set(Object.keys(surcharges).length > 0);
    this.excluded.set(new Set(group.excluded));
  }

  /** only prices of cells that still exist */
  private cleanPrices(prices: Record<string, number>): Record<string, number> {
    const [ rowsAttr, colsAttr ] = priceAttributes(this.attributes());
    if (!rowsAttr) return {};

    const keys = new Set(rowsAttr.values.flatMap(r => colsAttr ? colsAttr.values.map(c => priceKey([ r, c ])) : [ priceKey([ r ]) ]));
    const result: Record<string, number> = {};

    Object.entries(prices).forEach(([ k, v ]) => {
      if (keys.has(k)) result[k] = v;
    });

    return result;
  }

  private touch(): void {
    this.dirty.set(true);
  }

  // ---------- general ----------

  protected setName(value: string): void {
    this.name.set(value);
    this.touch();
  }

  protected setCategory(id: number): void {
    this.category.set(id);
    this.touch();
  }

  protected setPrefix(value: boolean): void {
    this.prefixName.set(value);
    this.touch();
  }

  // ---------- attributes ----------

  protected renameAttribute(id: string, name: string): void {
    this.attributes.update(list => list.map(a => a.id === id ? { ...a, name } : a));
    this.touch();
  }

  protected addAttribute(): void {
    if (this.attributes().length >= MAX_ATTRIBUTES) return;

    const id = newAttributeId();
    this.attributes.update(list => [ ...list, { id, name: '', values: [] } ]);
    this.startAdd(id);
    this.touch();
  }

  /** drag & drop of attributes: the price grid is rebuilt so every variant keeps its price */
  protected dropAttribute(event: CdkDragDrop<GroupAttribute[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    const next = [ ...this.attributes() ];
    moveItemInArray(next, event.previousIndex, event.currentIndex);

    const shape = this.shape();
    const result = regridPrices({ attributes: this.attributes(), prices: shape.prices, surcharges: shape.surcharges, excluded: [] }, next);

    const prices: Record<string, string> = {};
    Object.entries(result.prices).forEach(([ k, v ]) => prices[k] = euroInput(Math.round(v * 100)));
    const surcharges: Record<string, string> = {};
    Object.entries(result.surcharges).forEach(([ k, v ]) => surcharges[k] = euroInput(Math.round(v * 100)));

    this.attributes.set(next);
    this.priceText.set(prices);
    this.surchargeText.set(surcharges);
    this.showSurcharge.set(Object.keys(surcharges).length > 0);
    this.touch();

    if (!result.exact) {
      this.notify.warn('Bitte Preise prüfen', 'Nicht alle bisherigen Preise passen in die neue Reihenfolge.', 6000);
    }
  }

  /** drag & drop of values = order of tiles / buttons when ordering */
  protected dropValue(attribute: GroupAttribute, event: CdkDragDrop<string[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    const values = [ ...attribute.values ];
    moveItemInArray(values, event.previousIndex, event.currentIndex);
    this.attributes.update(list => list.map(a => a.id === attribute.id ? { ...a, values } : a));
    this.touch();
  }

  protected removeAttribute(attribute: GroupAttribute): void {
    if (this.attributes().length <= 1) return;

    const apply = () => {
      this.attributes.update(list => list.filter(a => a.id !== attribute.id));
      if (this.editing()?.attributeId === attribute.id) this.editing.set(null);
      this.touch();
    };

    if (attribute.values.length === 0) {
      apply();
      return;
    }

    this.confirm.confirm({
      header: 'Merkmal entfernen?',
      message: `„${ attribute.name || 'Merkmal' }“ mit ${ attribute.values.length } Werten entfernen? Die Preise werden neu angeordnet.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Entfernen',
      rejectLabel: 'Abbrechen',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary' },
      accept: apply
    });
  }

  protected startAdd(id: string): void {
    this.editing.set({ attributeId: id, original: null });
    this.valueDraft.set('');
    this.valueError.set('');
    this.focusValueInput(id);
  }

  /** tap on a value: edit (rename / remove) */
  protected startEdit(attribute: GroupAttribute, value: string): void {
    this.editing.set({ attributeId: attribute.id, original: value });
    this.valueDraft.set(value);
    this.valueError.set('');
    this.focusValueInput(attribute.id, true);
  }

  protected cancelEdit(): void {
    this.editing.set(null);
    this.valueError.set('');
  }

  private focusValueInput(id: string, select = false): void {
    setTimeout(() => {
      const input = document.getElementById(`value-input-${ id }`) as HTMLInputElement | null;
      input?.focus();
      if (select) input?.select();
    }, 50);
  }

  protected confirmValue(attribute: GroupAttribute): void {
    const edit = this.editing();
    const value = this.valueDraft().trim().replace(/\s+/g, ' ');

    if (!edit) return;

    if (!value) {
      if (edit.original === null) {
        this.cancelEdit();
      } else {
        this.valueError.set('Name darf nicht leer sein');
      }
      return;
    }

    const others = attribute.values.filter(v => v !== edit.original);

    if (others.some(v => v.toLowerCase() === value.toLowerCase())) {
      this.valueError.set(`„${ value }“ gibt es schon`);
      return;
    }

    if (edit.original !== null) {
      this.renameValue(attribute, edit.original, value);
      this.cancelEdit();
      return;
    }

    if (attribute.values.length >= MAX_VALUES) {
      this.valueError.set(`Höchstens ${ MAX_VALUES } Werte`);
      return;
    }

    this.attributes.update(list => list.map(a => a.id === attribute.id ? { ...a, values: [ ...a.values, value ] } : a));
    // keep the input open for the next value
    this.valueDraft.set('');
    this.valueError.set('');
    this.touch();
    this.focusValueInput(attribute.id);
  }

  /** renames everywhere in the draft; on save the existing products are renamed (same id) */
  private renameValue(attribute: GroupAttribute, from: string, to: string): void {
    if (from === to) return;

    const next = renameValueInDraft<string>({
      attributes: this.attributes(),
      prices: this.priceText(),
      surcharges: this.surchargeText(),
      excluded: [ ...this.excluded() ]
    }, attribute.id, from, to);

    this.attributes.set(next.attributes);
    this.priceText.set(next.prices);
    this.surchargeText.set(next.surcharges);
    this.excluded.set(new Set(next.excluded));
    this.renames.update(r => addRename(r, attribute.id, from, to));
    this.touch();
  }

  protected removeValue(attribute: GroupAttribute, value: string): void {
    this.attributes.update(list => list.map(a => a.id === attribute.id ? { ...a, values: a.values.filter(v => v !== value) } : a));
    if (this.editing()?.original === value) this.cancelEdit();
    this.touch();
  }

  // ---------- prices ----------

  protected setPrice(key: string, text: string): void {
    this.priceText.update(p => ({ ...p, [key]: text }));
    this.touch();
  }

  /** "2.5" -> "2,50" when leaving the field */
  protected formatPrice(key: string): void {
    const cents = parseEuro(this.priceText()[key]);
    if (cents !== null) this.priceText.update(p => ({ ...p, [key]: euroInput(cents) }));
  }

  protected bulk(delta: number): void {
    const next: Record<string, string> = {};

    Object.entries(this.priceText()).forEach(([ k, v ]) => {
      const c = parseEuro(v);
      next[k] = c === null ? v : euroInput(Math.max(0, c + delta));
    });

    this.priceText.set(next);
    this.touch();
  }

  protected setSurcharge(value: string, text: string): void {
    this.surchargeText.update(s => ({ ...s, [value]: text }));
    this.touch();
  }

  protected formatSurcharge(value: string): void {
    const cents = parseEuro(this.surchargeText()[value]);
    if (cents !== null) this.surchargeText.update(s => ({ ...s, [value]: cents === 0 ? '' : euroInput(cents) }));
  }

  protected toggleSurcharge(): void {
    this.showSurcharge.update(v => !v);
    this.touch();
  }

  // ---------- variants ----------

  protected toggleVariant(key: string): void {
    this.excluded.update(set => {
      const next = new Set(set);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    this.touch();
  }

  // ---------- save / leave ----------

  protected back(): void {
    if (!this.dirty()) {
      void this.router.navigate([ '/admin/products' ]);
      return;
    }

    this.confirm.confirm({
      header: 'Änderungen verwerfen?',
      message: 'Die Produktgruppe wurde noch nicht gespeichert.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Verwerfen',
      rejectLabel: 'Weiter bearbeiten',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary' },
      accept: () => void this.router.navigate([ '/admin/products' ])
    });
  }

  protected save(): void {
    if (this.saving() || this.error() !== null) return;

    const plan = this.plan();
    const archive = plan?.archive.length ?? 0;

    if (archive > 0) {
      this.confirm.confirm({
        header: 'Produkte ausblenden?',
        message: `${ archive } ${ archive === 1 ? 'bisheriges Produkt wird' : 'bisherige Produkte werden' } ausgeblendet `
          + '(Umsatz und offene Posten bleiben erhalten).',
        icon: 'pi pi-info-circle',
        acceptLabel: 'Speichern',
        rejectLabel: 'Zurück',
        rejectButtonProps: { severity: 'secondary' },
        accept: () => void this.doSave()
      });
      return;
    }

    void this.doSave();
  }

  private async doSave(): Promise<void> {
    const shape = this.shape();
    if (shape.category === null) return;

    this.saving.set(true);

    try {
      const group = await this.data.saveGroup(this.group()?.id ?? null, { ...shape, category: shape.category }, this.renames());
      const count = this.activeCount();

      this.dirty.set(false);
      this.notify.success(`„${ group.name }“ gespeichert`, `${ count } ${ count === 1 ? 'Produkt' : 'Produkte' }`);
      await this.router.navigate([ '/admin/products' ], { queryParams: { category: group.category } });
    } catch (e) {
      this.notify.error('Produktgruppe konnte nicht gespeichert werden', e);
    } finally {
      this.saving.set(false);
    }
  }

  protected remove(): void {
    const group = this.group();
    if (!group) return;

    this.confirm.confirm({
      header: 'Produktgruppe löschen?',
      message: `„${ group.name }“ wird gelöscht, die Produkte werden ausgeblendet. Umsatz und offene Posten bleiben erhalten.`,
      icon: 'pi pi-trash',
      acceptLabel: 'Löschen',
      rejectLabel: 'Abbrechen',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary' },
      accept: async () => {
        try {
          await this.data.deleteGroup(group);
          this.dirty.set(false);
          this.notify.success(`„${ group.name }“ gelöscht`);
          await this.router.navigate([ '/admin/products' ], { replaceUrl: true });
        } catch (e) {
          this.notify.error('Produktgruppe konnte nicht gelöscht werden', e);
        }
      }
    });
  }
}
