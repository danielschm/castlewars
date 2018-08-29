const Player = require("./Player.js");

module.exports = class ConnectionHelper {
    constructor(game) {
        this.game = game;
        this.io = game.io;
        this.players = [];
    }

    handleClientJoin(socket, id, fnCallback) {
        let number;
        if (!this.game.player1) {
            number = 1;
        } else if (!this.game.player2) {
            number = 2;
        } else {
            console.warn("No client slot available");
            return;
        }

        let oPlayer = this.players.find(e => e.id === id);

        if (!oPlayer) {
            oPlayer = new Player({id, number, socket}, true, true);
            this.players.push(oPlayer);
        } else if (!this.game.started) {
            oPlayer.number = number;
        }

        this.game.addPlayer(oPlayer);

        console.log("Player " + number + " joined the game");
        this.io.to("host").emit("toast", "Spieler " + number + " ist dem Spiel beigetreten");

        if (fnCallback) {
            fnCallback(number);
        }
    }

    handleClientDisconnected(socket, number, fnCallback) {
        this.game.removePlayer(number);
        socket.emit("leave");

        if (this.game.started) {
            this.game.pause();
        }

        console.log("Player " + number + " left the game");
        this.io.to("host").emit("toast", "Spieler " + number + " hat das Spiel verlassen");

        if (fnCallback) {
            fnCallback();
        }
    }
};
