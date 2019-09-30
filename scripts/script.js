window.addEventListener('load', () => {
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