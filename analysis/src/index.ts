import serviceAccount from './firebase-api-key.json';

import admin from 'firebase-admin';
import { Drink, Order } from './models/models';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as never),
  databaseURL: 'https://order-sprinter.firebaseio.com/'
});

const db = admin.database();
const ref = db.ref('completed-orders');

ref.on('value', (snapshot) => {
  const orders: Order[] = [];

  for (const key in snapshot.val()) {
    const order = snapshot.val()[key];
    orders.push(order);
  }

  const drinks: Drink[] = [];

  orders
    .map(order => order.drinks)
    .forEach(array => {
      if (array) {
        drinks.push(...array);
      }
    });

  const groupedArray: Drink[] = [];

  drinks.forEach(drink => {
    const index = groupedArray.findIndex(d => d.name === drink.name);

    if (index > 0) {
      groupedArray[index].amount += drink?.amount;
    } else {
      groupedArray.push(drink);
    }
  });

  groupedArray
    .sort((a, b) => b.amount - a.amount)
    .forEach(drink => console.log(`${ drink.amount } x ${ drink.name } => ${ drink.price * drink.amount }€`));
});
