const socket = io();
const cards = [];

// ---------------------------------------------------------------------------------------------------------------------
// ----- ||| EVENT LISTENERS ||| ---------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------

function _initEventListeners() {
    document.getElementById("launchButton").addEventListener("click", toggleGame);
    document.getElementById("canvas").addEventListener("click", onCanvasClick);

    document.getElementById("options").getElementsByClassName("game")[0].getElementsByTagName("button")[0].addEventListener("click", toggleGame);
    document.getElementById("options").getElementsByClassName("game")[0].getElementsByTagName("button")[1].addEventListener("click", pause);

    document.getElementById("volume").addEventListener("oninput", (event) => changeVolume(null, event));

    document.getElementById("kick1").addEventListener("click", () => kickPlayer(1));
    document.getElementById("kick2").addEventListener("click", () => kickPlayer(2));

    document.getElementById("join").getElementsByTagName("button")[1].addEventListener("click", toggleQR);
    document.getElementById("qrCode").getElementsByTagName("button")[0].addEventListener("click", toggleQR);
    document.getElementById("qrCode").getElementsByTagName("img")[0].addEventListener("click", toggleQR);

    document.getElementById("toggleMusic").addEventListener("click", toggleMusic);
    document.getElementById("toggleOptions").addEventListener("click", toggleOptions);
    document.getElementById("toggleFullscreen").addEventListener("click", toggleFullscreen);
}


// ---------------------------------------------------------------------------------------------------------------------
// ----- ||| SOCKETS ||| -----------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------

socket.emit("hostConnect", {});

//TODO
// bird sounds

socket.on('init', ip => {
    document.getElementById("qrCode").getElementsByTagName("img")[0].src =
        "http://chart.apis.google.com/chart?chs=500x500&cht=qr&chld=L&chl=http://" + ip + "/control";
    document.getElementById("ip").innerText = "http://" + ip + "/control";
});

socket.on('clientUpdate', oInfo => {
    window.started = oInfo.started;
    const handleClientUpdate = function(oInfo) {
        const aPlayer = document.getElementsByClassName('player');
        const aButtons = document.getElementsByClassName('kick');
        const oStartButton = document.getElementsByClassName("game")[0].getElementsByTagName("button")[0];
        const oPauseButton = document.getElementsByClassName("game")[0].getElementsByTagName("button")[1];
        const oLaunchButton = document.getElementById("launchButton");

        const toggleButton = (oButton, bEnabled) => {
            if (bEnabled) {
                oButton.classList.remove("disabled");
            } else {
                oButton.classList.add("disabled");
            }
            oButton.disabled = !bEnabled;
        };

        if (oInfo.player1) {
            window._oPlayer1 = new Player(oInfo.player1);
            aPlayer[0].innerHTML = "Spieler 1: Verbunden";
            toggleButton(aButtons[0], true);
        } else {
            window._oPlayer1 = undefined;
            aPlayer[0].innerHTML = "Spieler 1: Nicht verbunden";
            toggleButton(aButtons[0], false);
        }

        if (oInfo.player2) {
            window._oPlayer2 = new Player(oInfo.player2);
            aPlayer[1].innerHTML = "Spieler 2: Verbunden";
            toggleButton(aButtons[1], true);
        } else {
            window._oPlayer2 = undefined;
            aPlayer[1].innerHTML = "Spieler 2: Nicht verbunden";
            toggleButton(aButtons[1], false);
        }

        if (oInfo.message) {
            toast(oInfo.message);
        }

        if (oInfo.started) {
            toggleButton(oStartButton, true);
            toggleButton(oPauseButton, true);
        } else if (oInfo.player1 && oInfo.player2) {
            toggleButton(oStartButton, true);
            oLaunchButton.classList.add("wiggle");
        }

        if (!oInfo.player1 || !oInfo.player2) {
            oLaunchButton.classList.remove("wiggle");
        }

        if (oInfo.started) {
            _showStats();
            const oButton = document.getElementsByClassName("game")[0].getElementsByTagName("button")[1];
            if (oInfo.paused) {
                document.getElementById("pause").classList.add("paused");
                oButton.innerText = "Fortsetzen";
            } else {
                document.getElementById("pause").classList.remove("paused");
                oButton.innerText = "Pause";
            }
        } else {
            document.getElementById("pause").classList.remove("paused");
        }
    };

    if (!window._iModifier) {
        setTimeout(() => handleClientUpdate(oInfo), 600);
    } else {
        handleClientUpdate(oInfo);
    }
});

