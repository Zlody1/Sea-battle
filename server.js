import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const games = new Map(); // gameId -> game state
const playerSockets = new Map(); // socketId -> {gameId, playerNumber}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('joinGame', (gameId) => {
    let game = games.get(gameId);
    
    if (!game) {
      // Create new game
      game = {
        id: gameId,
        player1: { socketId: socket.id, board: [], ships: [], ready: false },
        player2: null,
        gameStarted: false,
        currentTurn: 'player1'
      };
      games.set(gameId, game);
      playerSockets.set(socket.id, { gameId, playerNumber: 1 });
      
      socket.join(gameId);
      socket.emit('playerAssigned', { playerNumber: 1, game });
      console.log(`Player 1 joined game ${gameId}`);
    } else if (!game.player2) {
      // Join as player 2
      game.player2 = { socketId: socket.id, board: [], ships: [], ready: false };
      playerSockets.set(socket.id, { gameId, playerNumber: 2 });
      
      socket.join(gameId);
      socket.emit('playerAssigned', { playerNumber: 2, game });
      
      // Notify player 1
      io.to(game.player1.socketId).emit('opponentJoined');
      console.log(`Player 2 joined game ${gameId}`);
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
        // Notify opponent
        const opponentSocket = playerInfo.playerNumber === 1 
          ? game.player2?.socketId 
          : game.player1?.socketId;
        
        if (opponentSocket) {
          io.to(opponentSocket).emit('opponentDisconnected');
        }
        
        // Clean up game
        games.delete(playerInfo.gameId);
      }
      playerSockets.delete(socket.id);
    }
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
