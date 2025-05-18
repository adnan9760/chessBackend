"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameManager = void 0;
const Game_1 = require("./Game");
const ws_1 = require("ws");
const uuid_1 = require("uuid");
const radisclient_1 = require("./radisclient");
class GameManager {
    constructor() {
        this.activeGames = new Map();
        this.games = [];
        this.PendingUser = null;
        this.Users = new Map();
        this.activeGames = new Map();
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
                    this.activeGames.set(game.gameid, game);
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
                game.handleMove(socket, message.payload, this.spectators);
            }
            else if (message.type === "SPECTURUM") {
                const { gameId } = message.payload;
                if (!this.spectators.has(gameId)) {
                    this.spectators.set(gameId, []);
                }
                (_a = this.spectators.get(gameId)) === null || _a === void 0 ? void 0 : _a.push(socket);
                console.log(`User is now spectating game: ${gameId}`);
                radisclient_1.redisSubscriber.subscribe(`game:${gameId}`, (msg) => {
                    const spectators = this.spectators.get(gameId) || [];
                    for (const ws of spectators) {
                        if (ws.readyState === ws_1.WebSocket.OPEN) {
                            ws.send(msg);
                        }
                    }
                });
                // Send the current board state immediately to the spectator
                const game = this.activeGames.get(gameId); // <-- Make sure this is correct
                if (game) {
                    const initMessage = {
                        type: "initial_board_state",
                        board: game.Board.fen(),
                        moveHistory: game.moveHistory,
                    };
                    const spectators = this.spectators.get(gameId);
                    if (spectators) {
                        for (const ws of spectators) {
                            if (ws.readyState === ws_1.WebSocket.OPEN) {
                                ws.send(JSON.stringify(initMessage));
                            }
                        }
                    }
                }
                else {
                    console.warn("Game not found for gameId:", gameId);
                }
            }
            else if (message.type === "GETLIVEGAME") {
                console.log(this.activeGames);
                const gamesList = Array.from(this.activeGames.entries()).map(([gameid, game]) => ({
                    gameid,
                    white: game.Player1 || "Waiting",
                    black: game.Player2 || "Waiting",
                    createdAt: game.StartTime,
                }));
                console.log("gamesList", gamesList);
                socket.send(JSON.stringify({
                    type: "LIVEGAME",
                    payload: gamesList,
                }));
            }
        });
    }
}
exports.GameManager = GameManager;
