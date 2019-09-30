window.addEventListener('load', () => {
    
    const iOS = !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);

    console.log(iOS);

    if (iOS) {
        document.getElementById('fullScreenWrapper').classList.remove('hide');
        document.getElementById('fullScreenWrapper').addEventListener('click', () => {
            document.body.requestFullscreen();
            // document.body.webkitRequestFullscreen();
            // document.body.mozRequestFullScreen();
        });
    } else {
        document.getElementById('fullScreenWrapper').classList.add('hide');
    }
});