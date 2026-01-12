# Sea Battle - Multiplayer Setup

## How to Play Online Multiplayer

### 1. Start the Server
In one terminal, run:
```bash
npm run server
```
This starts the WebSocket server on port 3001.

### 2. Start the Game (Frontend)
In another terminal, run:
```bash
npm run dev
```
This starts the game on http://localhost:5173

### 3. Play with a Friend

**For Player 1:**
1. Open http://localhost:5173 in your browser
2. Select "🌐 Online Multiplayer"
3. Enter a Game ID (e.g., "game123")
4. Click "Join Game"
5. You'll be assigned as Player 1
6. Place your ships (manually or auto)
7. Click "Ready" when done
8. Wait for Player 2

**For Player 2:**
1. Open http://localhost:5173 in a **NEW BROWSER TAB/WINDOW** (or different computer)
2. Select "🌐 Online Multiplayer"
3. Enter the **SAME Game ID** as Player 1 (e.g., "game123")
4. Click "Join Game"
5. You'll be assigned as Player 2
6. Place your ships (manually or auto)
7. Click "Ready" when done

**Important:**
- Each player can only see their own ships
- Both players must be ready before the game starts
- Player 1 goes first
- The game is in real-time - attacks are synced instantly!

### Game Modes

- **👥 Player vs Player (Local)**: Two players on the same device taking turns
- **🌐 Online Multiplayer**: Two players in different browser windows/tabs
- **🤖 Player vs Computer**: Play against AI

### Tips

- Use a unique Game ID to create a private game
- Share the Game ID with your friend to let them join
- If connection is lost, the game will notify both players
