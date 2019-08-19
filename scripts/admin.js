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
    const adminScreen = document.getElementById('adminScreen');
    // const adminText = document.getElementById('adminText');
    const adminWrapper = document.getElementById('adminWrapper');
    const adminDrink = document.getElementById('adminDrink');
    const adminFood = document.getElementById('adminFood');
    const adminUsers = document.getElementById('adminUsers');
    const adminTable = document.getElementById('adminTable');
    const adminDrinkWrapper = document.getElementById('adminDrinkWrapper');
    const back = document.getElementById('back');
    const signOut = document.getElementById('signOut');
    const home = document.getElementById('home');
    const chart = document.getElementById('chart');
    const elementHierarchy = [adminScreen];
    let positionCounter = 0;

    loginBtn.addEventListener('click', () => {
        const userame = document.getElementById('username');
        const password = document.getElementById('password');
        const loginfdb = document.getElementById('loginfdb');
        let isValid = '';

        username.value = username.value.toLowerCase();

        if (username.value === 'admin') {
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
                        adminScreen,
                        adminWrapper,
                        signOut,
                        home,
                        chart
                    ];
            
                    for (const box of boxes) {
                        box.classList.remove('hide');
                        box.style.display = 'flex';
                    }
    
                    logInScreen.classList.add('hide');
                    
                    adminWrapper.style.display = 'block';
                    userame.value = '';   
                    password.value = '';
                    loginfdb.innerHTML = '&nbsp;';
    
                    // adminText.style.display = 'block';
                    // adminText.classList.remove('hide');

                    initAdminDrink();
                    initAdminUsers();
                    initAdminTables();
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
            loginfdb.textContent = 'Sie können sich hier nur mit dem Administrator Account anmelden.' 
        }

    });

    adminDrink.addEventListener('click', () => {
        hideAll();
        const elements = [
            adminScreen,
            adminDrinkWrapper
        ];

        for (const element of elements) {
            element.classList.remove('hide');
            element.style.display = 'flex';
        }
        positionCounter++;
    });

    adminUsers.addEventListener('click', () => {
        hideAll();
        const elements = [
            adminScreen,
            adminUsersWrapper
        ];

        for (const element of elements) {
            element.classList.remove('hide');
            element.style.display = 'flex';
        }
        positionCounter++;
    });

    adminTable.addEventListener('click', () => {
        hideAll();
        const elements = [
            adminScreen,
            adminTableWrapper
        ];

        for (const element of elements) {
            element.classList.remove('hide');
            element.style.display = 'flex';
        }
        positionCounter++;
    });

    back.addEventListener('click', () => {
        if  (!signOut.className.includes('hide')) {
            home.click();
            positionCounter = 0;
        } else {
            window.location.href = '../index.html';
        }
    });

    signOut.addEventListener('click', () => {
        firebase.auth().signOut();
        window.location.href = '../index.html'
    });

    home.addEventListener('click', () => {
        const elements = [
            elementHierarchy[0],
            adminWrapper,
            // adminText
        ];

        hideAll();
            
        for (const element of elements) {
            element.classList.remove('hide');
            element.style.display = 'flex';
        }
        adminWrapper.style.display = 'block';
        positionCounter--;
    });

    function hideAll() {
        const elements = [
            logInScreen,
            adminScreen,
            adminWrapper,
            adminDrinkWrapper,
            adminUsersWrapper,
            // adminText,
            document.getElementById('adminTableWrapper')
        ];

        for (const element of elements) {
            element.classList.add('hide');
            element.style.display = 'none';
        }
    }

    function initAdminDrink() {
        firebase.database().ref('public/drinks').once('value').then((snapshot) => {
            const drinks = snapshot.val();
            printDrinks(drinks); 
            
            let saveWrapper = document.createElement('div');
            let save = document.createElement('i');
            save.setAttribute('class', 'fas fa-check');
            save.setAttribute('id', 'saveDrinks');
            
            saveWrapper.addEventListener('click', () => {
                let i = 0;

                save.style.color = '#82c51b';

                setTimeout(() => {
                    save.style.color = 'white';
                }, 500);
                
                for (const drink of drinks) {
                    firebase.database().ref('public/drinks/' + i).update({
                        price: parseFloat(drink.price),
                        anti: !drink.anti
                    });
                    i++;
                }
            });
                    
            saveWrapper.appendChild(save);
            
            document.getElementById('drinkWrapper').appendChild(saveWrapper);
            
            document.getElementById('addNewDrink').addEventListener('click', () => {
                const name = document.getElementById('addName');
                const price = document.getElementById('addPrice');
                const anti = document.getElementById('addAnti');
                
                let inputsValid = '';
                
                if (name.value === '') {
                    inputsValid += 'false';
                    console.log('es darf kein feld leer bleiben: name');
                }
                
                if (price.value === '') {
                    inputsValid += 'false';
                    console.log('es darf kein feld leer bleiben: price');
                }
                
                if (!inputsValid.includes('false')) {
                    firebase.database().ref('public/drinks').once('value').then((snapshot) => {
                        firebase.database().ref('public/drinks/' + snapshot.val().length).set({
                            name: name.value,
                            price: price.value,
                            anti: !anti.checked
                        });

                        printDrinks([{'name': name.value, 'price': price.value, 'anti': !anti.checked}]);
                        document.getElementById('addDrink').click();
                        name.value = '';
                        price.value = '';
                        anti.checked = false;
                    });
                }
            });
        });
    
        let plusWrapper = document.createElement('div');
        let plus = document.createElement('i');
        plus.setAttribute('class', 'fas fa-plus');
        plus.setAttribute('id', 'addDrink');
    
        plus.style.transform = 'rotateZ(0deg)';
    
        plusWrapper.addEventListener('click', () => {
    
            document.getElementById('addDrinkWindow').classList.toggle('hideAddDrinkWindow');
    
            if (plus.style.transform === 'rotateZ(0deg)') {
                plus.style.transform = 'rotateZ(225deg)';
            } else {
                plus.style.transform = 'rotateZ(0deg)';
            }
        });
    
        plusWrapper.appendChild(plus);
    
        document.getElementById('drinkWrapper').appendChild(plusWrapper);
    }

    function initAdminUsers() {
        firebase.database().ref('private/user').once('value').then((snapshot) => {
            const users = []

            for (const index in snapshot.val()) {
                users.push(snapshot.val()[index]);
            }

            printUsers(users);

            let plusWrapper = document.createElement('div');
            let plus = document.createElement('i');
            plus.setAttribute('class', 'fas fa-plus');
            plus.setAttribute('id', 'addUser');

            plus.style.transform = 'rotateZ(0deg)';

            plusWrapper.addEventListener('click', () => {

                document.getElementById('addUserWindow').classList.toggle('hideAddUserWindow');

                if (plus.style.transform === 'rotateZ(0deg)') {
                    plus.style.transform = 'rotateZ(225deg)';
                } else {
                    plus.style.transform = 'rotateZ(0deg)';
                }
            });

            plusWrapper.appendChild(plus);

            document.getElementById('userWrapper').appendChild(plusWrapper);

            addNewUser.addEventListener('click', () => {
                const username = document.getElementById('addUsername');
                const fdb = document.getElementById('addUserFDB');

                if (username == '') {
                    fdb.textContent = 'Es darf kein Feld leer bleiben!';
                } else {
                    username.value = username.value.toLowerCase();

                    let newUsername = username.value.charAt(0).toUpperCase();

                    for (let i = 1; i < username.value.length; i++) {
                        newUsername += username.value.charAt(i);
                    }

                    firebase.auth().createUserWithEmailAndPassword(`${username.value.toLowerCase()}@mail.com`, `${newUsername}123!`).then(() => {
                        printUsers([{password: `${newUsername}123!`, username: newUsername}]);
                        plusWrapper.click();

                        let uid = firebase.auth().currentUser.uid;

                        firebase.auth().signInWithEmailAndPassword('admin@mail.com', 'admi123').then(() => {
                            firebase.database().ref('private/user/' + uid).set({
                                password: `${newUsername}123!`,
                                username: newUsername
                            }); 
                        });
                    });
                }
            });
        });
    }

    function initAdminTables() {
        let tables = [];

            firebase.database().ref('public/tables').once('value').then((snapshot) => {

                for (const i in snapshot.val()) {
                    let table = snapshot.val()[i];
                    tables.push(table);
                }
                printTables(tables);

            let plusWrapper = document.createElement('div');
            let plus = document.createElement('i');
            plus.setAttribute('class', 'fas fa-plus');
            plus.setAttribute('id', 'addTable');

            plus.style.transform = 'rotateZ(0deg)';

            plusWrapper.addEventListener('click', () => {

                document.getElementById('addTableWindow').classList.toggle('hideAddTableWindow');

                if (plus.style.transform === 'rotateZ(0deg)') {
                    plus.style.transform = 'rotateZ(225deg)';
                } else {
                    plus.style.transform = 'rotateZ(0deg)';
                }
            });

            plusWrapper.appendChild(plus);

            document.getElementById('tableWrapper').appendChild(plusWrapper);

            document.getElementById('addNewTable').addEventListener('click', () => {
                const tablenumber = document.getElementById('addNumber');
                const fdb = document.getElementById('addTableFDB');
                let numberUsed = false;

                tablenumber.value = parseInt(tablenumber.value);

                for (const table of tables) {                    
                    if (table.number === tablenumber.value) {
                        numberUsed = true;
                    }
                }

                if (tablenumber.value === '') {
                    fdb.textContent = 'Es darf kein Feld leer bleiben.';
                } else if (numberUsed) {
                    fdb.textContent = 'Diese Tischnummer wird bereits verwendet.';
                } else {
                    fdb.innerHTML = '&nbsp;';

                    firebase.database().ref('public/tables/' + tablenumber.value).update({
                        number: tablenumber.value
                    });
                    printTables([{number: tablenumber.value}]);
                    document.getElementById('addNewTable').click();
                }
            });
        });
    }
});

