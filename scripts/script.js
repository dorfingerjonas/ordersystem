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

    const adminBox = document.getElementById('adminBox');
    const barBox = document.getElementById('barBox');
    const waiterBox = document.getElementById('waiterBox');

    adminBox.addEventListener('click', () => {
        window.location.href = './admin/index.html';
    });

    barBox.addEventListener('click', () => {
        window.location.href = './bar/index.html';
    });

    waiterBox.addEventListener('click', () => {
        window.location.href = './waiter/index.html';
    });
});