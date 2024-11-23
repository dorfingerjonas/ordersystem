import admin, { database } from 'firebase-admin';
import { Order } from './models/models';
import { config, PrinterConfig, printerKuecheConfig } from './config';
import { CharacterSet, PrinterTypes, ThermalPrinter } from 'node-thermal-printer';
import { firebaseServiceAccount } from './firebase-api-key';
import DataSnapshot = database.DataSnapshot;

admin.initializeApp({
    credential: admin.credential.cert(firebaseServiceAccount),
    databaseURL: 'https://order-sprinter.firebaseio.com/'
});

const db = admin.database();
const pendingOrdersRef = db.ref('pending-orders');

let printerAusschank: ThermalPrinter | null = null;
let printerKueche: ThermalPrinter | null = null;

function printPendingOrders(): void {
    pendingOrdersRef.get().then((data: DataSnapshot) => {
        const value = data.val();

        if (value) {
            data.forEach(a => {
                handleOrder(a.val() as Order, a.key);
            });
        }
    });
}

connectPrinter(config).then(device => {
    if (device) {
        printPendingOrders();
        printerAusschank = device;
    }
});

connectPrinter(printerKuecheConfig).then(device => {
    if (device) {
        printPendingOrders();
        printerKueche = device;
    }
});

async function handleOrder(order: Order, key: string | null): Promise<void> {
    if (!order) return;

    if (order.drinks && order.drinks.length > 0) {
        if (printerAusschank && (await printerAusschank.isPrinterConnected())) {
            printReceipt({ ...order, food: [] }, key, printerAusschank);
        }
    }

    if (order.food && order.food.length > 0) {
        if (printerKueche && (await printerKueche.isPrinterConnected())) {
            printReceipt({ ...order, drinks: [] }, key, printerKueche);
        }
    }

}

pendingOrdersRef.on('child_added', (snapshot: DataSnapshot) => {
    const order: Order = snapshot.val();

    handleOrder(order, snapshot.key);
});

function connectPrinter(config: PrinterConfig): Promise<any | null> {
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

async function printReceipt(order: Order, key: string | null, printer: ThermalPrinter): Promise<void> {
    buildReceiptData(order, printer);
    printer.cut();

    const executeRes = await printer.execute({ waitForResponse: true });

    printer.clear();

    console.log(executeRes);

    const val = (await db.ref(`completed-orders/${ order.table.nr }`).get()).val();

    const currentOrders: any[] = [];

    if (val) {
        for (const valElement of val as any[]) {
            currentOrders.push(valElement);
        }
    }

    [ ...order.food, ...order.drinks ].forEach(item => {
        for (let i = 0; i < (item.amount || 0); i++) {
            const orderId = Date.now();

            currentOrders.push({
                itemId: item.id,
                amount: 1,
                paid: false,
                orderId
            });
        }
    });

    await db.ref(`completed-orders/${ order.table.nr }/`).set(currentOrders);

    if (key) {
        await pendingOrdersRef.child(key).remove();
    }
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

    if (order.drinks) {
        order.drinks.forEach(drink => printer!.println(`${ drink.amount }x ${ drink.name }`));
    }

    if (order.food) {
        order.food.forEach(food => printer!.println(`${ food.amount }x ${ food.name }`));
    }

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