function printDrinks(drinks) {
        
    const contentwrapper = document.getElementById('drinkWrapper');

    for (let i = 0; i < drinks.length; i++) {
        const newDrink = document.createElement('div');

        let name = drinks[i].name;
        let price = `${drinks[i].price}€`;
        let anti = drinks[i].anti;
        
        const nameElm = document.createElement('h3'); 
        const priceWrapper = document.createElement('div');
        const antiWrapper = document.createElement('div');

        nameElm.textContent = name;
        nameElm.setAttribute('id', `${i}Name`);

        newDrink.appendChild(nameElm);

        let priceText = document.createElement('p');

        let wrapperElements = [price];
        let wrapperContent = [priceText];
        let wrappers = [priceWrapper];
        
        for (let j = 0; j < wrappers.length; j++) {
            let plus = document.createElement('i');
            let minus = document.createElement('i');

            wrapperContent[j].textContent = wrapperElements[j];
            wrappers[j].appendChild(wrapperContent[j]);

            wrappers[j].setAttribute('class', 'priceWrapper');

            plus.setAttribute('class', 'fas fa-plus');
            minus.setAttribute('class', 'fas fa-minus');

            if (j === 0) {
                wrapperContent[0].setAttribute('id', `${i}p`);

                minus.style.cursor = 'default'; 

                plus.addEventListener('click', () => {
                    let textElm = document.getElementById(`${i}p`);

                    let text = textElm.textContent;

                    text = text.substring(0, text.length - 1);

                    if (minus.style.cursor === 'not-allowed') {
                        minus.style.cursor = 'default';
                        minus.style.color = '#242424';
                        minus.style.borderColor = '#242424';
                    }

                    text = text.replace(',', '.');
                    text = `${parseFloat(text) + 0.5}€`;
                    text = text.replace('.', ',');
                    textElm.textContent = text;
                    drinks[i].price = parseFloat(drinks[i].price) + 0.5;
                });

                minus.addEventListener('click', () => {
                    let textElm = document.getElementById(`${i}p`);

                    let text = textElm.textContent;

                    text = text.substring(0, text.length - 1);
                    text = text.replace(',', '.');

                    if (minus.style.cursor === 'default') {
                        text = `${parseFloat(text) - 0.5}€`;
                        drinks[i].price = parseFloat(drinks[i].price) - 0.5;
                    }

                    if (parseFloat(text) - 0.5 <= 0) {
                        minus.style.cursor = 'not-allowed';
                        minus.style.color = 'lightgray';
                        minus.style.borderColor = 'lightgray';
                    }
                    text = text.replace('.', ',');
                    textElm.textContent = text;
                });
            }

            let iWrapper = document.createElement('div');

            iWrapper.setAttribute('class', 'iWrapper');

            iWrapper.appendChild(plus);
            iWrapper.appendChild(minus);
            wrappers[j].appendChild(iWrapper);

            newDrink.setAttribute('class', 'drink');
            
            newDrink.appendChild(wrappers[j]);
        }

        let antiText = document.createElement('p');
        antiText.textContent = 'enthält Alk.';

        let input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !anti;

        input.addEventListener('click', () => {
            drinks[i].anti = input.checked;
            console.log(drinks[i]);
        });

        antiWrapper.appendChild(antiText);
        antiWrapper.appendChild(input);

        antiWrapper.setAttribute('class', 'antiWrapper')
        
        newDrink.appendChild(antiWrapper);

        newDrink.addEventListener('click', (event) => {
            const drinkClasses = document.getElementsByClassName('drink');

            if (newDrink.className.includes('drinkOpen') && event.toElement.localName !== 'i' && event.toElement.localName !== 'input') {
                for (const drink of drinkClasses) {
                    drink.classList.remove('drinkOpen');
                }
            } else {
                for (const drink of drinkClasses) {
                    drink.classList.remove('drinkOpen');
                }

                newDrink.classList.toggle('drinkOpen');
            }
        });

        contentwrapper.appendChild(newDrink);
    }
}