socket.on('playerUpdate', oInfo => {
    const aIgnoredProperties = [
        "id",
        "cards",
        "castle"
    ];

    const fnTranslateToFrontend = function(oFrontend, oBackend) {
        oBackend.health = oBackend.castle;
        for (let property in oBackend) {
            if (aIgnoredProperties.indexOf(property) === -1) {
                if (oBackend.hasOwnProperty(property) && oFrontend[property] !== oBackend[property]) {
                    oFrontend.set(property, oBackend[property]);
                }
            }
        }
    };

    fnTranslateToFrontend(window._oPlayer1, oInfo.player1);
    fnTranslateToFrontend(window._oPlayer2, oInfo.player2);
});

socket.on('start', _showStats);

function _togglePlayer(iNumber, b) {
    const oDeck = document.getElementById("deck-" + iNumber);
    const oStat = document.getElementById("stats-" + iNumber);
    const oInfo = document.getElementById("info-" + iNumber);

    const toggleElement = (oElement, bEnabled) => {
        if (bEnabled) {
            oElement.classList.add("fadeIn");
        } else {
            oElement.classList.remove("fadeIn");
        }
    };

    toggleElement(oDeck, b);
    toggleElement(oStat, b);
    toggleElement(oInfo, b);
}

function _showStats() {
    const oGameToggleButton = document.getElementsByClassName("game")[0].getElementsByTagName("button")[0];
    oGameToggleButton.innerText = "Beenden";
    const oPauseButton = document.getElementsByClassName("game")[0].getElementsByTagName("button")[1];
    const oLaunchButton = document.getElementById("launchButton");
    oLaunchButton.classList.remove("wiggle");
    oPauseButton.disabled = false;
    oPauseButton.classList.remove("disabled");

    _togglePlayer(1, true);
    _togglePlayer(2, true);
}

socket.on('pause', paused => {
    const oButton = document.getElementsByClassName("game")[0].getElementsByTagName("button")[1];
    if (paused) {
        oButton.innerText = "Fortsetzen";
    } else {
        oButton.innerText = "Pause";
    }

    if (paused) {
        toast("Spiel pausiert");
        document.getElementById("pause").classList.add("paused");
    } else {
        toast("Spiel wird fortgesetzt");
        document.getElementById("pause").classList.remove("paused");
    }
});

socket.on('quit', () => {
    const oGameToggleButton = document.getElementsByClassName("game")[0].getElementsByTagName("button")[0];
    oGameToggleButton.innerText = "Neustarten";
    const oPauseButton = document.getElementsByClassName("game")[0].getElementsByTagName("button")[1];
    oPauseButton.disabled = true;
    oPauseButton.classList.add("disabled");

    document.getElementById("pause").classList.remove("paused");

    _togglePlayer(1, false);
    _togglePlayer(2, false);
});

socket.on('card', o => {
    const card = cards.then().find(e => e.id === o.id);
    animateCard(o.player.number);
});

socket.on('toast', msg => toast(msg));

// ---------------------------------------------------------------------------------------------------------------------
// ----- ||| PRIVATE ||| -----------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------
function _deleteBird(id) {
    window._aActiveBirds.forEach((e, i) => {
        if (e.id === id) {
            window._aActiveBirds.splice(i, 1);
        }
    })
}

function _deleteDeadBird(id) {
    window._aDeadBirds.forEach((e, i) => {
        if (e.id === id) {
            window._aDeadBirds.splice(i, 1);
        }
    })
}

function _getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function _spawnDeadBird(id) {
    const oBird = window._aActiveBirds.filter(e => e.id === id)[0];

    const oDeadBird = {
        id: oBird.id,
        x: oBird.x,
        y: oBird.y
    };

    if (!window._aDeadBirds) {
        window._aDeadBirds = [];
    }

    window._aDeadBirds.push(oDeadBird);

    let i = 1;
    const iIntervalY = setInterval(() => {
        if (oDeadBird.y < window._iFloor) {
            oDeadBird.y += i;
        } else {
            clearInterval(iIntervalY);
            _deleteDeadBird(id);
        }
    });

    const iIntervalI = setInterval(() => {
        if (oDeadBird.y < window._iFloor) {
            i++;
        } else {
            clearInterval(iIntervalI);
        }
    }, 100);

    const iIntervalX = setInterval(() => {
        if (oDeadBird.y < window._iFloor) {
            oDeadBird.x++;
        } else {
            clearInterval(iIntervalX);
        }
    }, 5);
}

function _initializeClouds() {
    window._iCloudTimeout = 15000;
    window._sCloudColor = "rgba(255, 255, 255, 0.90)";
    window._sCloudSpeed = undefined;

    spawnCloud(3);
    spawnCloud(4);
    spawnCloud(3, -100);

    window.__cloudSpawningInterval = setInterval(() => {
        spawnCloud(Math.round(Math.random() * 2 + 2), -200);
    }, window._iCloudTimeout);
}

function _initializeBirds() {
    spawnBird();

    window.__birdSpawningInterval1 = setInterval(() => {
        spawnBird();
    }, 21000);

    window.__birdSpawningInterval2 = setInterval(() => {
        spawnBird();
        setTimeout(() => spawnBird(), Math.random() * 1000 + 400);
    }, 50000);
}

