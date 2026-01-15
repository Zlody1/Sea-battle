# Backend

This folder contains the backend server files for the Sea Battle game.

## Files

- **server.js** - Main server file with Socket.IO for multiplayer and HTTP API for game results
- **database.js** - Database module for storing and retrieving game results
- **game-results.json** - Database file (auto-generated, gitignored)

## Running the Server

From the project root:

```bash
npm run server
```

Or directly:

```bash
node backend/server.js
```

The server will run on port 3001 by default.

## API Endpoints

- `GET /api/results` - Fetch all game results
- `POST /api/results` - Save a new game result

## Socket.IO Events

### Client → Server
- `joinGame` - Join or create a game
- `updateShips` - Update player's ship positions
- `setReady` - Mark player as ready
- `updatePlayerName` - Update player's name
- `attack` - Attack opponent's board

### Server → Client
- `playerAssigned` - Assigned player number
- `opponentJoined` - Opponent joined the game
- `opponentShipsUpdated` - Opponent updated ships
- `opponentReady` - Opponent is ready
- `opponentNameUpdated` - Opponent changed name
- `gameStarted` - Game has started
- `attackResult` - Result of your attack
- `attacked` - You were attacked
- `turnChanged` - Turn changed
- `opponentDisconnected` - Opponent disconnected
- `gameFull` - Game is full
