"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
const chess_js_1 = require("chess.js");
const uuid_1 = require("uuid");
const radisclient_1 = require("./radisclient");
class Game {
    constructor(Player1, Player2) {
        this.moveHistory = [];
        this.Player1 = Player1;
        this.Player2 = Player2;
        this.Board = new chess_js_1.Chess();
        this.StartTime = new Date();
        this.gameid = (0, uuid_1.v4)();
        Player1.gameid = Player1.gameid || "Player1";
        Player2.gameid = Player2.gameid || "Player2";
        this.Player1.send(JSON.stringify({
            type: "INIT_GAME",
            payload: { color: "white",
                gameId: this.gameid
            },
        }));
        this.Player2.send(JSON.stringify({
            type: "INIT_GAME",
            payload: { color: "black",
                gameId: this.gameid
            },
        }));
    }
    handleMove(socket, move) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const playercolor = socket === this.Player1 ? "w" : "b";
                const usermovefrom = move.from;
                const usermoveto = move.to;
                const currentTurn = this.Board.turn();
                if (playercolor !== currentTurn) {
                    socket.send(JSON.stringify({
                        type: "Error", message: "Not your turn"
                    }));
                    return;
                }
                const result = this.Board.move({
                    from: usermovefrom.toLowerCase(),
                    to: usermoveto.toLowerCase(),
                    promotion: 'q'
                });
                if (!result)
                    throw new Error("Invalid move");
                this.moveHistory.push(result);
                const payload = JSON.stringify({
                    type: 'MOVE',
                    payload: result,
                });
                this.Player1.send(payload);
                this.Player2.send(payload);
                yield radisclient_1.redisPublisher.publish(`game:${this.gameid}`, payload);
                if (this.Board.isGameOver()) {
                    const gameOverMessage = JSON.stringify({
                        type: "GameOver",
                        message: "Game over",
                    });
                    this.Player1.send(gameOverMessage);
                    this.Player2.send(gameOverMessage);
                    yield radisclient_1.redisPublisher.publish(`game:${this.gameid}`, gameOverMessage);
                }
            }
            catch (error) {
                console.error("Move handling error:", error);
                socket.send(JSON.stringify({
                    type: "Error",
                    message: "Invalid move",
                }));
            }
        });
    }
    restoreGameFromMemory() {
        this.Board.reset();
        for (const move of this.moveHistory) {
            this.Board.move(move);
        }
    }
}
exports.Game = Game;