function _getCastle(id) {
    return window["_oPlayer" + id].castle;
}

function _setCastleHeight(id, iHeight) {
    const oCastle = _getCastle(id);
    const iDiff = iHeight - oCastle.height;
    const iTimeout = Math.abs(1 / iDiff * 300);

    let i = 0;
    const iInterval = setInterval(() => {
        if (i < Math.abs(iDiff)) {
            iDiff > 0 ? oCastle.height++ : oCastle.height--;
            i++;
        } else {
            clearInterval(iInterval);
        }
    }, iTimeout);
}

function _setFenceHeight(id, iHeight) {
    const oCastle = _getCastle(id);
    const iDiff = iHeight - oCastle.fence.height;
    const iTimeout = Math.abs(1 / iDiff * 1000);

    let i = 0;
    const iInterval = setInterval(() => {
        if (i < Math.abs(iDiff)) {
            iDiff > 0 ? oCastle.fence.height++ : oCastle.fence.height--;
            i++;
        } else {
            clearInterval(iInterval);
        }
    }, iTimeout);
}

function _initCanvas() {
    window._iModifier = Math.round(window.innerHeight / 150);

    document.getElementById("canvas").width = window.innerWidth;
    document.getElementById("canvas").height = window.innerHeight;
}

function _onLoad() {
    _initEventListeners();
    _initCanvas();
    _initGame();
}

window.onload = () => _onLoad();

window.onresize = () => _initCanvas();

// ---------------------------------------------------------------------------------------------------------------------
// ----- ||| PUBLIC ||| ------------------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------------------------
/**
 * Initializes the game
 * Initializes music, gameInterval, clouds and birds
 */
function _initGame() {
    window._music = new Sound("/sounds/music.mp3", 0.5, true);
    window._music.play();
    window._music.mute();
    window.__gameInterval = setInterval(() => Canvas._drawCanvas(this));
    _initializeClouds();
    _initializeBirds();
}

function toggleGame() {
    window.started = !window.started;
    if (window.started) {
        socket.emit('start');
    } else {
        socket.emit('quit');
    }
}

function pause() {
    socket.emit('pause');
}

/**
 * Stops all intervals and stops the music
 */
function quit() {
    window._music.stop();
    clearInterval(window.__gameInterval);
    clearInterval(window.__cloudSpawningInterval);
    clearInterval(window.__birdSpawningInterval1);
    clearInterval(window.__birdSpawningInterval2);
}

/**
 * Spawns cloud which moves automatically
 * @param [iSize] - size of cloud (e.g. 2,3,4,...)
 * @param [x] - x position of cloud (e.g. 0, 200, 400)
 */
function spawnCloud(iSize = 4, x = Math.round(Math.random() * 900 - 200)) {
    if (!window._aActiveClouds) {
        window._aActiveClouds = [];
    }

    if (!window._iCloudCount) {
        window._iCloudCount = 0;
    }

    const oCloud = {
        id: "__cloud_" + window._iCloudCount++,
        x: x,
        y: Math.round(Math.random() * 200 + 50),
        size: iSize,
        color: window._sCloudColor || _getRandomColor()
    };

    let i = oCloud.x;
    let iSpeed = window._sCloudSpeed || Math.round(Math.random() * 50) + 50;

    const iInterval = setInterval(() => {
        if (i < window.innerWidth + 100) {
            oCloud.x = i;
            i++;
        } else {
            window._aActiveClouds.splice(0, 1);
            clearInterval(iInterval);
        }
    }, iSpeed);

    window._aActiveClouds.push(oCloud);
}

/**
 * Animates the card deck
 * @param iPlayerId
 */
function animateCard(number, url) {
    if (window._placingCard) {
        return;
    }

    window._placingCard = true;
    const oCard = document.getElementById("card-" + iPlayerId);

    let styleSheet;
    for (let i = 0; i < document.styleSheets.length; i++) {
        const e = document.styleSheets[i];
        if (e.href.indexOf("host.css") !== -1) {
            styleSheet = e;
            break;
        }
    }
    const iIndex = styleSheet.cssRules.length;
    url = "https://classroomclipart.com/images/gallery/Clipart/Castles/TN_medieval-castle-with-flags-clipart.jpg";
    const sSide = iPlayerId === 1 ? "left" : "right";
    const sSidePercentage = iPlayerId === 1 ? "50%" : "-50%";

    const sRule1 =
        "@keyframes cardAnimation {" +
        "to {" +
        sSide + ": 50%;" +
        "bottom: 70%;" +
        "width: 12rem;" +
        "height: 14rem;" +
        "transform: rotateY(180deg) translate(" + sSidePercentage + ", 50%);" +
        "background-size: 100px 100px;" +
        "background: url('" + sUrl + "');" +
        "}" +
        "}";

    const sRule2 =
        ".cardAnimation {" +
        "animation-name: cardAnimation;" +
        "animation-duration: 1s;" +
        "animation-fill-mode: forwards" +
        "}";

    styleSheet.insertRule(sRule1, iIndex);
    styleSheet.insertRule(sRule2, iIndex + 1);

    oCard.classList.add("cardAnimation");
    setTimeout(() => {
        oCard.classList.remove("cardAnimation");
        styleSheet.deleteRule(iIndex);
        styleSheet.deleteRule(iIndex);
        window._placingCard = false;
    }, 3000);
}

