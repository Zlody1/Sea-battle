import { createServer } from 'http';
import { Server } from 'socket.io';
import { getGameResults, saveGameResult } from './database.js';
import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const httpServer = createServer(async (req, res) => {
  // Enable CORS - allow both localhost and EC2
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // GET /api/results - Fetch game results
  if (req.method === 'GET' && req.url === '/api/results') {
    try {
      const results = await getGameResults();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(results));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch results' }));
    }
    return;
  }

  // POST /api/results - Save game result
  if (req.method === 'POST' && req.url === '/api/results') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const result = JSON.parse(body);
        const results = await saveGameResult(result);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to save result' }));
      }
    });
    return;
  }

  // Serve static files from dist folder
  try {
    const distPath = join(__dirname, '..', 'dist');
    let filePath = join(distPath, req.url === '/' ? 'index.html' : req.url);
    
    // If file doesn't have extension, try .html
    if (!extname(filePath)) {
      filePath += '.html';
    }
    
    const content = await readFile(filePath);
    const ext = extname(filePath);
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
    };
    
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
    res.end(content);
  } catch (error) {
    // If file not found, try serving index.html for SPA routing
    try {
      const indexPath = join(__dirname, '..', 'dist', 'index.html');
      const content = await readFile(indexPath);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  }
});

