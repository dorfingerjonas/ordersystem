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
    const back = document.getElementById('back');
    const signOut = document.getElementById('signOut');
    const home = document.getElementById('home');
    const uncompletedWrapper = document.getElementById('uncompletedWrapper');
    let listPrinted = false;

    if (firebase.auth().currentUser !== null) {
      initTable();
    }

    loginBtn.addEventListener('click', () => {
      toggleButtonClicked(loginBtn);
      activateLoading();
      const userame = document.getElementById('username');
      const password = document.getElementById('password');
      const loginfdb = document.getElementById('loginfdb');
      let isValid = '';
  
      username.value = username.value.toLowerCase();
  
      if (username.value === 'bar') {
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
            initTable();
    
            let boxes = [
              uncompletedWrapper,
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
        loginfdb.textContent = 'Sie können sich hier nur mit dem Bar Account anmelden.' 
      }
    });

    back.addEventListener('click', () => {
      window.location.href = '../index.html';
    });

    signOut.addEventListener('click', () => {
      firebase.auth().signOut();
      window.location.href = '../index.html'
  });

  function initTable() {
    firebase.database().ref('public/orders/uncompleted').once('value').then((snapshot) => {
      if (snapshot.val() !== null) {
        const orders = [];

        document.getElementById('errorUnCompleted').classList.add('hide');

        for (const index in snapshot.val()) {
          orders.push(snapshot.val()[index]);
        }

        console.log(orders);

        printTable(orders, 'uncompletedWrapper');
      } else {
        document.getElementById('errorUnCompleted').classList.remove('hide');
      }
      
      listPrinted = true;
    });
  }

  function printTable(orders, wrapper) {
    const contentwrapper = document.getElementById(wrapper);

    if (orders.length > 0) {
      document.getElementById('errorUnCompleted').classList.add('hide');

      for (let i = 0; i < orders.length; i++) {
        const newOrder = document.createElement('div');
        const numberWrapper = document.createElement('div');
        const drinkWrapper = document.createElement('div');
  
        newOrder.setAttribute('class', 'row');
        numberWrapper.setAttribute('class', 'numberWrapper');
        drinkWrapper.setAttribute('class', 'drinkWrapper');
  
        const tablenumber = document.createElement('p');
        tablenumber.textContent = orders[i].tablenumber;
  
        numberWrapper.appendChild(tablenumber);
  
        const orderElms = orders[i].drinks;
  
        for (const elm of orderElms) {
          const howMany = document.createElement('p');
          const name = document.createElement('p');
          const div = document.createElement('div');
  
          howMany.textContent = elm.howMany;
          name.textContent = elm.name;
  
          div.setAttribute('class', 'infoWrapper');
  
          div.appendChild(howMany);
          div.appendChild(name);
          drinkWrapper.appendChild(div);
        }        
  
        if (orders[i].note !== undefined) {
          const div = document.createElement('div');
          const text = document.createElement('p');
  
          text.textContent = `Notiz: ${orders[i].note}`;
  
          div.setAttribute('class', 'infoWrapper');
  
          div.appendChild(text);
          drinkWrapper.appendChild(div);
        }
  
        reColorRows();
  
        newOrder.addEventListener('click', () => {
          contentwrapper.removeChild(newOrder);
  
          let newOrders = [];
  
          console.log(orders);
  
          for (let j = 0; j < orders.length; j++) {
            if (i !== j) {
              newOrders.push(orders[j]);
            } else {
              j++
            }
          }
  
          console.log(newOrders);

  
          reColorRows();
          
          firebase.database().ref(`public/orders/uncompleted/${orders[i].timestamp}`).remove();
          
          if (orders[i].note !== undefined) {
            firebase.database().ref(`public/orders/completed/${orders[i].timestamp}`).set({
              timestamp: orders[i].timestamp,
              tablenumber: orders[i].tablenumber,
              drinks: orders[i].drinks,
              note: orders[i].note
            });
          } else {
            firebase.database().ref(`public/orders/completed/${orders[i].timestamp}`).set({
              timestamp: orders[i].timestamp,
              tablenumber: orders[i].tablenumber,
              drinks: orders[i].drinks
            });
          }

          console.log(uncompletedWrapper.lastChild);
          console.log(uncompletedWrapper.childNodes);

          while (uncompletedWrapper.lastChild && uncompletedWrapper.childNodes > 3) {
            console.log(uncompletedWrapper.lastChild);
            console.log(uncompletedWrapper.childNodes);
            uncompletedWrapper.removeChild(uncompletedWrapper.lastChild);
          }

          if (uncompletedWrapper.childNodes.length <= 3) {
            document.getElementById('errorUnCompleted').classList.remove('hide');
          } else {
            document.getElementById('errorUnCompleted').classList.add('hide');
          }
        });
  
        newOrder.appendChild(drinkWrapper);
        newOrder.appendChild(numberWrapper);
        contentwrapper.appendChild(newOrder);
      }
    } else {
      document.getElementById('errorUnCompleted').classList.remove('hide');
    }
  }

  function reColorRows() {
    const rows = document.getElementsByClassName('row');

    for (const row of rows) {
      row.classList.remove('otherBackground');
    }

    for (let i = 0; i < rows.length; i++) {
      if (i % 2 === 0) rows[i].classList.add('otherBackground');
    }
  }

  function toggleButtonClicked(button) {
    button.classList.toggle('buttonClick');

    setTimeout(() => {
        button.classList.toggle('buttonClick');
    }, 500);
  }

  firebase.database().ref('public/orders/uncompleted').on('value', (snapshot) => {
    if (listPrinted) {
      console.log('eventlistener started');
    
      while (uncompletedWrapper.lastChild && uncompletedWrapper.childNodes.length > 3) {      
        uncompletedWrapper.removeChild(uncompletedWrapper.lastChild);
      }

      const orders = [];

      for (const index in snapshot.val()) {
        orders.push(snapshot.val()[index]);
      }

      console.log(orders);
      
      printTable(orders, 'uncompletedWrapper');
      
      reColorRows();
    }
  });

  function activateLoading() {
    const loader = document.getElementById('loader');

    loader.classList.remove('hide');
  }

  function deActivateLoading() {
    const loader = document.getElementById('loader');

    loader.classList.add('hide');
  }
});