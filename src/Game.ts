import { WebSocket } from "ws";
import { Chess } from "chess.js";
import { v4 as uuidv4 } from "uuid"; 
import { redisPublisher } from "./radisclient";

export class Game {
    public Player1: WebSocket;
    public Player2: WebSocket;
    public Board: Chess;
    public gameid :string;
    public StartTime: Date;
    public moveHistory: any[] = [];

    constructor(Player1: WebSocket, Player2: WebSocket) {
        this.Player1 = Player1;
        this.Player2 = Player2;
        this.Board = new Chess();
        this.StartTime = new Date();
        this.gameid = uuidv4();
        (Player1 as any).gameid = (Player1 as any).gameid || "Player1";
        (Player2 as any).gameid = (Player2 as any).gameid || "Player2";

        this.Player1.send(
            JSON.stringify({
                type: "INIT_GAME",
                payload: { color: "white",
                gameId:this.gameid
                },
            })
        );
        this.Player2.send(
            JSON.stringify({
                type: "INIT_GAME",
                payload: { color: "black",
                    gameId:this.gameid
                 },
            })
        );
    }

    async handleMove(socket: WebSocket, move: { from: string; to: string },spectators:Map<string, WebSocket[]>) {
        try {
const playercolor =socket=== this.Player1 ?"w":"b";
             const usermovefrom = move.from;
             const usermoveto = move.to;

             const currentTurn = this.Board.turn();

             if(playercolor !== currentTurn){
                socket.send(JSON.stringify({
                    type: "Error", message: "Not your turn" 
                }))
                return;
             }
           
              const result = this.Board.move({
                from: usermovefrom.toLowerCase(),
                to: usermoveto.toLowerCase(),
                promotion:'q'
              })
 
            if (!result) throw new Error("Invalid move");
            this.moveHistory.push(result);
            const payload = JSON.stringify({
                type: 'MOVE',
                payload: result,
            });
            this.Player1.send(payload);
            this.Player2.send(payload);
 const gameSpectators = spectators.get(this.gameid) || [];
console.log(gameSpectators);
for (const spec of gameSpectators) {
  
    spec.send(payload);
  
}

    
            
            await redisPublisher.publish(`game:${this.gameid}`, payload);
            if (this.Board.isGameOver()) {
                const gameOverMessage = JSON.stringify({
                    type: "GameOver",
                    message: "Game over",
                });
                this.Player1.send(gameOverMessage);
                this.Player2.send(gameOverMessage);
                for (const spec of gameSpectators) {
  
               spec.send(gameOverMessage);
  
}
                await redisPublisher.publish(`game:${this.gameid}`, gameOverMessage);
            }

            
        } catch (error) {
            console.error("Move handling error:", error);
            socket.send(
                JSON.stringify({
                    type: "Error",
                    message: "Invalid move",
                })
            );
        }
    }

    restoreGameFromMemory() {
        this.Board.reset();
        for (const move of this.moveHistory) {
          this.Board.move(move);
        }
      }
  
}

