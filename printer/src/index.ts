import { database } from 'firebase-admin';
import { Order } from './models/models';
import DataSnapshot = database.DataSnapshot;

const admin = require('firebase-admin');
const serviceAccount = require('./firebase-api-key.json');
const printer = require('@thiagoelg/node-printer/lib');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://order-sprinter.firebaseio.com'
});

const db = admin.database();
const ref = db.ref('orders');

const printedReceipts: number[] = [];

ref.on('child_added', (snapshot: DataSnapshot) => {
  const order = snapshot.val();

  printReceipt(order);
  printedReceipts.push(order.id);
});

function printReceipt(order: Order): void {
  if (!printedReceipts.includes(order.id)) {
    printer.printDirect({
      data: buildReceiptData(order),
      printer: 'BIXOLON SRP-350III',
      type: 'RAW',
      success: function (jobID: number) {
        console.log('sent to printer with ID: ' + jobID);
      },
      error: function (err: Error) {
        console.log(err);
      }
    });
  }
}

function buildReceiptData(order: Order): string {
  let data = '';

  data += '*****************************************\n';
  data += `Tisch: ${ order.table.nr }\n`;
  data += `Datum: ${ formatDate(order.timestamp) }\n`;
  data += `Besteller: ${ order.waiter }\n\n`;

  if (order.drinks) {
    for (const drink of order.drinks) {
      data += `${ drink.amount } ${ drink.name }\n`;
    }
  }

  if (order.food) {
    for (const food of order.food) {
      data += `${ food.amount } ${ food.name }\n`;
    }
  }

  data += '*****************************************\n\n\n\n\n\n\n\n\n\n';

  return data;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);

  return date.toLocaleString();
}
