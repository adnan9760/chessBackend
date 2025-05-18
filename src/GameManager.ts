import { Game } from "./Game";
import { WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid"; 
import { redisSubscriber } from "./radisclient";

export class GameManager {
    public games: Game[];
    public PendingUser: WebSocket | null;
    public Users: Map<string, WebSocket>; 
    public spectators: Map<string, WebSocket[]>;
public activeGames: Map<string, Game> = new Map();



    constructor() {
        this.games = [];
        this.PendingUser = null;
        this.Users = new Map(); 
        this.activeGames=new Map();
        this.spectators = new Map();
    }

    addUser(socket: WebSocket) {
        const userId = uuidv4();
        (socket as any).id = userId; 
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

    removeUser(userId: string) {
        this.Users.delete(userId);
    }

    handleMsg(socket: WebSocket) {
        socket.on("message", (data: any) => {
            let message;
            try {
                message = JSON.parse(data.toString());
            } catch (error) {
                console.error("Invalid message format:", data.toString());
                return;
            }

            console.log("Received message:", message);

            if (message.type === "INIT_GAME") {

                if (this.PendingUser) {
                    const game = new Game(this.PendingUser, socket);
                    this.games.push(game);
                    this.PendingUser = null;
                    console.log("Game created between players");
                    console.log("gameid",game.gameid);
                   this.activeGames.set(game.gameid, game); 

                } else {
                    this.PendingUser = socket;
                    console.log("Waiting for an opponent");
                }
            } else if (message.type === "MOVE") {
                const userId = (socket as any).id;
                const game = this.games.find(
                    (game) =>
                        (game.Player1 as any).id === userId || (game.Player2 as any).id === userId
                );

                console.log('gamme',game);

                if (!game) {
                    console.error("Game not found for the player");
                    return;
                }

                game.handleMove(socket, message.payload,this.spectators);
            }
           else if (message.type === "SPECTURUM") {
  const { gameId } = message.payload;

  if (!this.spectators.has(gameId)) {
    this.spectators.set(gameId, []);
  }

  this.spectators.get(gameId)?.push(socket);

  console.log(`User is now spectating game: ${gameId}`);

  redisSubscriber.subscribe(`game:${gameId}`, (msg) => {
    const spectators = this.spectators.get(gameId) || [];

    for (const ws of spectators) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg); 
      }
    }
  });

  const game = this.activeGames.get(gameId);

  if (game) {
    const initMessage = {
      type: "initial_board_state",
      board: game.Board.fen(), 
      moveHistory: game.moveHistory,
    };

    const spectators = this.spectators.get(gameId);
    if (spectators) {
      for (const ws of spectators) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(initMessage)); 
        }
      }
    }
  } else {
    console.warn("Game not found for gameId:", gameId);
  }
}

            else if(message.type === "GETLIVEGAME"){
                console.log(this.activeGames);
                const gamesList = Array.from(this.activeGames.entries()).map(([gameid, game]) => ({
  gameid,
  white: game.Player1 || "Waiting",
  black: game.Player2|| "Waiting",
  createdAt: game.StartTime,
}));
console.log("gamesList", gamesList);



      socket.send(JSON.stringify({
        type: "LIVEGAME",
        payload: gamesList,
      }))
            }
        });
    }
}
