import { Device, Order, OrderDTO, Product, Table } from './models/models';
import { InfrastructureConfigDTO, PrinterConfig } from './config';
import { CharacterSet, ThermalPrinter } from 'node-thermal-printer';

import { createClient } from '@supabase/supabase-js';
import { environment } from './environment';
import { Logger } from './helpers/logger';

const supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
const products: Product[] = [];
const tables: Table[] = [];
const devices: Device[] = [];
const LOG = new Logger('ordersystem');
const infrastructure: PrinterConfig[] = [];

(async () => {
  await initData('tables');
  await initData('product');
  await initData('infrastructure');
  await initData('device');

  getOutstandingOrders();

  setInterval(() => {
    getOutstandingOrders();
  }, 10 * 1000);

  const serverDevice = devices.find(device => device.deviceType === 'SERVER');

  if (serverDevice) {
    LOG.info(`starting service status (${ serverDevice.controlInterval }s)`);
    setInterval(async () => {
      await supabase.from('status').upsert({ status: 'running', device: serverDevice.id, timestamp: Date.now() });
      LOG.info('Server status updated');
    }, serverDevice.controlInterval * 1000);
  }
})();

function getOutstandingOrders(): void {
  supabase.from('orders').select('*, table:tables(*)').eq('printed', false).then(({ data }) => {
    if (data) {
      LOG.info(`outstanding orders: ${ data.length }`);
      data.forEach(order => {
        order.products = order.products.map((p: {
          id: number,
          amount: number
        }) => {

          return {
            ...products.find(product => product.id === p.id),
            amount: p.amount
          } as Product;
        });

        handleOrder(order);
      });
    }
  });
}

function initData(type: 'product' | 'tables' | 'infrastructure' | 'device'): Promise<void> {
  return new Promise((resolve, reject) => {
    if (type === 'product') {
      supabase.from('product').select('*, category:category(*)').then(({ data }) => {
        if (data) {
          products.push(...data as Product[]);
          LOG.info('updated products');
          resolve();
        } else {
          LOG.error('Error fetching products');
          resolve();
        }
      });
    } else if (type === 'tables') {
      supabase.from('tables').select('*').then(({ data }) => {
        if (data) {
          tables.push(...data as Table[]);
          LOG.info('updated tables');
          resolve();
        } else {
          LOG.error('Error fetching tables');
          resolve();
        }
      });
    } else if (type === 'infrastructure') {
      supabase.from('infrastructure').select('*, printer:device(*)').then(({ data }) => {
        if (data) {
          infrastructure.length = 0;

          data = data.map((d: InfrastructureConfigDTO) => {
            return {
              categories: d.categories,
              interface: d.printer.interface,
              printerType: d.printer.type,
              printerName: d.printer.name,
              name: d.printer.name,
              controlInterval: d.printer.controlInterval
            } as PrinterConfig;
          });

          infrastructure.push(...data as PrinterConfig[]);
          LOG.info('updated infrastructure');
          resolve();
        } else {
          LOG.error('Error fetching infrastructure');
          resolve();
        }
      });
    } else if (type === 'device') {
      supabase.from('device').select('*').then(({ data }) => {
        if (data) {
          LOG.info('updated devices');
          devices.length = 0;
          devices.push(...data as Device[]);
          resolve();
        } else {
          LOG.error('Error fetching devices');
          resolve();
        }
      });
    }
  });
}

function handleOrder(order: Order) {
  if (order.printed) return;

  infrastructure.forEach(async config => {
    connectPrinter(config).then(printer => {
      if (printer) {
        const drinks = order.products.filter(product => product.category.name.toLowerCase().includes('alk'));
        const food = order.products.filter(product => product.category.name.toLowerCase().includes('spei'));

        if (drinks.length > 0) {
          printReceipt({ ...order, products: drinks }, printer, 'AUSSCHANK').then(() => {
            // set printed to true
            supabase.from('orders').update({ printed: true }).eq('id', order.id).then(() => {
            });
          });
        }

        if (food.length > 0) {
          printReceipt({ ...order, products: food }, printer, 'KÜCHE').then(() => {
            // set printed to true
            supabase.from('orders').update({ printed: true }).eq('id', order.id).then(() => {
            });
          });
        }
      }
    }).catch(err => {
      console.log(err);
      LOG.error('Error connecting to printer ' + config.printerName);
    });
  });
}

function mapOrderDTO(orderDTO: OrderDTO): Order {
  return {
    ...orderDTO,
    products: orderDTO.products
      .map(p => ({ ...products.find(product => product.id === p.id), amount: p.amount }))
      .filter(p => p !== undefined && p.amount > 0) as Product[],
    table: tables.find(table => table.id === orderDTO.table) as Table,
    timestamp: new Date(orderDTO.timestamp).getTime()
  };
}

supabase.channel('realtime-orders')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'orders', filter: 'printed=eq.false' },
    (payload) => {
      const order = payload.new as OrderDTO;

      if (order) {
        handleOrder(mapOrderDTO(order));
      }
    }
  )
  .subscribe();

supabase.channel('realtime-products')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'product' },
    (payload) => {
      initData('product');
    }
  )
  .subscribe();

supabase.channel('realtime-tables')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'tables' },
    (payload) => {
      initData('tables');
    }
  )
  .subscribe();

supabase.channel('realtime-infrastructure')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'infrastructure' },
    (payload) => {
      initData('infrastructure');
    }
  )
  .subscribe();

function connectPrinter(config: PrinterConfig): Promise<ThermalPrinter | null> {
  return new Promise<ThermalPrinter | null>((resolve, reject) => {
    const printer = new ThermalPrinter({
      type: config.printerType,
      interface: config.interface,
      removeSpecialCharacters: false,
      lineCharacter: '*',
      width: 48,
      characterSet: CharacterSet.PC858_EURO
    });

    printer.isPrinterConnected().then((isConnected: boolean) => {
      if (isConnected) {
        LOG.info(`Printer "${ config.printerName }" connected`);
        resolve(printer);
      } else {
        LOG.warn(`Printer "${ config.printerName }" is not connected`);
        reject(null);
      }
    });
  });
}

async function printReceipt(order: Order, printer: ThermalPrinter, header: string): Promise<void> {
  try {
    printer.invert(true);
    printer.setTextDoubleHeight();
    printer.println('');
    printer.alignCenter();
    printer.println(header);
    printer.println('');

    printer.println('');
    printer.setTextNormal();
    printer.alignLeft();

    buildReceiptData(order, printer);
    printer.cut();

    await printer.execute();

    printer.clear();
  } catch (error) {
    LOG.error('Error printing receipt ' + error);
  }

  return;
}

function buildReceiptData(order: Order, printer: ThermalPrinter): void {
  if (!printer) return;
  printer.drawLine();
  printer.newLine();

  printer.setTextDoubleHeight();

  printer.println(`Tisch: ${ order.table.nr }`);
  printer.setTextNormal();

  printer.println(`Datum: ${ formatDate(order.timestamp) }`);
  printer.println(`Besteller: ${ order.waiter }`);

  printer.setTextDoubleHeight();

  printer.newLine();

  order.products.forEach(product => printer!.println(`${ product.amount }x ${ product.name }`));

  if (order.note && order.note.trim().length > 0) {
    printer.newLine();
    printer.println(`Anm: ${ order.note }`);
  }

  printer.setTextNormal();
  printer.newLine();
  printer.drawLine();
}

function formatDate(timestamp: number): string {
  return new Date(timestamp)
    .toLocaleString()
    .replace(/\//gm, '.');
}
