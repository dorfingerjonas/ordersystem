window.addEventListener('load', () => {
    firebase.database().ref('public/message').on('value', (snapshot) => {
        const messageBox = document.getElementById('message');
        const outputfield = document.getElementById('messageContent');
        const sendMessage = snapshot.val().sendMessage;
        const text = snapshot.val().text;

        outputfield.textContent = text;

        if (sendMessage) {
            firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    firebase.database().ref(`private/user/${firebase.auth().currentUser.uid}/messageSeen`).once('value').then((snapshot) => {
                        if (snapshot.val() !== null) {
                            if (!snapshot.val().messageSeen) {
                                messageBox.classList.toggle('showMessage');
                                
                                document.getElementById('toggleMessage').addEventListener('click', () => {
                                    messageBox.classList.toggle('showMessage');
    
                                    firebase.database().ref(`private/user/${firebase.auth().currentUser.uid}/messageSeen`).set({
                                        messageSeen: true
                                    });
                                });
                            }
                        }
                    });
                }
            });
        }
    });
});