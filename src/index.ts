import { WebSocketServer } from 'ws';
import { GameManager } from './GameManager';

const wss = new WebSocketServer({ port: 8080 });
const gamemanager = new GameManager();

wss.on('connection', function connection(ws) {
    console.log('New user connected');
    gamemanager.addUser(ws);

    ws.on('close', () => {
        console.log('User disconnected');
        gamemanager.removeUser((ws as any).id); 
    });
});