const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:8080", "http://localhost:8081", "http://ec2-54-75-57-244.eu-west-1.compute.amazonaws.com:8080", "http://ec2-54-75-57-244.eu-west-1.compute.amazonaws.com:8081"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const games = new Map(); // gameId -> game state
const playerSockets = new Map(); // socketId -> {gameId, playerNumber}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('joinGame', ({ gameId, playerName }) => {
    let game = games.get(gameId);
    
    if (!game) {
      // Create new game
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
      console.log(`Player 1 (${playerName}) joined game ${gameId}`);
    } else if (!game.player2) {
      // Join as player 2
      game.player2 = { socketId: socket.id, board: [], ships: [], ready: false, playerName: playerName || 'Player 2' };
      playerSockets.set(socket.id, { gameId, playerNumber: 2 });
      
      socket.join(gameId);
      socket.emit('playerAssigned', { playerNumber: 2, game });
      
      // Notify player 1 with player 2's name
      io.to(game.player1.socketId).emit('opponentJoined', { opponentName: playerName });
      // Send player 1's name to player 2
      socket.emit('opponentJoined', { opponentName: game.player1.playerName });
      console.log(`Player 2 (${playerName}) joined game ${gameId}`);
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
      
      // Notify opponent (without revealing ship positions)
      const opponentSocket = playerInfo.playerNumber === 1 
        ? game.player2?.socketId 
        : game.player1.socketId;
      
      if (opponentSocket) {
        io.to(opponentSocket).emit('opponentShipsUpdated', { shipsPlaced: ships.length });
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
      
      // Check if both ready
      if (game.player1.ready && game.player2?.ready) {
        game.gameStarted = true;
        io.to(gameId).emit('gameStarted');
      } else {
        // Notify opponent
        const opponentSocket = playerInfo.playerNumber === 1 
          ? game.player2?.socketId 
          : game.player1.socketId;
        
        if (opponentSocket) {
          io.to(opponentSocket).emit('opponentReady');
        }
      }
    }
  });

  socket.on('updatePlayerName', ({ gameId, playerName }) => {
    const game = games.get(gameId);
    const playerInfo = playerSockets.get(socket.id);
    
    if (game && playerInfo) {
      if (playerInfo.playerNumber === 1) {
        game.player1.playerName = playerName;
        // Notify player 2
        if (game.player2?.socketId) {
          io.to(game.player2.socketId).emit('opponentNameUpdated', { playerName });
        }
      } else {
        game.player2.playerName = playerName;
        // Notify player 1
        io.to(game.player1.socketId).emit('opponentNameUpdated', { playerName });
      }
    }
  });

  socket.on('attack', ({ gameId, row, col }) => {
    const game = games.get(gameId);
    const playerInfo = playerSockets.get(socket.id);
    
    if (game && playerInfo && game.gameStarted) {
      // Verify it's the player's turn
      const isPlayer1Turn = game.currentTurn === 'player1';
      if ((isPlayer1Turn && playerInfo.playerNumber !== 1) || 
          (!isPlayer1Turn && playerInfo.playerNumber !== 2)) {
        return;
      }
      
      // Get opponent's board
      const opponentData = playerInfo.playerNumber === 1 ? game.player2 : game.player1;
      const opponentBoard = opponentData.board;
      
      if (!opponentBoard[row] || !opponentBoard[row][col]) {
        return;
      }
      
      const cell = opponentBoard[row][col];
      
      // Check for hit or miss
      const isHit = cell.hasShip;
      let shipSunk = false;
      let sunkShipName = null;
      
      // Update opponent's board
      opponentBoard[row][col] = {
        ...cell,
        isHit: isHit,
        isMiss: !isHit
      };
      
      if (isHit && cell.shipId !== null) {
        // Update ship hits
        const ship = opponentData.ships[cell.shipId];
        ship.hits = (ship.hits || 0) + 1;
        
        if (ship.hits === ship.size) {
          shipSunk = true;
          sunkShipName = ship.name;
        }
      }
      
      // Check for win
      const allSunk = opponentData.ships.every(ship => ship.hits === ship.size);
      
      // Send results to both players
      const attackResult = {
        row,
        col,
        isHit,
        shipSunk,
        sunkShipName,
        gameOver: allSunk,
        winner: allSunk ? (playerInfo.playerNumber === 1 ? 'player1' : 'player2') : null
      };
      
      // Send to attacker
      socket.emit('attackResult', attackResult);
      
      // Send to defender (with updated board)
      const defenderSocket = playerInfo.playerNumber === 1 
        ? game.player2.socketId 
        : game.player1.socketId;
      
      io.to(defenderSocket).emit('attacked', {
        row,
        col,
        isHit,
        shipSunk,
        sunkShipName,
        gameOver: allSunk,
        winner: attackResult.winner
      });
      
      // Save game result to database if game is over
      if (allSunk) {
        const winnerName = playerInfo.playerNumber === 1 ? game.player1.playerName : game.player2.playerName;
        const loserName = playerInfo.playerNumber === 1 ? game.player2.playerName : game.player1.playerName;
        
        const result = {
          id: Date.now().toString(),
          date: new Date().toLocaleString(),
          player1Name: game.player1.playerName,
          player2Name: game.player2.playerName,
          winner: winnerName,
          gameMode: 'online'
        };
        
        saveGameResult(result).catch(err => {
          console.error('Failed to save game result:', err);
        });
      }
      
      // Switch turns if miss or game over
      if (!isHit || allSunk) {
        game.currentTurn = game.currentTurn === 'player1' ? 'player2' : 'player1';
        io.to(gameId).emit('turnChanged', { currentTurn: game.currentTurn });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const playerInfo = playerSockets.get(socket.id);
    
    if (playerInfo) {
      const game = games.get(playerInfo.gameId);
      if (game) {
        const isPlayer1 = playerInfo.playerNumber === 1;
        
        // If Player 1 disconnects, close the game entirely
        if (isPlayer1) {
          const opponentSocket = game.player2?.socketId;
          if (opponentSocket) {
            io.to(opponentSocket).emit('opponentDisconnected', { 
              message: game.gameStarted ? 'Host disconnected. Game ended.' : 'Host left. Game closed.',
              gameEnded: true
            });
          }
          // Delete the game
          games.delete(playerInfo.gameId);
          console.log(`Game ${playerInfo.gameId} closed - Player 1 (host) left`);
        } 
        // If Player 2 disconnects, keep the game open for Player 1
        else {
          const player1Socket = game.player1?.socketId;
          if (player1Socket) {
            io.to(player1Socket).emit('opponentDisconnected', { 
              message: game.gameStarted ? 'Opponent disconnected. Waiting for new player...' : 'Opponent left. Waiting for new player...',
              beforeGameStart: !game.gameStarted,
              gameEnded: false
            });
          }
          
          // Reset Player 2 slot but keep the game
          game.player2 = null;
          game.gameStarted = false;
          game.currentTurn = 'player1';
          
          // Reset Player 1's ready state
          if (game.player1) {
            game.player1.ready = false;
          }
          
          console.log(`Player 2 left game ${playerInfo.gameId} - Game remains open for Player 1`);
        }
      }
      playerSockets.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Listen on all network interfaces
httpServer.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
});