function printUsers(users) {
    const contentwrapper = document.getElementById('userWrapper');

    for (let i = 0; i < users.length; i++) {
        const newUser = document.createElement('div');

        const username = users[i].username;
        const password = users[i].password;
        
        const nameElm = document.createElement('h3'); 
        const passwordWrapper = document.createElement('div');
        const eye = document.createElement('i');
        const saveBtn = document.createElement('p');

        nameElm.textContent = username;
        nameElm.setAttribute('id', `${i}Name`);

        newUser.appendChild(nameElm);
        newUser.setAttribute('class', 'user');

        const passwordInput = document.createElement('input');

        passwordInput.type = 'password';
        passwordInput.value = password;
        passwordInput.before = password;
        passwordInput.setAttribute('id', `${i}PW`);

        eye.setAttribute('class', 'fas fa-eye');
        
        eye.addEventListener('click', () => {
            if (eye.className.includes('slash')) {
                passwordInput.type = 'password';
                eye.removeAttribute('class', 'fas fa-eye-slash');
                eye.setAttribute('class', 'fas fa-eye');
            } else {
                passwordInput.type = 'text';
                eye.removeAttribute('class', 'fas fa-eye');
                eye.setAttribute('class', 'fas fa-eye-slash');
            }
        });

        saveBtn.textContent = 'Speichern';

        saveBtn.setAttribute('class', 'saveBtn button');

        saveBtn.addEventListener('click', () => {
            console.log(document.getElementById(`${i}PW`).value);
            console.log(document.getElementById(`${i}PW`).before);

            const password = document.getElementById(`${i}PW`);

            const user = firebase.auth().currentUser;

            firebase.auth().signInWithEmailAndPassword(`${username}@mail.com`, password.before).then(() => {
                firebase.database().ref('private/user/' + user.uid).update({
                    password: password.value
                  }, (error) => {
                    if (error) {
                        console.log(error.message);
                    }
                });

                user.updatePassword(password.value).then(() => {
                    console.log('success');
                  });

                  password.before = password.value;
            });
        });
        
        passwordWrapper.appendChild(passwordInput);
        passwordWrapper.appendChild(eye);
        
        passwordWrapper.setAttribute('class', 'pwWrapper');

        newUser.appendChild(passwordWrapper);
        newUser.appendChild(saveBtn);

        newUser.addEventListener('click', (event) => {
            const userClasses = document.getElementsByClassName('user');

            if (newUser.className.includes('userOpen') && event.toElement.localName !== 'i' && event.toElement.localName !== 'input' && event.toElement.localName !== 'p') {
                for (const user of userClasses) {
                    user.classList.remove('userOpen');
                }
            } else {
                for (const user of userClasses) {
                    user.classList.remove('userOpen');
                }

                newUser.classList.toggle('userOpen');
            }
        });

        contentwrapper.appendChild(newUser);
    }
}

function printTables(tables) {
    
    for (const table of tables) {
        const contentwrapper = document.getElementById('tableWrapper');
        const newTable = document.createElement('div');
        
        const numberElm = document.createElement('p');
        let remove = document.createElement('i');
        
        numberElm.textContent = table.number;
        remove.setAttribute('class', 'fas fa-trash');

        remove.addEventListener('click', () => {
            contentwrapper.removeChild(newTable);
            firebase.database().ref('public/tables/' + table.number).remove();
        });
        
        newTable.setAttribute('class', 'table');
        newTable.appendChild(numberElm);
        newTable.appendChild(remove);

        contentwrapper.appendChild(newTable);
    }
}