/**
 * [TEST FUNCTION]
 * Spawns a bird on the cursor position
 * @param event - Event information of browser event 'onclick'
 */
function onCanvasClick(event) {
    // animateCard(Math.round(Math.random()+1));
    spawnBird(event.x, event.y);
}

/**
 * Spawns bird which moves automatically
 * @param x - coordinate
 * @param y - coordinate
 */
function spawnBird(x, y) {
    if (y >= window._iFloor) {
        return;
    }

    if (!window._aActiveBirds) {
        window._aActiveBirds = [];
    }

    if (!window._iBirdCount) {
        window._iBirdCount = 0;
    }

    const oBird = {
        id: "__bird_" + window._iBirdCount++,
        x: x || -20,
        y: y || Math.round(Math.random() * 200 + 50),
    };

    let i = oBird.x;

    const iInterval = setInterval(() => {
        if (i < window.innerWidth + 100) {
            oBird.x = i;
            i++;

            // random behavior of bird
            if (Math.random() > 0.95) {
                oBird.y++;
            } else if (Math.random() < 0.05) {
                oBird.y--;
            }
        } else {
            _deleteBird(oBird.id);
            clearInterval(iInterval);
        }
    }, 10);

    window._aActiveBirds.push(oBird);
}

/**
 * Enables or disables the fullscreen mode
 */
function toggleFullscreen() {
    const element = document.documentElement;
    if (element.requestFullscreen) {
        if (document.isFullScreen) {
            document.exitFullscreen();
        } else {
            element.requestFullscreen();
        }
    } else if (element.mozRequestFullScreen) {
        if (document.mozIsFullScreen) {
            document.mozExitFullscreen();
        } else {
            element.mozRequestFullscreen();
        }
    } else if (element.msRequestFullscreen) {
        if (document.msIsFullScreen) {
            document.msExitFullscreen();
        } else {
            element.msRequestFullscreen();
        }
    } else if (element.webkitRequestFullscreen) {
        if (document.webkitIsFullScreen) {
            document.webkitExitFullscreen();
        } else {
            element.webkitRequestFullscreen();
        }
    }
}

/**
 * Toggles the music
 */
function toggleMusic() {
    window._music.mute();
}


/**
 * Opens or closes the options dialog
 */
function toggleOptions() {
    const
        dialog = document.getElementById('options'),
        btnClose = document.getElementById('close');

    if (dialog.open) {
        dialog.close();
    } else {
        dialog.showModal();
        btnClose.focus();
        btnClose.addEventListener('click', toggleOptions);
        document.addEventListener('keydown', function (e) {
            if (e.key === "Escape") {
                dialog.close();
            }
        }, true);
    }
}

/**
 * Changes the volume of the game music
 * @param volume - Value from 0 to 1
 * @param event - Data of value change event of volume slider
 */
function changeVolume(volume, event) {
    if (event) {
        window._music.volume(event.srcElement.value / 100);
    }

    if (volume) {
        window._music.volume(volume);
    }
}

/**
 * Displays a notification message on the bottom of the screen
 * @param sText
 */
function toast(sText) {
    if (!window._aToasts) {
        window._aToasts = [];
    }
    window._aToasts.push(sText);

    if (!window._toasting) {
        _displayToast();
    }

    function _displayToast() {
        if (window._aToasts.length > 0) {
            window._toasting = true;
            const sText = window._aToasts[0];
            window._aToasts = window._aToasts.slice(1);
            const oToast = document.getElementById("toast");
            oToast.innerText = sText;
            oToast.classList.add("toastAnimation");
            setTimeout(() => {
                oToast.classList.remove("toastAnimation");
                setTimeout(() => _displayToast(), 100);
            }, 3000);
        } else {
            window._toasting = false;
        }
    }
}

/**
 * Kicks a player
 * @param number - Either '1' or '2'
 */
function kickPlayer(number) {
    socket.emit("clientKick", number);
}

function toggleQR() {
    const qr = document.getElementById("qrCode");
    if (qr.style.display === "block") {
        qr.style.display = "none";
    } else {
        qr.style.display = "block";
    }
}