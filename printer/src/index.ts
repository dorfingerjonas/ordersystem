import { Category, Device, DeviceType, Order, OrderDTO, OrderLine, PrintJob, Product, ReceiptPayload, Table } from './models/models';
import { InfrastructureConfigDTO, PrinterConfig } from './config';
import { CharacterSet, ThermalPrinter } from 'node-thermal-printer';

import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { environment } from './environment';
import { Logger } from './helpers/logger';

const supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
const LOG = new Logger('ordersystem');

const products: Product[] = [];
const categories: Category[] = [];
const tables: Table[] = [];
const devices: Device[] = [];
const infrastructure: PrinterConfig[] = [];

/** cached printer instances, key = infrastructure id */
const printerConnections = new Map<number, ThermalPrinter>();

/** orders currently being printed (realtime + polling must not print twice) */
const ordersInFlight = new Set<number>();
/** order id -> infrastructure ids that already printed their part (retry only the missing ones) */
const printedParts = new Map<number, Set<number>>();
const jobsInFlight = new Set<number>();

/** realtime is the primary channel; polling is only a safety net */
const SAFETY_POLL_INTERVAL = 60 * 1000;
/** while the realtime channel is down, poll at the old rate */
const DEGRADED_POLL_INTERVAL = 10 * 1000;
const RESUBSCRIBE_DELAY = 5 * 1000;
const PING_INTERVAL = 10 * 1000;
const JOB_MAX_AGE = 2 * 60 * 1000;

let ready = false;

(async () => {
  await initData('tables');
  await initData('category');
  await initData('product');
  await initData('device');
  await initData('infrastructure');

  ready = true;
  LOG.info('initial data loaded');

  catchUp('startup');
  void pingPrinters();

  // safety net only: realtime delivers new orders instantly. Poll every 60s
  // while realtime is healthy, every 10s while the channel is down.
  setInterval(() => {
    const interval = realtimeHealthy ? SAFETY_POLL_INTERVAL : DEGRADED_POLL_INTERVAL;

    if (Date.now() - lastCatchUp >= interval) catchUp(realtimeHealthy ? 'safety poll' : 'realtime down');
  }, DEGRADED_POLL_INTERVAL);

  setInterval(() => void pingPrinters(), PING_INTERVAL);

  const serverDevice = devices.find(device => device.deviceType === DeviceType.SERVER);

  if (serverDevice) {
    LOG.info(`starting service status (${ serverDevice.controlInterval }s)`);
    setInterval(async () => {
      await supabase.from('status').upsert({ status: 'running', device: serverDevice.id, timestamp: Date.now() });
      LOG.info('Server status updated');
    }, serverDevice.controlInterval * 1000);
  }
})();

// ---------------------------------------------------------------------
// data
// ---------------------------------------------------------------------

async function initData(type: 'product' | 'category' | 'tables' | 'infrastructure' | 'device'): Promise<void> {
  if (type === 'product') {
    const { data } = await supabase.from('product').select('*, category:category(*)');
    if (data) {
      products.length = 0;
      products.push(...data as Product[]);
      LOG.info('updated products');
    } else {
      LOG.error('Error fetching products');
    }
  } else if (type === 'category') {
    const { data } = await supabase.from('category').select('*');
    if (data) {
      categories.length = 0;
      categories.push(...data as Category[]);
      LOG.info('updated categories');
    } else {
      LOG.error('Error fetching categories');
    }
  } else if (type === 'tables') {
    const { data } = await supabase.from('tables').select('*');
    if (data) {
      tables.length = 0;
      tables.push(...data as Table[]);
      LOG.info('updated tables');
    } else {
      LOG.error('Error fetching tables');
    }
  } else if (type === 'device') {
    const { data } = await supabase.from('device').select('*');
    if (data) {
      devices.length = 0;
      devices.push(...data as Device[]);
      LOG.info('updated devices');
    } else {
      LOG.error('Error fetching devices');
    }
  } else if (type === 'infrastructure') {
    const { data } = await supabase.from('infrastructure').select('*, printer:device(*)');
    if (data) {
      infrastructure.length = 0;
      infrastructure.push(...(data as InfrastructureConfigDTO[])
        .filter(d => d.printer)
        .map(d => ({
          infrastructureId: d.id,
          deviceId: d.printer.id,
          categories: d.categories ?? [],
          interface: d.printer.interface,
          printerType: d.printer.type,
          printerName: d.printer.name,
          name: d.printer.name,
          controlInterval: d.printer.controlInterval
        } as PrinterConfig)));

      // interface/type could have changed -> recreate printer instances lazily
      printerConnections.clear();
      LOG.info(`updated infrastructure (${ infrastructure.length } printers)`);
    } else {
      LOG.error('Error fetching infrastructure');
    }
  }
}

