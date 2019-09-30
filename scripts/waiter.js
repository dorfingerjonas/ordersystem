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

  const loginBtn = document.getElementById('logInBtn');
  const logInScreen = document.getElementById('logInScreen');
  const nav = document.getElementById('nav');
  const back = document.getElementById('back');
  const back2Cash = document.getElementById('back2Cash');
  const signOut = document.getElementById('signOut');
  const home = document.getElementById('home');
  const list = document.getElementById('list');
  const menu = document.getElementById('menu');
  const cash = document.getElementById('cash');
  const pay = document.getElementById('pay');
  const tableSelection = document.getElementById('tableSelection');
  const waiterScreen = document.getElementById('waiterScreen');
  const cashScreen = document.getElementById('cashScreen');
  const cashWrapper = document.getElementById('cashWrapper');
  const shoppingCart = document.getElementById('shoppingCart');
  const resetDrinksCounterElm = document.createElement('p');
  let drinksCounter = 0;
  let foodCounter = 0;
  let isSendClicked = false;

  initTableSelection('tableSelectionWrapper');

  loginBtn.addEventListener('click', () => {
    toggleButtonClicked(loginBtn);
    activateLoading();
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
        deActivateLoading();
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
            signOut,
            cash
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

          initDrinks();
          initList();
          initCash();
          deActivateLoading();
        });

        promise.catch((error) => {
          let usernameInvalid = false;
          let pwInvalid = false;
          const errorMsg = error.message;

          deActivateLoading();
      
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
      loginfdb.textContent = 'Sie können sich hier nur mit einem Kellner Account anmelden.';
      deActivateLoading();
    }
  });

  back.addEventListener('click', () => {
    window.location.href = '../index.html';
  });

  back2Cash.addEventListener('click', () => {
    hideAll();

    const boxes = [
      cashScreen,
      document.getElementById('chooseDrinkToPay'),
      pay
    ];

    for (const box of boxes) {
      box.classList.remove('hide');
      box.style.display = 'flex';
    }

    const elms = document.getElementById('cashWrapper');

    while (elms.firstChild) elms.removeChild(elms.firstChild);
  });

  signOut.addEventListener('click', () => {
      firebase.auth().signOut();
      window.location.href = '../index.html'
  });

  home.addEventListener('click', () => {
    let orderSend = true;
    const elms = document.getElementById('waiterScreen').getElementsByClassName('drink');
    const confirmWindow = document.getElementById('confirmWindow');
    const accept = document.getElementById('acceptReturn');
    const disaccept = document.getElementById('disacceptReturn');

    for (let i = 0; i < elms.length; i++) {
      const value = document.getElementById(`${i}Counter`).textContent;
      let number = value.substring(0, value.length - 1);

      if (parseInt(number) !== 0) {
        orderSend = false;
      }
    }

    for (let i = 0; i < drinksCounter; i++) {
      document.getElementById(`${i}CashCounter`).textContent = '0x';
    }

    for (let i = 0; i < foodCounter; i++) {
      document.getElementById(`${i}CashCounterFood`).textContent = '0x';
    }      

    function closeWaiterScreen() {
      hideAll();

      confirmWindow.classList.remove('showWarningWindow');
          
      let boxes = [
        tableSelection,
        cash,
        signOut
      ];

      for (const box of boxes) {
        box.classList.remove('hide');
        box.style.display = 'flex';
      }

      boxes = [
        home,
        list,
        menu
      ];

      for (const box of boxes) {
        box.classList.add('hide');
        box.style.display = 'none';
      }

      for (let i = 0; i < elms.length; i++) {
        document.getElementById(`${i}Counter`).textContent = '0x';
      }

      resetDrinksCounterElm.click();

      const wrapperToRemove = document.getElementById('cashWrapper');

      while (wrapperToRemove.firstChild) wrapperToRemove.removeChild(wrapperToRemove.firstChild);
    }

    if (!orderSend) {
      confirmWindow.classList.add('showWarningWindow');

      accept.addEventListener('click', closeWaiterScreen)

      disaccept.addEventListener('click', () => {
        confirmWindow.classList.toggle('showWarningWindow');
      });
    } else {
      closeWaiterScreen();
    }
  });

  menu.addEventListener('click', () => {
    const startOrder = document.getElementById('startOrder')
    const sendMessageMsg = document.getElementById('sendMessageMsg')
    const sendMessageMsgX = document.getElementById('sendMessageX')

    const elements = [startOrder, sendMessageMsg, sendMessageMsgX];

    for (const elm of elements) {
      elm.classList.toggle('hideIcons');
    }
  });

  cash.addEventListener('click', () => {
    hideAll();

    let elements = [
      cashScreen,
      list,
      signOut,
      chooseDrinkToPay,
      pay
    ];

    for (const element of elements) {
      element.classList.remove('hide');
      element.style.display = 'flex';
    }

    elements = [
      cash,
      tableSelection,
      list
    ];

    for (const element of elements) {
      element.classList.add('hide');
      element.style.display = 'none';
    }
  });

  function hideAll() {
    const elements = [
      logInScreen,
      waiterScreen,
      tableSelection,
      chooseDrinkToPay,
      shoppingCart,
      cashScreen,
      pay,
      back2Cash,
      cashWrapper
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
  
          if (!drinks[i].empty) {
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
            });
      
            contentwrapper.appendChild(newDrink);
          } 
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

      resetDrinksCounterElm.addEventListener('click', () => {
         for (const drink of drinks) {
          drink.howMany = 0;
        }
      });

      sendOrder.addEventListener('click', () => {
        let selectedElms = [];

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

          let parts = firebase.auth().currentUser.email.split('@');

          const username = parts[0];

          console.log(selectedElms);

          let promise;

          if (note.value === '') {
            promise = firebase.database().ref('public/orders/uncompleted/' + timestamp).set({
              timestamp: timestamp,
              tablenumber: tablenumber,
              drinks: selectedElms,
              waiter: username
            });           
          } else {
            promise = firebase.database().ref('public/orders/uncompleted/' + timestamp).set({
              timestamp: timestamp,
              tablenumber: tablenumber,
              drinks: selectedElms,
              note: note.value,
              waiter: username
            });
          }

          promise.then(() => {
            for (let i = 0; i < drinks.length; i++) {
              drinks[i].howMany = 0;
              document.getElementById(`${i}Counter`).textContent = '0x';
            }
          });

          hideAll();

          confirmWindow.classList.remove('showWarningWindow');
              
          let boxes = [
            tableSelection,
            cash
          ];
    
          for (const box of boxes) {
            box.classList.remove('hide');
            box.style.display = 'flex';
          }

          boxes = [
            home,
            list,
            menu
          ];

          for (const box of boxes) {
            box.classList.add('hide');
            box.style.display = 'none';
          }

          let uid = firebase.auth().currentUser.uid;

          let totalPrice = 0;

          for (const item of selectedElms) {
            totalPrice += item.howMany * item.price;
          }

          firebase.database().ref(`private/user/${uid}/stats/ordersTotal`).once('value').then((snapshot) => {
            firebase.database().ref(`private/user/${uid}/stats/`).update({
              ordersTotal: parseInt(snapshot.val()) + totalPrice
            });
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
      start.style.color = '#82c51b';

      setTimeout(() => {
        start.style.color = 'white';
      }, 500);
    });
            
    sendOrder.appendChild(start);

    document.getElementById('waiterScreen').appendChild(sendOrder);
  }

  function initTableSelection(wrapper) {
    const contentwrapper = document.getElementById(wrapper);

    firebase.database().ref('public/tables').once('value').then((snapshot) => {
      const tables = [];

      for (const i in snapshot.val()) {
        tables.push(snapshot.val()[i]);
      }

      let tableWrapper = document.createElement('div');

      for (let i = 0; i < tables.length; i++) {        
        const newTable = document.createElement('div');
        const text = document.createElement('p');
        text.textContent = tables[i].number;

        newTable.appendChild(text);
        newTable.setAttribute('class', 'selectionTable');

        if (wrapper === 'tableSelectionWrapper') {
          const tableNumber = document.getElementById('tableNumberOrder');
          newTable.addEventListener('click', () => {
            console.log('table selected: ' + tables[i].number);
  
            hideAll();
  
            let boxes = [
              waiterScreen,
              home,
              // list,
              menu
            ];
    
            for (const box of boxes) {
              box.classList.remove('hide');
              box.style.display = 'flex';
            }
  
            cash.classList.add('hide');
            cash.style.display = 'none';
            list.classList.add('hide');
            list.style.display = 'none';
            
            sessionStorage.setItem('tablenumber', tables[i].number);
            tableNumber.textContent = `Tisch Nr.: ${tables[i].number}`;
          });
        }

        tableWrapper.appendChild(newTable);

        if (tableWrapper.childNodes.length === 3) {
          tableWrapper.setAttribute('class', 'tableWrapper');
          contentwrapper.appendChild(tableWrapper);
          tableWrapper = document.createElement('div');
        }
      }
    });
  }

  function initList() {
    firebase.database().ref('public/drinks/').once('value').then((snapshot) => {
      const drinks = snapshot.val();

      for (const drink of drinks) {
        drink.howMany = 0;
      }

      // printDrinks(drinks);
    });

    function printDrinks(drinks) {
      for (let i = 0; i < drinks.length; i++) {
        let contentwrapper = document.getElementById('cashWrapper');
        
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
        counterElm.setAttribute('id', `${i}CounterList`);
        minus.setAttribute('class', 'fas fa-minus minus');
  
        newDrink.setAttribute('class', 'drink');
  
        minus.addEventListener('click', () => {
          counter = document.getElementById(`${i}CounterList`);
  
          if (parseInt(counter.textContent) > 0) {
            let number = parseInt(counter.textContent);
            number--;
            counter.textContent = `${number}x`;
  
            document.getElementById('list').classList.toggle('elementAdded');

            changeNumberOfOrders(name, false);

            if (number === 0) newDrink.classList.add('hide');
  
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
  
            counter = document.getElementById(`${i}CounterList`);
            let number = parseInt(counter.textContent.substring(0, counter.textContent.length - 1)) + 1;
            counter.textContent = `${number}x`;

            changeNumberOfOrders(name, true);
  
            setTimeout(() => {
              document.getElementById('list').classList.toggle('elementAdded');
            }, 150);
          }
        });

        newDrink.classList.add('hide');
        newDrink.setAttribute('id', `${i}`);
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
  }

  function initCash() {
    let thingsToPay = [];

    home.addEventListener('click', () => {
      console.log('clearing array ...');
       if (!isSendClicked) {
        for (const thing of thingsToPay) {
          thing.howMany = 0;
        }
       }
    });

    firebase.database().ref('public/drinks/').once('value').then((snapshot) => {
      printDrinks(snapshot.val());

      function printDrinks(drinks) {
        drinksCounter = drinks.length;
        for (let i = 0; i < drinks.length; i++) {
          let contentwrapper;
  
          if (drinks[i].anti) {
            contentwrapper = document.getElementById('antiWrapperCash');
          } else {
            contentwrapper = document.getElementById('alkWrapperCash');
          }
          
          const newDrink = document.createElement('div');

          drinks[i].howMany = 0;
          drinks[i].price = parseFloat(drinks[i].price);

          thingsToPay.push(drinks[i]);
    
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
          counterElm.setAttribute('id', `${i}CashCounter`);
          minus.setAttribute('class', 'fas fa-minus minus');
    
          newDrink.setAttribute('class', 'drink');
    
          minus.addEventListener('click', () => {
            counter = document.getElementById(`${i}CashCounter`);
    
            if (parseInt(counter.textContent) > 0) {
              let number = parseInt(counter.textContent);
              number--;
              counter.textContent = `${number}x`;
    
              document.getElementById('list').classList.toggle('elementAdded');

              changeNumberOfOrders(name, false);
    
              setTimeout(() => {
                document.getElementById('list').classList.toggle('elementAdded');
              }, 150);
              console.log(thingsToPay);
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
    
              counter = document.getElementById(`${i}CashCounter`);
              let number = parseInt(counter.textContent.substring(0, counter.textContent.length - 1)) + 1;
              counter.textContent = `${number}x`;

              changeNumberOfOrders(name, true);
    
              setTimeout(() => {
                document.getElementById('list').classList.toggle('elementAdded');
              }, 150);
              console.log(thingsToPay);
            }
          });
    
          contentwrapper.appendChild(newDrink);
        }
      }
    });

    firebase.database().ref('public/food/').once('value').then((snapshot) => {
      printFood(snapshot.val());

      function printFood(food) {
        foodCounter = food.length;
        for (let i = 0; i < food.length; i++) {
          let contentwrapper = document.getElementById('foodWrapperCash');
          
          const newDrink = document.createElement('div');

          food[i].howMany = 0;
          food[i].price = parseFloat(food[i].price);

          thingsToPay.push(food[i]);
    
          let name = food[i].name;
          let price = food[i].price;
          let counter = 0;
    
          let nameElm = document.createElement('p');
          let priceElm = document.createElement('p');
          let counterElm = document.createElement('p');
          let minus = document.createElement('i'); 
    
          nameElm.textContent = name;
          priceElm.textContent = `${price}€`;
          priceElm.textContent = priceElm.textContent.replace('.', ',');
          counterElm.textContent = `${counter}x`;
          counterElm.setAttribute('id', `${i}CashCounterFood`);
          minus.setAttribute('class', 'fas fa-minus minus');
    
          newDrink.setAttribute('class', 'drink');
    
          minus.addEventListener('click', () => {
            counter = document.getElementById(`${i}CashCounterFood`);
    
            if (parseInt(counter.textContent) > 0) {
              let number = parseInt(counter.textContent);
              number--;
              counter.textContent = `${number}x`;
    
              document.getElementById('list').classList.toggle('elementAdded');

              changeNumberOfOrders(name, false);
    
              setTimeout(() => {
                document.getElementById('list').classList.toggle('elementAdded');
              }, 150);
              console.log(thingsToPay);
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
    
              counter = document.getElementById(`${i}CashCounterFood`);
              let number = parseInt(counter.textContent.substring(0, counter.textContent.length - 1)) + 1;
              counter.textContent = `${number}x`;

              changeNumberOfOrders(name, true);
    
              setTimeout(() => {
                document.getElementById('list').classList.toggle('elementAdded');
              }, 150);
              console.log(thingsToPay);
            }
          });
    
          contentwrapper.appendChild(newDrink);
        }
      }
    });
    
    function changeNumberOfOrders(name, add) {
      for (const thing of thingsToPay) {
        if (thing.name === name) {
          if (add) {
            thing.howMany++;
          } else {
            thing.howMany--;
          }
        }
      }
    }

    pay.addEventListener('click', () => {
      let finalPrice = 0;

      for (const thing of thingsToPay) {
        finalPrice += thing.price * thing.howMany;
      }
      
      console.log(finalPrice);

      hideAll();

      const boxes = [
        cashScreen,
        cashWrapper,
        shoppingCart,
        back2Cash
      ];

      for (const box of boxes) {
        box.classList.remove('hide');
        box.style.display = 'flex';
      }

      printThingsToPay();

      function printThingsToPay() {
        const contentwrapper = document.getElementById('cashWrapper');

        for (const thing of thingsToPay) {
          if (thing.howMany > 0) {
            const newThing = document.createElement('div');

            const counterWrapper = document.createElement('div');
            const nameWrapper = document.createElement('div');
            const priceWrapper = document.createElement('div');

            const counter = document.createElement('p');
            const name = document.createElement('p');
            const price = document.createElement('p');

            counter.textContent = thing.howMany;
            name.textContent = thing.name;
            // console.log("Counter: " + thing.howMany);
            // console.log("Price: " + thing.price);
            price.textContent = (parseFloat(thing.howMany) * parseFloat(thing.price)) + '€';
            price.textContent = price.textContent.replace('.', ',');

            counterWrapper.appendChild(counter);
            nameWrapper.appendChild(name);
            priceWrapper.appendChild(price);

            counterWrapper.setAttribute('class', 'pay0');
            nameWrapper.setAttribute('class', 'pay1');
            priceWrapper.setAttribute('class', 'pay2');

            newThing.setAttribute('class', 'thing');

            newThing.appendChild(counterWrapper);
            newThing.appendChild(nameWrapper);
            newThing.appendChild(priceWrapper);

            contentwrapper.appendChild(newThing);
          } 
        }

        printSum();
        printCalculator();
        printSendButton();
        
        function printSum() {
          const sum = document.createElement('div');

          const totalWrapper = document.createElement('div');
          const numberWrapper = document.createElement('div');
          const iWrapper = document.createElement('div');

          let total = document.createElement('p');
          let number = document.createElement('p');
          let icon = document.createElement('i');

          total.textContent = 'Gesamt: ';
          number.textContent = finalPrice + '€';
          number.textContent = number.textContent.replace('.', ',');
          icon.setAttribute('class', 'fas fa-calculator');

          totalWrapper.appendChild(total);
          totalWrapper.appendChild(number);
          // iWrapper.appendChild(icon);

          sum.appendChild(totalWrapper);
          sum.appendChild(iWrapper);
          // sum.appendChild(numberWrapper);


          sum.setAttribute('class', 'sum');

          contentwrapper.appendChild(sum);
        }

        function printCalculator() {
          const calcWrapper = document.createElement('div');

          const givenSumWrapper = document.createElement('div');
          const input = document.createElement('input');
          
          input.type = 'number';
          input.placeholder = 'Betrag gegeben';

          const outputWrapper = document.createElement('div');
          const outputText = document.createElement('p');

          input.addEventListener('input', () => {
            let inputValue = input.value;

            if (inputValue > finalPrice) {
              outputText.textContent = `Rückgeld: ${inputValue - finalPrice}€`;
              outputText.textContent = outputText.textContent.replace('.', ',');
            } else {
              outputText.textContent = 'zu wenig Geld erhalten!';
            }
          });

          outputWrapper.appendChild(outputText);

          givenSumWrapper.appendChild(input);

          calcWrapper.appendChild(givenSumWrapper);
          calcWrapper.appendChild(outputWrapper);

          calcWrapper.setAttribute('class', 'calc');

          contentwrapper.appendChild(calcWrapper);
        }

        function printSendButton() {
          const buttonWrapper = document.createElement('div');
          const button = document.createElement('button');

          button.textContent = 'Senden';
          
          button.addEventListener('click', () => {
            isSendClicked = true;
            console.log('writing finalprice to db and saving stats of waiter');
            button.classList.add('animate');

            setTimeout(() => {
              button.classList.remove('animate');
            }, 750);

            if (finalPrice > 0) {
              let uid = firebase.auth().currentUser.uid;
            
              firebase.database().ref(`private/user/${uid}/stats/cashTotal`).once('value').then((snapshot) => {
                firebase.database().ref(`private/user/${uid}/stats/`).update({
                  cashTotal: parseInt(snapshot.val()) + finalPrice
                }).then(() => {
                  home.click();
                  setTimeout(() => {
                    isSendClicked = false;
                  }, 200);
                });
              });

              for (let i = 0; i < thingsToPay.length; i++) {
                firebase.database().ref('public/sold/' + i).once('value').then((snapshot) => {
                  firebase.database().ref('public/sold/' + i).update({
                    howMany: parseInt(snapshot.val().howMany) + thingsToPay[i].howMany,
                  }).then(() => {
                    thingsToPay[i].howMany = 0;
                  });
                });
              }
            }
          });
          
          buttonWrapper.setAttribute('class', 'sendButton');
          buttonWrapper.appendChild(button);
          contentwrapper.appendChild(buttonWrapper);
        }

        reColorRows();
      }

      function reColorRows() {
        const rows = document.getElementsByClassName('thing');
    
        for (const row of rows) {
          row.classList.remove('otherBackground');
        }
    
        for (let i = 0; i < rows.length; i++) {
          if (i % 2 === 0) rows[i].classList.add('otherBackground');
        }
      }
    });
  }

  function toggleButtonClicked(button) {
    button.classList.toggle('buttonClick');

    setTimeout(() => {
        button.classList.toggle('buttonClick');
    }, 500);
  }

  function activateLoading() {
    const loader = document.getElementById('loader');

    loader.classList.remove('hide');
  }

  function deActivateLoading() {
    const loader = document.getElementById('loader');

    loader.classList.add('hide');
  }
});