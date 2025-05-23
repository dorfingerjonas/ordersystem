import { Order, OrderDTO, Product, Table } from './models/models';
import { InfrastructureConfigDTO, PrinterConfig } from './config';
import { CharacterSet, ThermalPrinter } from 'node-thermal-printer';

import { createClient } from '@supabase/supabase-js';
import { environment } from './environment';

const supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
const products: Product[] = [];
const tables: Table[] = [];
const infrastructure: PrinterConfig[] = [];

(async () => {
  await initData('tables');
  await initData('product');
  await initData('infrastructure');
  getOutstandingOrders();
})();

function getOutstandingOrders(): void {
  console.log('getting outstanding');
  supabase.from('orders').select('*, table:tables(*)').eq('printed', false).then(({ data }) => {
    if (data) {
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

function initData(type: 'product' | 'tables' | 'infrastructure'): Promise<void> {
  return new Promise((resolve, reject) => {
    if (type === 'product') {
      supabase.from('product').select('*, category:category(*)').then(({ data }) => {
        if (data) {
          products.push(...data as Product[]);
          console.log('updated products');
          resolve();
        } else {
          console.error('Error fetching products');
          resolve();
        }
      });
    } else if (type === 'tables') {
      supabase.from('tables').select('*').then(({ data }) => {
        if (data) {
          tables.push(...data as Table[]);
          console.log('updated tables');
          resolve();
        } else {
          console.error('Error fetching tables');
          resolve();
        }
      });
    } else if (type === 'infrastructure') {
      supabase.from('infrastructure').select('*, printer:printer(*)').then(({ data }) => {
        if (data) {
          console.log(data);
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
          console.log('infrastructure', infrastructure);
          console.log('updated infrastructure');
          resolve();
        } else {
          console.error('Error fetching infrastructure');
          resolve();
        }
      });
    }
  });
}

function handleOrder(order: Order) {
  if (order.printed) return;

  infrastructure.forEach(async config => {
    const printer = await connectPrinter(config);

    if (printer) {
      const products = order.products.filter(product => config.categories.includes(product.category.id));
      printReceipt({ ...order, products }, printer).then(() => {
        // set printed to true
        supabase.from('orders').update({ printed: true }).eq('id', order.id).then(() => {
        });
      });
    }
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
      console.log('Change received!', payload);
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
  console.log(config);
  return new Promise<ThermalPrinter | null>((resolve, reject) => {
    const printer = new ThermalPrinter({
      type: config.printerType,
      interface: config.interface,
      removeSpecialCharacters: false,
      lineCharacter: '*',
      width: 48,
      driver: require('printer'),
      characterSet: CharacterSet.PC858_EURO
    });

    printer.isPrinterConnected().then((isConnected: boolean) => {
      if (isConnected) {
        console.log(`Printer "${ config.printerName }" connected`);
        resolve(printer);
      } else {
        console.log(`Printer "${ config.printerName }" is not connected`);
        reject(null);
      }
    });
  });
}

async function printReceipt(order: Order, printer: ThermalPrinter): Promise<void> {
  try {
    buildReceiptData(order, printer);
    printer.cut();

    await printer.execute();

    printer.clear();
  } catch (error) {
    console.error('Error printing receipt', error);
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