function mapOrderDTO(orderDTO: OrderDTO): Order {
  return {
    ...orderDTO,
    products: (orderDTO.products ?? [])
      .map(line => {
        const product = products.find(p => p.id === line.id);
        return product ? { ...product, amount: line.amount, note: line.note?.trim() || undefined } as OrderLine : null;
      })
      .filter((p): p is OrderLine => p !== null && p.amount > 0),
    // unknown table (created after our last refresh) -> placeholder, resolved in handleOrder
    table: tables.find(table => table.id === orderDTO.table) ?? { id: orderDTO.table, nr: '?', ordering: 0 },
    timestamp: new Date(orderDTO.timestamp).getTime()
  };
}

// ---------------------------------------------------------------------
// orders
// ---------------------------------------------------------------------

let lastCatchUp = 0;

/** fetches everything that might have been missed (startup, reconnect, safety poll) */
function catchUp(reason: string): void {
  if (!ready) return;

  lastCatchUp = Date.now();
  LOG.debug(`catch up (${ reason })`);
  getOutstandingOrders();
  getPendingPrintJobs();
}

function getOutstandingOrders(): void {
  if (!ready) return;

  supabase.from('orders').select('*').eq('printed', false).then(({ data, error }) => {
    if (error) {
      LOG.error('Error fetching outstanding orders ' + error.message);
      return;
    }

    if (data && data.length > 0) {
      LOG.info(`outstanding orders: ${ data.length }`);
      data.forEach(order => void handleOrder(mapOrderDTO(order as OrderDTO)));
    }
  });
}

async function handleOrder(order: Order): Promise<void> {
  if (!ready || order.printed || ordersInFlight.has(order.id)) return;

  if (infrastructure.length === 0) {
    LOG.warn(`order ${ order.id }: no printers configured, waiting`);
    return;
  }

  if (order.table.nr === '?') {
    await initData('tables');
    order.table = tables.find(t => t.id === order.table.id) ?? order.table;
  }

  ordersInFlight.add(order.id);

  try {
    const done = printedParts.get(order.id) ?? new Set<number>();
    printedParts.set(order.id, done);

    const unmapped = order.products.filter(p => !infrastructure.some(i => i.categories.includes(p.category?.id)));
    if (unmapped.length > 0) {
      LOG.warn(`order ${ order.id }: no printer for ${ unmapped.map(p => p.name).join(', ') }`);
    }

    let allPrinted = true;

    for (const infra of infrastructure) {
      if (done.has(infra.infrastructureId)) continue;

      const lines = order.products.filter(p => infra.categories.includes(p.category?.id));
      if (lines.length === 0) continue;

      try {
        await printReceipt({ ...order, products: lines }, getPrinter(infra));
        done.add(infra.infrastructureId);
        LOG.info(`order ${ order.id } printed on ${ infra.printerName }`);
      } catch (error) {
        allPrinted = false;
        printerConnections.delete(infra.infrastructureId);
        LOG.error(`order ${ order.id }: printing on ${ infra.printerName } failed (will retry) ${ error }`);
      }
    }

    if (allPrinted) {
      const { error } = await supabase.from('orders').update({ printed: true }).eq('id', order.id);

      if (error) {
        LOG.error(`order ${ order.id }: could not set printed ${ error.message }`);
      } else {
        printedParts.delete(order.id);
      }
    }
  } finally {
    ordersInFlight.delete(order.id);
  }
}

