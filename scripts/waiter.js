window.addEventListener('load', () => {
  const firebaseConfig = {
      apiKey: 'AIzaSyAfbZejjjfNF-8A9mUqesRO9xLYGXSj7zo',
      authDomain: 'order-sprinter.firebaseapp.com',
      databaseURL: 'https://order-sprinter.firebaseio.com',
      projectId: 'order-sprinter',
      storageBucket: '',
      messagingSenderId: '295337076444',
      appId: '1:295337076444:web:3e0c381bca0712be'
    };
    
  firebase.initializeApp(firebaseConfig);

  initDrinks();
  initTableSelection();

  const loginBtn = document.getElementById('logInBtn');
  const logInScreen = document.getElementById('logInScreen');
  const nav = document.getElementById('nav');
  const back = document.getElementById('back');
  const signOut = document.getElementById('signOut');
  const home = document.getElementById('home');
  const list = document.getElementById('list');
  const tableSelection = document.getElementById('tableSelection');
  const waiterScreen = document.getElementById('waiterScreen');
  const shoppingCart = document.getElementById('shoppingCart'); 

  loginBtn.addEventListener('click', () => {
    const userame = document.getElementById('username');
    const password = document.getElementById('password');
    const loginfdb = document.getElementById('loginfdb');
    let isValid = '';

    username.value = username.value.toLowerCase();

    if (username.value !== 'admin' && username.value !== 'bar') {
      if (username.value === '') {
        loginfdb.textContent = 'Es darf kein Feld leer bleiben.'
        isValid += false;
        activateUsernameError(username);
      } else {
        deactivateUsernameError(username);
      }
        
      if (password.value === '') {
        loginfdb.textContent = 'Es darf kein Feld leer bleiben.'
        isValid += false;
        activateUsernameError(password);
      } else {
          deactivateUsernameError(password);
      }

      if (username.value === '' && password.value === '') {
        loginfdb.textContent = 'Es dürfen keine Felder leer bleiben.'
        isValid += false;
        activateUsernameError(username);
        activateUsernameError(password);
      } else if (!loginfdb.textContent.includes('darf')) {
        deactivateUsernameError(username);
        deactivateUsernameError(password);            
      }

      function activateUsernameError(name) {
          name.style.borderBottom = 'red 1.5px solid';
          name.removeEventListener('focus', () => {
              name.style.borderBottom = '#00000080 1.5px solid';
          });
      }

      function deactivateUsernameError(name) {
          name.style.borderBottom = 'lightgray 1.5px solid';
          name.addEventListener('focus', () => {
              name.style.borderBottom = '#00000080 1.5px solid';
          });
  
          name.addEventListener('blur', () => {
              name.style.borderBottom = 'lightgray 1.5px solid';
          });
      }

      if (!isValid.includes('false')) {
        const email = `${username.value.toLowerCase()}@mail.com`;
    
        const promise = firebase.auth().signInWithEmailAndPassword(email, password.value);

        promise.then(() => {
          console.log('success');
  
          let boxes = [
            tableSelection,
            signOut
          ];
  
          for (const box of boxes) {
            box.classList.remove('hide');
            box.style.display = 'flex';
          }

          logInScreen.classList.add('hide');
          back.classList.add('hide');
          
          userame.value = '';   
          password.value = '';
          loginfdb.innerHTML = '&nbsp;';
        });

        promise.catch((error) => {
          let usernameInvalid = false;
          let pwInvalid = false;
          const errorMsg = error.message;
      
          const messages = [
            'The password is invalid or the user does not have a password.',
            'The email address is badly formatted.',
            'Too many unsuccessful login attempts.  Please include reCaptcha verification or try again later',
            'There is no user record corresponding to this identifier. The user may have been deleted.',
            'A network error (such as timeout, interrupted connection or unreachable host) has occurred.'
          ];

          if (errorMsg === messages[0]) {
            loginfdb.textContent = 'Das eingegebene Passwort ist ungültig.';
            pwInvalid = true;
          }
  
          if (errorMsg === messages[1]) {
            loginfdb.textContent = 'Der eingegebene Benutzername ist ungültig.';
            usernameInvalid = true;
          }
  
          if (errorMsg === messages[2]) {
            loginfdb.textContent = 'Der Anmelde Vorgang ist zu oft fehlgeschlagen, versuchen Sie es später ernuet.';
          }
  
          if (errorMsg === messages[3]) {
            loginfdb.textContent = 'Es wurde kein Account mit dem eingegebenen Benutzernamen gefunden.';
            usernameInvalid = true;
          }
  
          if (errorMsg === messages[4]) {
            loginfdb.textContent = 'Zeitüberschreitung beim Anmelden. Versuche Sie es später erneut.'
          }
                      
          if (usernameInvalid) {
            username.style.borderBottom = 'red 1.5px solid';
            username.removeEventListener('focus', () => {
                username.style.borderBottom = '#00000080 1.5px solid';
            });
          } else {
            username.style.borderBottom = 'lightgray 1.5px solid';
            username.addEventListener('focus', () => {
                username.style.borderBottom = '#00000080 1.5px solid';
            });
    
            username.addEventListener('blur', () => {
                username.style.borderBottom = 'lightgray 1.5px solid';
            });
          }
      
          if (pwInvalid) {
            password.style.borderBottom = 'red 1.5px solid';
            password.removeEventListener('focus', () => {
            password.style.borderBottom = 'lightgray 1.5px solid';
            });
          } else {
            password.style.borderBottom = 'lightgray 1.5px solid';
            password.addEventListener('focus', () => {
            password.style.borderBottom = '#00000080 1.5px solid';
            });
    
            password.addEventListener('blur', () => {
            password.style.borderBottom = 'lightgray 1.5px solid';
            });
          }
        });
      }
    } else {
      loginfdb.textContent = 'Sie können sich hier nur mit einem Kellner Account anmelden.' 
    }
  });

  back.addEventListener('click', () => {
    window.location.href = '../index.html';
  });

  signOut.addEventListener('click', () => {
      firebase.auth().signOut();
      window.location.href = '../index.html'
  });

  home.addEventListener('click', () => {

    hideAll();
        
    let boxes = [
      tableSelection,
      signOut
    ];

    for (const box of boxes) {
      box.classList.remove('hide');
      box.style.display = 'flex';
    }

    logInScreen.classList.add('hide');
    back.classList.add('hide');
  });

  list.addEventListener('click', () => {
    hideAll();
        
    let boxes = [
      shoppingCart
    ];

    for (const box of boxes) {
      box.classList.remove('hide');
      box.style.display = 'flex';
    }
  });

  function hideAll() {
    const elements = [
      logInScreen,
      waiterScreen,
      tableSelection,
      shoppingCart
    ];

    for (const element of elements) {
      element.classList.add('hide');
      element.style.display = 'none';
    }
  }

  function initDrinks() {
    firebase.database().ref('public/drinks/').once('value').then((snapshot) => {
      const drinks = snapshot.val();

      for (const drink of drinks) {
        drink.howMany = 0;
      }

      printDrinks(drinks);

      function printDrinks(drinks) {
        for (let i = 0; i < drinks.length; i++) {
          let contentwrapper;
  
          if (drinks[i].anti) {
            contentwrapper = document.getElementById('antiWrapper');
          } else {
            contentwrapper = document.getElementById('alkWrapper');
          }
          
          const newDrink = document.createElement('div');
    
          let name = drinks[i].name;
          let price = drinks[i].price;
          let counter = 0;
    
          let nameElm = document.createElement('p');
          let priceElm = document.createElement('p');
          let counterElm = document.createElement('p');
          let minus = document.createElement('i'); 
    
          nameElm.textContent = name;
          priceElm.textContent = `${price}€`;
          priceElm.textContent = priceElm.textContent.replace('.', ',');
          counterElm.textContent = `${counter}x`;
          counterElm.setAttribute('id', `${i}Counter`);
          minus.setAttribute('class', 'fas fa-minus minus');
    
          newDrink.setAttribute('class', 'drink');
    
          minus.addEventListener('click', () => {
            counter = document.getElementById(`${i}Counter`);
    
            if (parseInt(counter.textContent) > 0) {
              let number = parseInt(counter.textContent);
              number--;
              counter.textContent = `${number}x`;
    
              document.getElementById('list').classList.toggle('elementAdded');

              changeNumberOfOrders(name, false);
    
              setTimeout(() => {
                document.getElementById('list').classList.toggle('elementAdded');
              }, 150);
            }
          });
    
          const children = [
            counterElm,
            nameElm,
            priceElm,
            minus,
          ];
    
          for (let j = 0; j < children.length; j++) {
            let box = document.createElement('div');
            box.setAttribute('class', `wrapper${j}`);
            box.appendChild(children[j]);
            newDrink.appendChild(box);
          }
    
          newDrink.addEventListener('click', (event) => {
    
            if (event.toElement.localName !== 'i') {
              document.getElementById('list').classList.toggle('elementAdded');
    
              counter = document.getElementById(`${i}Counter`);
              let number = parseInt(counter.textContent.substring(0, counter.textContent.length - 1)) + 1;
              counter.textContent = `${number}x`;

              changeNumberOfOrders(name, true);
    
              setTimeout(() => {
                document.getElementById('list').classList.toggle('elementAdded');
              }, 150);
            }

            printDrinksToShoppingCart([drinks[i]]);
          });
    
          contentwrapper.appendChild(newDrink);
        }
      }

      function changeNumberOfOrders(name, add) {
        for (const drink of drinks) {
          if (drink.name === name) {
            if (add) {
              drink.howMany++;
            } else {
              drink.howMany--;
            }
          }
        }
      }

      sendOrder.addEventListener('click', () => {
        const selectedElms = [];

        for (const drink of drinks) {
          if (drink.howMany !== 0) {
            selectedElms.push(drink);
          }
        }

        if (selectedElms.length === 0) {
          console.log('no items selected. select some to continue.');
        } else {

          const localDate = new Date();
          const timestamp = localDate.getTime();
          const tablenumber = sessionStorage.getItem('tablenumber');
          const note = document.getElementById('note');

          firebase.database().ref('public/tables/' + tablenumber + '/orders').once('value').then((snapshot) => {

            let orders = [];

            if (snapshot.val() !== null) {
              orders = snapshot.val();

              for (const order of orders) {
                for (const elm of selectedElms) {
                  if (order.name === elm.name) {
                    order.howMany += elm.howMany
                  }
                }
              }
            } else {
              for (const element of selectedElms) {
                orders.push(element);
              }
            }

            console.log(note.value);

            home.click();

            if (note.value === '') {
              firebase.database().ref('public/orders/' + timestamp).set({
                timestamp: timestamp,
                tablenumber: tablenumber,
                drinks: selectedElms
              });

              firebase.database().ref('public/tables/' + tablenumber).update({
                orders
              });
              console.log(true);
              
            } else {
              console.log(false);
              firebase.database().ref('public/orders/' + timestamp).set({
                timestamp: timestamp,
                tablenumber: tablenumber,
                drinks: selectedElms,
                note: note.value
              });

              firebase.database().ref('public/tables/' + tablenumber).update({
                note: note.value,
                orders
              });
            }
          });
        }
      });
    });

    let sendMessage = document.createElement('div');
    let msg = document.createElement('i');
    msg.setAttribute('class', 'far fa-comment-alt');
    msg.setAttribute('id', 'sendMessageMsg');

    let disable = document.createElement('i');
    disable.setAttribute('class', 'fas fa-times');
    disable.setAttribute('id', 'sendMessageX');

    document.getElementById('noteBtn').addEventListener('click', () => {
      sendMessage.click();
    });
    
    sendMessage.addEventListener('click', () => {
      const noteWindow = document.getElementById('noteWindow');

      if (msg.className.includes('hide')) {
        disable.style.color = 'cornflowerblue';
        setTimeout(() => {
          disable.classList.toggle('hide');
          msg.style.color = 'cornflowerblue';
          msg.classList.toggle('hide');
          noteWindow.classList.toggle('hideNoteWindow');

          setTimeout(() => {
            msg.style.color = 'white';
          }, 500);
        }, 500);
      } else {
        noteWindow.classList.toggle('hideNoteWindow');

        msg.style.color = 'cornflowerblue';
        setTimeout(() => {
          msg.classList.toggle('hide');
          disable.style.color = 'cornflowerblue';
          disable.classList.toggle('hide');
  
          setTimeout(() => {
            disable.style.color = 'white';
          }, 500);
        }, 500);
      }

      console.log('clicked');
    });

    disable.classList.toggle('hide');
            
    sendMessage.appendChild(msg);
    sendMessage.appendChild(disable);

    document.getElementById('waiterScreen').appendChild(sendMessage);

    let sendOrder = document.createElement('div');
    let start = document.createElement('i');
    start.setAttribute('class', 'fas fa-check');
    start.setAttribute('id', 'startOrder');
    
    sendOrder.addEventListener('click', () => {
      let i = 0;

      start.style.color = '#82c51b';

      setTimeout(() => {
        start.style.color = 'white';
      }, 500);
    });
            
    sendOrder.appendChild(start);

    document.getElementById('waiterScreen').appendChild(sendOrder);
  }

  function initTableSelection() {
    const contentwrapper = document.getElementById('tableSelectionWrapper');
    const tableNumber = document.getElementById('tableNumber');

    firebase.database().ref('public/tables').once('value').then((snapshot) => {
      const tables = [];

      for (const i in snapshot.val()) {
        tables.push(snapshot.val()[i]);
      }

      for (let i = 0; i < tables.length; i++) {
        const newTable = document.createElement('div');

        const text = document.createElement('p');
        text.textContent = tables[i].number;

        newTable.appendChild(text);

        newTable.setAttribute('class', 'selectionTable');

        newTable.addEventListener('click', () => {
          console.log('table selected: ' + tables[i].number);

          hideAll();

          let boxes = [
            waiterScreen,
            home,
            list
          ];
  
          for (const box of boxes) {
            box.classList.remove('hide');
            box.style.display = 'flex';
          }

          sessionStorage.setItem('tablenumber', tables[i].number);

          tableNumber.textContent = `Tisch Nr.: ${tables[i].number}`;
        });

        contentwrapper.appendChild(newTable);
      }
    });
  }

  function printDrinksToShoppingCart(drinks) {
    console.log('lololololololololololol');
    
    const contentwrapper = document.getElementById('shoppingWrapper');

    console.log(drinks);
    

    for (let i = 0; i < drinks.length; i++) {      
      const newDrink = document.createElement('div');

      let name = drinks[i].name;
      let price = drinks[i].price;
      let counter = 0;

      let nameElm = document.createElement('p');
      let priceElm = document.createElement('p');
      let counterElm = document.createElement('p');
      let minus = document.createElement('i'); 

      nameElm.textContent = name;
      priceElm.textContent = `${price}€`;
      priceElm.textContent = priceElm.textContent.replace('.', ',');
      counterElm.textContent = `${counter}x`;
      counterElm.setAttribute('id', `${i}Counter`);
      minus.setAttribute('class', 'fas fa-minus minus');

      newDrink.setAttribute('class', 'drink');

      minus.addEventListener('click', () => {
        counter = document.getElementById(`${i}Counter`);

        if (parseInt(counter.textContent) > 0) {
          let number = parseInt(counter.textContent);
          number--;
          counter.textContent = `${number}x`;

          document.getElementById('list').classList.toggle('elementAdded');

          changeNumberOfOrders(name, false);

          setTimeout(() => {
            document.getElementById('list').classList.toggle('elementAdded');
          }, 150);
        }
      });

      const children = [
        counterElm,
        nameElm,
        priceElm,
        minus,
      ];

      for (let j = 0; j < children.length; j++) {
        let box = document.createElement('div');
        box.setAttribute('class', `wrapper${j}`);
        box.appendChild(children[j]);
        newDrink.appendChild(box);
      }

      newDrink.addEventListener('click', (event) => {

        if (event.toElement.localName !== 'i') {
          document.getElementById('list').classList.toggle('elementAdded');

          counter = document.getElementById(`${i}Counter`);
          let number = parseInt(counter.textContent.substring(0, counter.textContent.length - 1)) + 1;
          counter.textContent = `${number}x`;

          changeNumberOfOrders(name, true);

          setTimeout(() => {
            document.getElementById('list').classList.toggle('elementAdded');
          }, 150);
        }
      });

      contentwrapper.appendChild(newDrink);      
    }
  }
});