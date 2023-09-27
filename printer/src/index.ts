import { database } from 'firebase-admin';
import { Order } from './models/models';
import DataSnapshot = database.DataSnapshot;

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-api-key.json');
const ThermalPrinter = require('node-thermal-printer').printer;
const PrinterTypes = require('node-thermal-printer').types;

const printer = new ThermalPrinter({
    type: PrinterTypes.STAR,
    interface: 'printer:Star TSP100 Cutter (TSP143)',
    removeSpecialCharacters: false,
    lineCharacter: '*',
    width: 48,
    driver: require('printer')
});

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://order-sprinter.firebaseio.com/'
});

const db = admin.database();
const ref = db.ref('orders');

printer.isPrinterConnected().then((isConnected: boolean) => {
    if (isConnected) {
        console.log('Printer "Star TSP100 Cutter (TSP143)" connected');
    } else {
        console.log('Printer "Star TSP100 Cutter (TSP143)" is not connected');
    }
});

ref.on('child_added', (snapshot: DataSnapshot) => {
    printReceipt(snapshot.val()).then(res => {
        printer.clear();
        console.log(res);

        db.ref('printed-orders').push(snapshot.val()).then(() => {
            ref.child(snapshot.key).remove();
        });
    }).catch(err => {
        console.log(err);
    });
});

function printReceipt(order: Order): Promise<string> {
    buildReceiptData(order);
    printer.cut();
    return printer.execute();
}

function buildReceiptData(order: Order): void {
    printer.drawLine();
    printer.newLine();

    printer.println(`Tisch: ${ order.table.nr }`);
    printer.println(`Datum: ${ formatDate(order.timestamp) }`);
    printer.println(`Besteller: ${ order.waiter }`);

    printer.newLine();

    if (order.drinks) {
        order.drinks.forEach(drink => printer.println(`${ drink.amount } ${ drink.name }`));
    }

    if (order.food) {
        order.food.forEach(food => printer.println(`${ food.amount } ${ food.name }`));
    }

    printer.newLine();
    printer.drawLine();
}

function formatDate(timestamp: number): string {
    return new Date(timestamp)
        .toLocaleString()
        .replace(/\//gm, '.');
}