// ---------------------------------------------------------------------
// printers
// ---------------------------------------------------------------------

function createPrinter(type: PrinterConfig['printerType'], iface: string): ThermalPrinter {
  return new ThermalPrinter({
    type,
    interface: iface,
    removeSpecialCharacters: false,
    lineCharacter: '*',
    width: 48,
    characterSet: CharacterSet.PC858_EURO,
    options: { timeout: 5000 }
  });
}

function getPrinter(config: PrinterConfig): ThermalPrinter {
  let printer = printerConnections.get(config.infrastructureId);

  if (!printer) {
    printer = createPrinter(config.printerType, config.interface);
    printerConnections.set(config.infrastructureId, printer);
  }

  return printer;
}

/** updates infrastructure.lastPing for every reachable printer (shown as online in the app) */
async function pingPrinters(): Promise<void> {
  await Promise.all(infrastructure.map(async infra => {
    try {
      const connected = await getPrinter(infra).isPrinterConnected();

      if (connected) {
        await supabase.from('infrastructure').update({ lastPing: Date.now() }).eq('id', infra.infrastructureId);
      } else {
        LOG.warn(`Printer "${ infra.printerName }" is not connected`);
      }
    } catch (error) {
      LOG.warn(`Printer "${ infra.printerName }" ping failed ${ error }`);
    }
  }));
}

async function printReceipt(order: Order, printer: ThermalPrinter): Promise<void> {
  printer.clear();

  try {
    buildReceiptData(order, printer);
    printer.cut();
    await printer.execute();
  } finally {
    printer.clear();
  }
}

