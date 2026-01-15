import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

describe('Socket.IO Server', () => {
  let ioServer: Server;
  let httpServer: any;
  let clientSocket1: ClientSocket;
  let clientSocket2: ClientSocket;
  const TEST_PORT = 3002;

  beforeEach(async () => {
    // Create a test server
    httpServer = createServer();
    ioServer = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // Set up game state management
    const games = new Map();
    const playerSockets = new Map();

    // Implement the same socket event handlers as in the real server
    ioServer.on('connection', (socket: Socket) => {
      socket.on('joinGame', ({ gameId, playerName }) => {
        let game = games.get(gameId);
        
        if (!game) {
          game = {
            id: gameId,
            player1: { socketId: socket.id, board: [], ships: [], ready: false, playerName: playerName || 'Player 1' },
            player2: null,
            gameStarted: false,
            currentTurn: 'player1'
          };
          games.set(gameId, game);
          playerSockets.set(socket.id, { gameId, playerNumber: 1 });
          
          socket.join(gameId);
          socket.emit('playerAssigned', { playerNumber: 1, game });
        } else if (!game.player2) {
          game.player2 = { socketId: socket.id, board: [], ships: [], ready: false, playerName: playerName || 'Player 2' };
          playerSockets.set(socket.id, { gameId, playerNumber: 2 });
          
          socket.join(gameId);
          socket.emit('playerAssigned', { playerNumber: 2, game });
          
          ioServer.to(game.player1.socketId).emit('opponentJoined', { opponentName: playerName });
          socket.emit('opponentJoined', { opponentName: game.player1.playerName });
        } else {
          socket.emit('gameFull');
        }
      });

      socket.on('updateShips', ({ gameId, ships, board }) => {
        const game = games.get(gameId);
        const playerInfo = playerSockets.get(socket.id);
        
        if (game && playerInfo) {
          if (playerInfo.playerNumber === 1) {
            game.player1.ships = ships;
            game.player1.board = board;
          } else {
            game.player2.ships = ships;
            game.player2.board = board;
          }
          
          const opponentSocket = playerInfo.playerNumber === 1 
            ? game.player2?.socketId 
            : game.player1.socketId;
          
          if (opponentSocket) {
            ioServer.to(opponentSocket).emit('opponentShipsUpdated', { shipsPlaced: ships.length });
          }
        }
      });

      socket.on('setReady', ({ gameId }) => {
        const game = games.get(gameId);
        const playerInfo = playerSockets.get(socket.id);
        
        if (game && playerInfo) {
          if (playerInfo.playerNumber === 1) {
            game.player1.ready = true;
          } else {
            game.player2.ready = true;
          }
          
          if (game.player1.ready && game.player2?.ready) {
            game.gameStarted = true;
            ioServer.to(gameId).emit('gameStarted');
          }
        }
      });

      socket.on('disconnect', () => {
        const playerInfo = playerSockets.get(socket.id);
        
        if (playerInfo) {
          const game = games.get(playerInfo.gameId);
          if (game) {
            const opponentSocket = playerInfo.playerNumber === 1 
              ? game.player2?.socketId 
              : game.player1?.socketId;
            
            if (opponentSocket) {
              if (game.gameStarted) {
                ioServer.to(opponentSocket).emit('opponentDisconnected', { 
                  message: 'Opponent disconnected. Game ended.' 
                });
              } else {
                ioServer.to(opponentSocket).emit('opponentDisconnected', { 
                  message: 'Opponent left before the game started.',
                  beforeGameStart: true
                });
              }
            }
            
            games.delete(playerInfo.gameId);
          }
          playerSockets.delete(socket.id);
        }
      });
    });

    await new Promise<void>((resolve) => {
      httpServer.listen(TEST_PORT, () => {
        resolve();
      });
    });
  });

  afterEach(() => {
    if (clientSocket1) clientSocket1.close();
    if (clientSocket2) clientSocket2.close();
    ioServer.close();
    httpServer.close();
  });

  it('should allow a player to join a game', async () => {
    clientSocket1 = Client(`http://localhost:${TEST_PORT}`);

    await new Promise<void>((resolve) => {
      clientSocket1.on('connect', () => {
        clientSocket1.emit('joinGame', { gameId: 'test123', playerName: 'Player1' });
      });

      clientSocket1.on('playerAssigned', ({ playerNumber }) => {
        expect(playerNumber).toBe(1);
        resolve();
      });
    });
  });

  it('should allow a second player to join the same game', async () => {
    clientSocket1 = Client(`http://localhost:${TEST_PORT}`);
    clientSocket2 = Client(`http://localhost:${TEST_PORT}`);

    await new Promise<void>((resolve) => {
      let player1Assigned = false;

      clientSocket1.on('connect', () => {
        clientSocket1.emit('joinGame', { gameId: 'test123', playerName: 'Player1' });
      });

      clientSocket1.on('playerAssigned', () => {
        player1Assigned = true;
        clientSocket2.emit('joinGame', { gameId: 'test123', playerName: 'Player2' });
      });

      clientSocket2.on('connect', () => {
        if (player1Assigned) {
          clientSocket2.emit('joinGame', { gameId: 'test123', playerName: 'Player2' });
        }
      });

      clientSocket2.on('playerAssigned', ({ playerNumber }) => {
        expect(playerNumber).toBe(2);
        resolve();
      });
    });
  });

  it('should notify player 1 when player 2 joins', async () => {
    clientSocket1 = Client(`http://localhost:${TEST_PORT}`);
    clientSocket2 = Client(`http://localhost:${TEST_PORT}`);

    await new Promise<void>((resolve) => {
      clientSocket1.on('connect', () => {
        clientSocket1.emit('joinGame', { gameId: 'test123', playerName: 'Player1' });
      });

      clientSocket1.on('playerAssigned', () => {
        clientSocket2.emit('joinGame', { gameId: 'test123', playerName: 'Player2' });
      });

      clientSocket1.on('opponentJoined', ({ opponentName }) => {
        expect(opponentName).toBe('Player2');
        resolve();
      });

      clientSocket2.on('connect', () => {
        // Wait for player1 to be assigned first
      });
    });
  });

  it('should reject third player trying to join full game', async () => {
    clientSocket1 = Client(`http://localhost:${TEST_PORT}`);
    clientSocket2 = Client(`http://localhost:${TEST_PORT}`);
    const clientSocket3 = Client(`http://localhost:${TEST_PORT}`);

    await new Promise<void>((resolve) => {
      let playersJoined = 0;

      clientSocket1.on('connect', () => {
        clientSocket1.emit('joinGame', { gameId: 'test123', playerName: 'Player1' });
      });

      clientSocket1.on('playerAssigned', () => {
        playersJoined++;
        if (playersJoined === 1) {
          clientSocket2.emit('joinGame', { gameId: 'test123', playerName: 'Player2' });
        }
      });

      clientSocket2.on('connect', () => {
        // Wait
      });

      clientSocket2.on('playerAssigned', () => {
        playersJoined++;
        if (playersJoined === 2) {
          clientSocket3.emit('joinGame', { gameId: 'test123', playerName: 'Player3' });
        }
      });

      clientSocket3.on('connect', () => {
        // Wait
      });

      clientSocket3.on('gameFull', () => {
        clientSocket3.close();
        resolve();
      });
    });
  });

  it('should update ships and notify opponent', async () => {
    clientSocket1 = Client(`http://localhost:${TEST_PORT}`);
    clientSocket2 = Client(`http://localhost:${TEST_PORT}`);

    const ships = [{ id: 0, name: 'Carrier', size: 5, positions: [], hits: 0 }];
    const board: any[] = [];

    await new Promise<void>((resolve) => {
      clientSocket1.on('connect', () => {
        clientSocket1.emit('joinGame', { gameId: 'test123', playerName: 'Player1' });
      });

      clientSocket1.on('playerAssigned', () => {
        clientSocket2.emit('joinGame', { gameId: 'test123', playerName: 'Player2' });
      });

      clientSocket2.on('connect', () => {
        // Wait
      });

      clientSocket2.on('playerAssigned', () => {
        clientSocket1.emit('updateShips', { gameId: 'test123', ships, board });
      });

      clientSocket2.on('opponentShipsUpdated', ({ shipsPlaced }) => {
        expect(shipsPlaced).toBe(1);
        resolve();
      });
    });
  });

  it('should start game when both players are ready', async () => {
    clientSocket1 = Client(`http://localhost:${TEST_PORT}`);
    clientSocket2 = Client(`http://localhost:${TEST_PORT}`);

    await new Promise<void>((resolve) => {
      clientSocket1.on('connect', () => {
        clientSocket1.emit('joinGame', { gameId: 'test123', playerName: 'Player1' });
      });

      clientSocket1.on('playerAssigned', () => {
        clientSocket2.emit('joinGame', { gameId: 'test123', playerName: 'Player2' });
      });

      clientSocket2.on('connect', () => {
        // Wait
      });

      clientSocket2.on('playerAssigned', () => {
        clientSocket1.emit('setReady', { gameId: 'test123' });
        setTimeout(() => {
          clientSocket2.emit('setReady', { gameId: 'test123' });
        }, 100);
      });

      clientSocket1.on('gameStarted', () => {
        resolve();
      });
    });
  });

  it('should notify opponent on disconnect', async () => {
    clientSocket1 = Client(`http://localhost:${TEST_PORT}`);
    clientSocket2 = Client(`http://localhost:${TEST_PORT}`);

    await new Promise<void>((resolve) => {
      clientSocket1.on('connect', () => {
        clientSocket1.emit('joinGame', { gameId: 'test123', playerName: 'Player1' });
      });

      clientSocket1.on('playerAssigned', () => {
        clientSocket2.emit('joinGame', { gameId: 'test123', playerName: 'Player2' });
      });

      clientSocket2.on('connect', () => {
        // Wait
      });

      clientSocket2.on('playerAssigned', () => {
        clientSocket1.close();
      });

      clientSocket2.on('opponentDisconnected', ({ message, beforeGameStart }) => {
        expect(message).toBeTruthy();
        expect(beforeGameStart).toBe(true);
        resolve();
      });
    });
  });
});
