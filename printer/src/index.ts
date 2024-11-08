import admin, { database } from 'firebase-admin';
import { Order } from './models/models';
import { config } from './config';
import { CharacterSet, PrinterTypes, ThermalPrinter } from 'node-thermal-printer';
import { firebaseServiceAccount } from './firebase-api-key';
import * as os from 'os';
import DataSnapshot = database.DataSnapshot;

admin.initializeApp({
    credential: admin.credential.cert(firebaseServiceAccount),
    databaseURL: 'https://order-sprinter.firebaseio.com/'
});

const db = admin.database();
const pendingOrdersRef = db.ref('pending-orders');

let scriptRunning = true;

db.ref(`status/${ config.path }`).set({
    scriptRunning,
    name: config.name
});

let printer: ThermalPrinter | null = null;

setInterval(async () => {
    await db.ref(`status/${ config.path }`).update({
        scriptRunning,
        printerConnected: await (printer?.isPrinterConnected() || false),
        ip: getIPAddress()
    });
}, config.controlInterval * 1000);

function printPendingOrders(): void {
    pendingOrdersRef.get().then((data: DataSnapshot) => {
        const value = data.val();

        if (value) {
            data.forEach(a => {
                printReceipt(a.val() as Order, a.key);
            });
        }
    });
}

connectPrinter().then(device => {
    if (device) {
        printPendingOrders();
        printer = device;
    }
});

pendingOrdersRef.on('child_added', (snapshot: DataSnapshot) => {
    const order: Order = snapshot.val();

    printReceipt(order, snapshot.key);
});

function connectPrinter(): Promise<any | null> {
    return new Promise<any | null>((resolve, reject) => {
        const printer = new ThermalPrinter({
            type: PrinterTypes.STAR,
            interface: `printer:${ config.printerName }`,
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

async function printReceipt(order: Order, key: string | null): Promise<void> {
    if (!printer) return;
    if (!(await printer.isPrinterConnected())) return;

    if (config.path === 'drinks') {
        order.food = [];
        if (!order.drinks) return;
    } else if (config.path === 'food') {
        order.drinks = [];
        if (!order.food) return;
    }

    buildReceiptData(order);
    printer.cut();

    const executeRes = await printer.execute({ waitForResponse: true });

    printer.clear();
    console.log(executeRes);

    db.ref(`completed-orders/${ order.table.nr }`).push(order).then(() => {
        if (key) {
            pendingOrdersRef.child(key).remove();
        }
    });
}

function buildReceiptData(order: Order): void {
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

    if (order.drinks) {
        order.drinks.forEach(drink => printer!.println(`${ drink.amount }x ${ drink.name }`));
    }

    if (order.food) {
        order.food.forEach(food => printer!.println(`${ food.amount }x ${ food.name }`));
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

function getIPAddress(): string | undefined {
    const networkInterfaces = os.networkInterfaces();

    for (const interfaceName in networkInterfaces) {
        const interfaceInfo = networkInterfaces[interfaceName];

        if (interfaceInfo) {
            for (const info of interfaceInfo) {
                if (info.family === 'IPv4' && !info.internal) {
                    return info.address;
                }
            }
        }
    }

    return undefined;
}