function buildReceiptData(order: Order, printer: ThermalPrinter): void {
  printer.drawLine();
  printer.newLine();

  printer.setTextDoubleHeight();
  printer.println(`Tisch: ${ order.table?.nr ?? '?' }`);
  printer.setTextNormal();

  printer.println(`Datum: ${ formatDate(order.timestamp) }`);
  printer.println(`Besteller: ${ order.waiter }`);

  printer.newLine();

  order.products.forEach(product => {
    printer.setTextDoubleHeight();
    printer.println(`${ product.amount }x ${ product.name }`);

    if (product.note) {
      printer.setTextNormal();
      printer.bold(true);
      printer.println(`    -> ${ product.note }`);
      printer.bold(false);
    }
  });

  printer.setTextNormal();

  if (order.note && order.note.trim().length > 0) {
    printer.newLine();
    printer.setTextDoubleHeight();
    printer.println(`Anm: ${ order.note.trim() }`);
    printer.setTextNormal();
  }

  printer.newLine();
  printer.drawLine();
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('de-AT').replace(/\//gm, '.');
}

// ---------------------------------------------------------------------
// print jobs (test print from the admin UI)
// ---------------------------------------------------------------------

function getPendingPrintJobs(): void {
  if (!ready) return;

  supabase.from('print_job').select('*').eq('status', 'PENDING').then(({ data, error }) => {
    if (error) {
      // table might not exist yet (migration not run)
      LOG.warn('Error fetching print jobs ' + error.message);
      return;
    }

    (data as PrintJob[] | null)?.forEach(job => void handlePrintJob(job));
  });
}

async function finishJob(job: PrintJob, status: 'DONE' | 'FAILED', message: string | null): Promise<void> {
  const { error } = await supabase.from('print_job')
    .update({ status, message, finished_at: new Date().toISOString() })
    .eq('id', job.id);

  if (error) LOG.error(`print job ${ job.id }: could not update status ${ error.message }`);
}

async function handlePrintJob(job: PrintJob): Promise<void> {
  if (!ready || job.status !== 'PENDING' || jobsInFlight.has(job.id)) return;

  jobsInFlight.add(job.id);

  try {
    if (Date.now() - new Date(job.created_at).getTime() > JOB_MAX_AGE) {
      await finishJob(job, 'FAILED', 'Auftrag abgelaufen (Druckservice war nicht erreichbar).');
      return;
    }

    const infra = infrastructure.find(i => i.deviceId === job.device);
    const device = devices.find(d => d.id === job.device);

    if (!infra && !device) {
      await finishJob(job, 'FAILED', 'Gerät ist dem Druckservice unbekannt.');
      return;
    }

    const name = infra?.printerName ?? device!.name;
    const iface = infra?.interface ?? device!.interface;
    const printer = infra ? getPrinter(infra) : createPrinter(device!.type, device!.interface);

    const connected = await printer.isPrinterConnected().catch(() => false);

    if (!connected) {
      await finishJob(job, 'FAILED', `Drucker ${ name } (${ iface }) ist nicht erreichbar. Strom, Papier und Netzwerk prüfen.`);
      return;
    }

    printer.clear();

    try {
      if (job.type === 'RECEIPT') {
        if (!job.payload) {
          await finishJob(job, 'FAILED', 'Beleg ohne Inhalt.');
          return;
        }

        buildPaymentReceipt(job.id, job.payload, printer);
      } else {
        buildTestPrint(name, iface, infra?.categories ?? [], printer);
      }

      printer.cut();
      await printer.execute();
    } finally {
      printer.clear();
    }

    LOG.info(`${ job.type === 'RECEIPT' ? 'receipt' : 'test print' } ${ job.id } on ${ name } done`);
    await finishJob(job, 'DONE', null);
  } catch (error) {
    LOG.error(`print job ${ job.id } failed ${ error }`);
    await finishJob(job, 'FAILED', `Druckfehler: ${ error }`);
  } finally {
    jobsInFlight.delete(job.id);
  }
}

function buildTestPrint(name: string, iface: string, categoryIds: number[], printer: ThermalPrinter): void {
  const categoryNames = categoryIds
    .map(id => categories.find(c => c.id === id)?.name)
    .filter(Boolean)
    .join(', ');

  printer.drawLine();
  printer.alignCenter();
  printer.setTextDoubleHeight();
  printer.bold(true);
  printer.println('TESTDRUCK');
  printer.bold(false);
  printer.setTextNormal();
  printer.newLine();
  printer.alignLeft();
  printer.println(`Drucker: ${ name }`);
  printer.println(`Schnittstelle: ${ iface }`);
  printer.println(`Kategorien: ${ categoryNames || '(keine)' }`);
  printer.println(`Datum: ${ formatDate(Date.now()) }`);
  printer.newLine();
  printer.println('Umlaute: äöü ÄÖÜ ß  Euro: €');
  printer.newLine();
  printer.alignCenter();
  printer.println('Der Drucker funktioniert.');
  printer.alignLeft();
  printer.drawLine();
}

// ---------------------------------------------------------------------
// payment receipt ("Zahlungsbestätigung") – NOT an invoice
// ---------------------------------------------------------------------

const RECEIPT_WIDTH = 48;
const eurFormatter = new Intl.NumberFormat('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });

function formatEur(value: number): string {
  return `${ eurFormatter.format(Math.round(value * 100) / 100) } €`;
}

/** left text (truncated if needed) and right text on one line */
function leftRight(left: string, right: string): string {
  const space = RECEIPT_WIDTH - right.length - 1;
  const text = left.length > space ? left.slice(0, space - 1) + '.' : left;
  return text.padEnd(space) + ' ' + right;
}

function buildPaymentReceipt(id: number, receipt: ReceiptPayload, printer: ThermalPrinter): void {
  printer.drawLine();
  printer.alignCenter();
  printer.setTextDoubleHeight();
  printer.bold(true);
  printer.println('ZAHLUNGSBESTÄTIGUNG');
  printer.bold(false);
  printer.setTextNormal();
  printer.println(`Beleg-Nr. ${ id }`);
  printer.alignLeft();
  printer.newLine();

  printer.println(`Datum:   ${ formatDate(receipt.timestamp) }`);
  printer.println(receipt.table === null ? 'Direktverkauf' : `Tisch:   ${ receipt.table }`);
  if (receipt.waiter) printer.println(`Kellner: ${ receipt.waiter }`);
  if (receipt.recipient) printer.println(`Für:     ${ receipt.recipient }`);

  printer.println('-'.repeat(RECEIPT_WIDTH));

  receipt.lines.forEach(line => {
    printer.println(leftRight(`${ line.amount }x ${ line.name }`, formatEur(line.price * line.amount)));
    if (line.amount > 1) printer.println(`   à ${ formatEur(line.price) }`);
  });

  printer.println('-'.repeat(RECEIPT_WIDTH));
  printer.bold(true);
  printer.println(leftRight('SUMME', formatEur(receipt.total)));
  printer.bold(false);

  if (receipt.received !== null && receipt.received >= receipt.total) {
    printer.println(leftRight('Bar erhalten', formatEur(receipt.received)));
    printer.println(leftRight('Rückgeld', formatEur(receipt.received - receipt.total)));
  } else {
    printer.println('Bar bezahlt');
  }

  printer.drawLine();
  printer.alignCenter();
  printer.println('Keine Rechnung im Sinne des UStG.');
  printer.println('Interner Zahlungsnachweis.');
  printer.alignLeft();
  printer.drawLine();
}

// ---------------------------------------------------------------------
// realtime
// ---------------------------------------------------------------------

let realtimeHealthy = false;
let workChannel: RealtimeChannel | null = null;
let resubscribeTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * New orders and print jobs arrive via realtime. Every (re)subscribe triggers
 * a catch-up fetch, so nothing inserted while the socket was down is missed.
 */
function subscribeWork(): void {
  workChannel = supabase.channel('printer-work')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'orders', filter: 'printed=eq.false' },
      (payload) => {
        const order = payload.new as OrderDTO;

        if (order) {
          void handleOrder(mapOrderDTO(order));
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'print_job' },
      (payload) => void handlePrintJob(payload.new as PrintJob)
    )
    .subscribe((status, error) => {
      if (status === 'SUBSCRIBED') {
        const wasDown = !realtimeHealthy;

        realtimeHealthy = true;
        LOG.info('realtime connected');

        // (re)connected: fetch what arrived while we were not listening
        if (wasDown) catchUp('realtime connected');
        return;
      }

      realtimeHealthy = false;
      LOG.warn(`realtime ${ status }${ error ? ' ' + error.message : '' } – polling every ${ DEGRADED_POLL_INTERVAL / 1000 }s`);

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        if (resubscribeTimer) clearTimeout(resubscribeTimer);
        resubscribeTimer = setTimeout(() => {
          if (realtimeHealthy) return;

          const old = workChannel;
          workChannel = null;
          void (old ? supabase.removeChannel(old) : Promise.resolve()).then(subscribeWork);
        }, RESUBSCRIBE_DELAY);
      }
    });
}

subscribeWork();

supabase.channel('realtime-products')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'product' }, () => void initData('product'))
  .subscribe();

supabase.channel('realtime-categories')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'category' }, () => {
    void initData('category').then(() => initData('product'));
  })
  .subscribe();

supabase.channel('realtime-tables')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => void initData('tables'))
  .subscribe();

supabase.channel('realtime-infrastructure')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'infrastructure' }, (payload) => {
    // our own lastPing updates must not trigger a reload every 10 seconds
    const row = payload.new as { id: number; printer: number; categories: number[] | null };
    const cached = infrastructure.find(i => i.infrastructureId === row?.id);
    const changed = payload.eventType !== 'UPDATE'
      || !cached
      || cached.deviceId !== row.printer
      || JSON.stringify([ ...cached.categories ].sort()) !== JSON.stringify([ ...(row.categories ?? []) ].sort());

    if (changed) void initData('infrastructure');
  })
  .subscribe();

supabase.channel('realtime-devices')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'device' }, () => {
    void initData('device').then(() => initData('infrastructure'));
  })
  .subscribe();
