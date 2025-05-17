"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameManager = void 0;
const Game_1 = require("./Game");
const uuid_1 = require("uuid");
const radisclient_1 = require("./radisclient");
class GameManager {
    constructor() {
        this.games = [];
        this.PendingUser = null;
        this.Users = new Map();
        this.spectators = new Map();
    }
    addUser(socket) {
        const userId = (0, uuid_1.v4)();
        socket.id = userId;
        this.Users.set(userId, socket);
        console.log(`User connected: ${userId}`);
        this.handleMsg(socket);
        socket.on("close", () => {
            console.log(`User disconnected: ${userId}`);
            this.removeUser(userId);
            if (this.PendingUser === socket) {
                this.PendingUser = null;
                console.log("Cleared pending user");
            }
        });
    }
    removeUser(userId) {
        this.Users.delete(userId);
    }
    handleMsg(socket) {
        socket.on("message", (data) => {
            var _a;
            let message;
            try {
                message = JSON.parse(data.toString());
            }
            catch (error) {
                console.error("Invalid message format:", data.toString());
                return;
            }
            console.log("Received message:", message);
            if (message.type === "INIT_GAME") {
                if (this.PendingUser) {
                    const game = new Game_1.Game(this.PendingUser, socket);
                    this.games.push(game);
                    this.PendingUser = null;
                    console.log("Game created between players");
                    console.log("gameid", game.gameid);
                }
                else {
                    this.PendingUser = socket;
                    console.log("Waiting for an opponent");
                }
            }
            else if (message.type === "MOVE") {
                const userId = socket.id;
                const game = this.games.find((game) => game.Player1.id === userId || game.Player2.id === userId);
                console.log('gamme', game);
                if (!game) {
                    console.error("Game not found for the player");
                    return;
                }
                game.handleMove(socket, message.payload);
            }
            else if (message.type === "SPECTURUM") {
                const { gameId } = message.payload;
                if (!this.spectators.has(gameId)) {
                    this.spectators.set(gameId, []);
                }
                radisclient_1.redisSubscriber.subscribe(`game:${gameId}`, (msg) => {
                    const spector = this.spectators.get(gameId) || [];
                    spector.forEach(socket => {
                        socket.send(msg);
                    });
                });
                (_a = this.spectators.get(gameId)) === null || _a === void 0 ? void 0 : _a.push(socket);
                console.log(`User is now spectating game: ${gameId}`);
            }
        });
    }
}
exports.GameManager = GameManager;
