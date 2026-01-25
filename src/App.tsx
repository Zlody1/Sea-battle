import { useState, useEffect } from 'react'
import './App.css'
import GameBoard from './components/GameBoard'
import { useMultiplayer } from './hooks/useMultiplayer'
import { saveGameResult, getGameResults, GameResult } from './utils/gameResults'

const GRID_SIZE = 10

interface ShipTemplate {
  name: string
  size: number
}

const SHIPS: ShipTemplate[] = [
  { name: 'Carrier', size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Destroyer', size: 2 }
]

interface Cell {
  hasShip: boolean
  isHit: boolean
  isMiss: boolean
  shipId: number | null
}

type Board = Cell[][]

interface Position {
  row: number
  col: number
}

interface Ship extends ShipTemplate {
  id: number
  positions: Position[]
  hits: number
}

type Turn = 'player' | 'computer'
type GameMode = 'pvp' | 'pvc' | 'online' | null

function App() {
  const multiplayer = useMultiplayer()
  
  const [gameMode, setGameMode] = useState<GameMode>(null)
  const [playerBoard, setPlayerBoard] = useState<Board>([])
  const [computerBoard, setComputerBoard] = useState<Board>([])
  const [playerShips, setPlayerShips] = useState<Ship[]>([])
  const [computerShips, setComputerShips] = useState<Ship[]>([])
  const [gameStarted, setGameStarted] = useState<boolean>(false)
  const [gameOver, setGameOver] = useState<boolean>(false)
  const [winner, setWinner] = useState<Turn | null>(null)
  const [currentTurn, setCurrentTurn] = useState<Turn>('player')
  const [message, setMessage] = useState<string>('Select game mode!')
  const [showingTransition, setShowingTransition] = useState<boolean>(false)
  const [player1Ready, setPlayer1Ready] = useState<boolean>(false)
  const [player2Ready, setPlayer2Ready] = useState<boolean>(false)
  const [gameIdInput, setGameIdInput] = useState<string>('')
  
  // Manual placement states
  const [isPlacingManually, setIsPlacingManually] = useState<boolean>(false)
  const [player1ShipIndex, setPlayer1ShipIndex] = useState<number>(0)
  const [player2ShipIndex, setPlayer2ShipIndex] = useState<number>(0)
  const [player1Orientation, setPlayer1Orientation] = useState<'horizontal' | 'vertical'>('horizontal')
  const [player2Orientation, setPlayer2Orientation] = useState<'horizontal' | 'vertical'>('horizontal')
  const [player1PreviewPosition, setPlayer1PreviewPosition] = useState<{ row: number; col: number } | null>(null)
  const [player2PreviewPosition, setPlayer2PreviewPosition] = useState<{ row: number; col: number } | null>(null)

  // Computer AI states
  const [lastHit, setLastHit] = useState<Position | null>(null)
  const [targetQueue, setTargetQueue] = useState<Position[]>([])
  
  // Game results
  const [gameResults, setGameResults] = useState<GameResult[]>([])

  // Suppress unused variable warning - winner and lastHit are set for future use
  void winner
  void lastHit

  useEffect(() => {
    initializeGame()
    // Fetch game results from server
    getGameResults().then(results => setGameResults(results))
    
    // Check if there's a game ID in the URL
    const urlParams = new URLSearchParams(window.location.search)
    const gameIdFromUrl = urlParams.get('game')
    
    // Auto-join if there's a game ID in URL
    if (gameIdFromUrl) {
      setGameMode('online')
      setGameIdInput(gameIdFromUrl)
      // Auto-join after a short delay to ensure everything is initialized
      setTimeout(() => {
        multiplayer.joinGame(gameIdFromUrl)
        setMessage(`Joining game ${gameIdFromUrl}... Waiting for opponent...`)
      }, 500)
    }
  }, [])

  // Multiplayer event listeners
  useEffect(() => {
    if (!multiplayer.socket || gameMode !== 'online') return

    const handleGameStarted = () => {
      setGameStarted(true)
      setPlayer1Ready(true)
      setPlayer2Ready(true)
      setMessage(multiplayer.playerNumber === 1 ? "Game started! Your turn!" : "Game started! Opponent's turn")
    }

    const handleAttackResult = (result: any) => {
      const newBoard = [...computerBoard]
      newBoard[result.row][result.col] = {
        ...newBoard[result.row][result.col],
        isHit: result.isHit,
        isMiss: !result.isHit
      }
      setComputerBoard(newBoard)

      if (result.gameOver) {
        setGameOver(true)
        setWinner('player')
        setMessage('🎉 You won! All enemy ships destroyed!')
        saveResult(multiplayer.playerName, multiplayer.opponentName)
        setTimeout(() => initializeGame(), 3000)
      } else if (result.shipSunk) {
        setMessage(`You sunk the ${result.sunkShipName}! Take another shot!`)
      } else if (result.isHit) {
        setMessage('Hit! Take another shot!')
      } else {
        setMessage("Miss! Opponent's turn...")
      }
    }

    const handleAttacked = (result: any) => {
      const newBoard = [...playerBoard]
      const newShips = [...playerShips]
      
      newBoard[result.row][result.col] = {
        ...newBoard[result.row][result.col],
        isHit: result.isHit,
        isMiss: !result.isHit
      }
      
      if (result.isHit && newBoard[result.row][result.col].shipId !== null) {
        const shipId = newBoard[result.row][result.col].shipId!
        newShips[shipId].hits = (newShips[shipId].hits || 0) + 1
      }
      
      setPlayerBoard(newBoard)
      setPlayerShips(newShips)

      if (result.gameOver) {
        setGameOver(true)
        setWinner('computer')
        setMessage('💀 Game Over! Opponent won!')
        saveResult(multiplayer.opponentName, multiplayer.playerName)
        setTimeout(() => initializeGame(), 3000)
      } else if (result.shipSunk) {
        setMessage(`Opponent sunk your ${result.sunkShipName}!`)
      } else if (result.isHit) {
        setMessage('Opponent hit your ship!')
      } else {
        setMessage('Opponent missed! Your turn!')
      }
    }

    const handleTurnChanged = ({ currentTurn: turn }: any) => {
      const isMyTurn = (turn === 'player1' && multiplayer.playerNumber === 1) ||
                       (turn === 'player2' && multiplayer.playerNumber === 2)
      setCurrentTurn(isMyTurn ? 'player' : 'computer')
    }

    multiplayer.socket.on('gameStarted', handleGameStarted)
    multiplayer.socket.on('attackResult', handleAttackResult)
    multiplayer.socket.on('attacked', handleAttacked)
    multiplayer.socket.on('turnChanged', handleTurnChanged)

    return () => {
      multiplayer.socket?.off('gameStarted', handleGameStarted)
      multiplayer.socket?.off('attackResult', handleAttackResult)
      multiplayer.socket?.off('attacked', handleAttacked)
      multiplayer.socket?.off('turnChanged', handleTurnChanged)
    }
  }, [multiplayer.socket, gameMode, computerBoard, playerBoard, playerShips, multiplayer.playerNumber])

  // Update multiplayer server when ships change
  useEffect(() => {
    if (gameMode === 'online' && playerShips.length > 0) {
      multiplayer.updateShips(playerShips, playerBoard)
    }
  }, [playerShips, playerBoard, gameMode])

  const createEmptyBoard = (): Board => {
    return Array(GRID_SIZE).fill(null).map(() => 
      Array(GRID_SIZE).fill(null).map(() => ({
        hasShip: false,
        isHit: false,
        isMiss: false,
        shipId: null
      }))
    )
  }

  const saveResult = async (winnerName: string, loserName: string): Promise<void> => {
    // Only save for non-online games (online games are saved on server)
    if (gameMode === 'online') {
      // Refresh results to show the latest from server
      const results = await getGameResults();
      setGameResults(results);
      return;
    }
    
    const result: GameResult = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      player1Name: winnerName,
      player2Name: loserName,
      winner: winnerName,
      gameMode: gameMode as 'pvp' | 'pvc' | 'online'
    };
    
    await saveGameResult(result);
    const results = await getGameResults();
    setGameResults(results);
  }

  const initializeGame = (): void => {
    const newPlayerBoard = createEmptyBoard()
    const newComputerBoard = createEmptyBoard()
    
    setPlayerBoard(newPlayerBoard)
    setComputerBoard(newComputerBoard)
    setPlayerShips([])
    setComputerShips([])
    setGameStarted(false)
    setGameOver(false)
    setWinner(null)
    setCurrentTurn('player')
    setMessage('Select game mode!')
    setIsPlacingManually(false)
    setPlayer1ShipIndex(0)
    setPlayer2ShipIndex(0)
    setPlayer1Orientation('horizontal')
    setPlayer2Orientation('horizontal')
    setPlayer1PreviewPosition(null)
    setPlayer2PreviewPosition(null)
    setLastHit(null)
    setTargetQueue([])
    setGameMode(null)
    setShowingTransition(false)
    setPlayer1Ready(false)
    setPlayer2Ready(false)
    
    // Clear URL when resetting game
    window.history.replaceState({}, '', window.location.pathname)
    
    // Disconnect from multiplayer if connected
    if (multiplayer.socket && multiplayer.socket.connected) {
      multiplayer.socket.disconnect()
    }
  }

  const selectGameMode = (mode: GameMode): void => {
    setGameMode(mode)
    const newPlayerBoard = createEmptyBoard()
    const newComputerBoard = createEmptyBoard()
    
    setPlayerBoard(newPlayerBoard)
    setComputerBoard(newComputerBoard)
    setPlayerShips([])
    setComputerShips([])
    
    if (mode === 'pvc') {
      const computerResult = placeShipsRandomly(newComputerBoard)
      setComputerBoard(computerResult.board)
      setComputerShips(computerResult.ships)
      setMessage('Place your ships!')
    } else if (mode === 'pvp') {
      setMessage('Player 1: Place your ships!')
    } else if (mode === 'online') {
      setMessage('Enter a Game ID to create or join a game')
    }
  }

  const joinOnlineGame = (): void => {
    if (gameIdInput.trim()) {
      multiplayer.joinGame(gameIdInput.trim())
      setMessage(`Joining game ${gameIdInput}... Waiting for opponent...`)
      
      // Update URL with game ID
      const newUrl = `${window.location.origin}${window.location.pathname}?game=${gameIdInput.trim()}`
      window.history.pushState({}, '', newUrl)
    }
  }

  const copyGameLink = async (): Promise<void> => {
    const gameLink = `${window.location.origin}${window.location.pathname}?game=${multiplayer.gameId || gameIdInput.trim()}`
    
    try {
      await navigator.clipboard.writeText(gameLink)
      setMessage('🔗 Game link copied to clipboard! Share it with your friend!')
      setTimeout(() => {
        setMessage(multiplayer.opponentConnected 
          ? 'Place your ships to get ready!' 
          : 'Waiting for opponent to join...')
      }, 2000)
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = gameLink
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setMessage('🔗 Game link copied! Share it with your friend!')
        setTimeout(() => {
          setMessage(multiplayer.opponentConnected 
            ? 'Place your ships to get ready!' 
            : 'Waiting for opponent to join...')
        }, 2000)
      } catch (err) {
        setMessage('Could not copy link. Share this Game ID: ' + (multiplayer.gameId || gameIdInput.trim()))
      }
      document.body.removeChild(textArea)
    }
  }


  const placeShipsRandomly = (board: Board): { board: Board; ships: Ship[] } => {
    const ships: Ship[] = []
    const newBoard = JSON.parse(JSON.stringify(board)) as Board

    SHIPS.forEach((ship, shipId) => {
      let placed = false
      while (!placed) {
        const horizontal = Math.random() > 0.5
        const row = Math.floor(Math.random() * GRID_SIZE)
        const col = Math.floor(Math.random() * GRID_SIZE)

        if (canPlaceShip(newBoard, row, col, ship.size, horizontal)) {
          const positions: Position[] = []
          for (let i = 0; i < ship.size; i++) {
            const r = horizontal ? row : row + i
            const c = horizontal ? col + i : col
            newBoard[r][c] = { ...newBoard[r][c], hasShip: true, shipId }
            positions.push({ row: r, col: c })
          }
          ships.push({ ...ship, id: shipId, positions, hits: 0 })
          placed = true
        }
      }
    })

    return { board: newBoard, ships }
  }

  const canPlaceShip = (board: Board, row: number, col: number, size: number, horizontal: boolean): boolean => {
    // Check if ship fits on board
    if (horizontal) {
      if (col + size > GRID_SIZE) return false
    } else {
      if (row + size > GRID_SIZE) return false
    }

    // Check ship cells and surrounding area (including diagonals)
    for (let i = 0; i < size; i++) {
      const r = horizontal ? row : row + i
      const c = horizontal ? col + i : col

      // Check the ship cell itself
      if (board[r][c].hasShip) return false

      // Check all 8 surrounding cells
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const checkRow = r + dr
          const checkCol = c + dc
          
          // Skip if out of bounds
          if (checkRow < 0 || checkRow >= GRID_SIZE || checkCol < 0 || checkCol >= GRID_SIZE) {
            continue
          }
          
          // Check if surrounding cell has a ship
          if (board[checkRow][checkCol].hasShip) {
            return false
          }
        }
      }
    }
    
    return true
  }

  const autoPlacePlayerShips = (): void => {
    const newBoard = createEmptyBoard()
    const result = placeShipsRandomly(newBoard)
    
    if (gameMode === 'pvp') {
      if (playerShips.length === 0) {
        // Player 1 auto-placing
        setPlayerBoard(result.board)
        setPlayerShips(result.ships)
        setMessage('Player 2: Place your ships!')
      } else {
        // Player 2 auto-placing
        setComputerBoard(result.board)
        setComputerShips(result.ships)
        setGameStarted(true)
        setMessage('Game started! Player 1\'s turn - attack Player 2\'s board!')
      }
    } else if (gameMode === 'online') {
      // Online mode - place ships and wait for ready
      setPlayerBoard(result.board)
      setPlayerShips(result.ships)
      setMessage(multiplayer.opponentConnected 
        ? 'Ships placed! Press Ready when ready to start!' 
        : 'Ships placed! Waiting for opponent to join...')
    } else {
      // PvC mode
      setPlayerBoard(result.board)
      setPlayerShips(result.ships)
      setGameStarted(true)
      setMessage("Game started! Your turn - attack the computer's board!")
    }
  }

  const startManualPlacement = (): void => {
    setIsPlacingManually(true)
    setPlayer1ShipIndex(0)
    setPlayer2ShipIndex(0)
    setPlayerBoard(createEmptyBoard())
    setPlayerShips([])
    
    if (gameMode === 'pvp') {
      setComputerBoard(createEmptyBoard())
      setComputerShips([])
      setMessage('Both players: Place your ships! Click boards to place, click rotate buttons to change orientation.')
    } else {
      setMessage(`Place your ${SHIPS[0].name} (${SHIPS[0].size} cells). Click to rotate, then click on board to place.`)
    }
  }

  const togglePlayer1Orientation = (): void => {
    setPlayer1Orientation(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')
  }

  const togglePlayer2Orientation = (): void => {
    setPlayer2Orientation(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')
  }

  const handlePlayer1Placement = (row: number, col: number): void => {
    if (!isPlacingManually || player1ShipIndex >= SHIPS.length) return

    const ship = SHIPS[player1ShipIndex]
    const horizontal = player1Orientation === 'horizontal'

    if (!canPlaceShip(playerBoard, row, col, ship.size, horizontal)) {
      return
    }

    const newBoard = JSON.parse(JSON.stringify(playerBoard)) as Board
    const positions: Position[] = []

    for (let i = 0; i < ship.size; i++) {
      const r = horizontal ? row : row + i
      const c = horizontal ? col + i : col
      newBoard[r][c] = { ...newBoard[r][c], hasShip: true, shipId: player1ShipIndex }
      positions.push({ row: r, col: c })
    }

    const newShip: Ship = { ...ship, id: player1ShipIndex, positions, hits: 0 }
    const newShips = [...playerShips, newShip]
    setPlayerBoard(newBoard)
    setPlayerShips(newShips)
    setPlayer1PreviewPosition(null)

    const nextIndex = player1ShipIndex + 1
    setPlayer1ShipIndex(nextIndex)
    
    // Check if both players are done
    if (gameMode === 'pvp') {
      if (nextIndex >= SHIPS.length && player2ShipIndex >= SHIPS.length) {
        setIsPlacingManually(false)
        setMessage('Both players: Press Ready when ready to start!')
      } else if (nextIndex >= SHIPS.length) {
        setMessage(`Player 1 done! Waiting for Player 2 (${player2ShipIndex}/${SHIPS.length} ships placed)`)
      } else {
        setMessage(`Player 1: ${nextIndex}/${SHIPS.length} ships | Player 2: ${player2ShipIndex}/${SHIPS.length} ships`)
      }
    } else if (gameMode === 'online') {
      if (nextIndex >= SHIPS.length) {
        setIsPlacingManually(false)
        setMessage(multiplayer.opponentConnected 
          ? 'Ships placed! Press Ready when ready to start!' 
          : 'Ships placed! Waiting for opponent to join...')
      }
    } else {
      if (nextIndex >= SHIPS.length) {
        setIsPlacingManually(false)
        setGameStarted(true)
        setMessage("All ships placed! Your turn - attack the computer's board!")
      }
    }
  }

  const handlePlayer2Placement = (row: number, col: number): void => {
    if (!isPlacingManually || player2ShipIndex >= SHIPS.length || gameMode !== 'pvp') return

    const ship = SHIPS[player2ShipIndex]
    const horizontal = player2Orientation === 'horizontal'

    if (!canPlaceShip(computerBoard, row, col, ship.size, horizontal)) {
      return
    }

    const newBoard = JSON.parse(JSON.stringify(computerBoard)) as Board
    const positions: Position[] = []

    for (let i = 0; i < ship.size; i++) {
      const r = horizontal ? row : row + i
      const c = horizontal ? col + i : col
      newBoard[r][c] = { ...newBoard[r][c], hasShip: true, shipId: player2ShipIndex }
      positions.push({ row: r, col: c })
    }

    const newShip: Ship = { ...ship, id: player2ShipIndex, positions, hits: 0 }
    const newShips = [...computerShips, newShip]
    setComputerBoard(newBoard)
    setComputerShips(newShips)
    setPlayer2PreviewPosition(null)

    const nextIndex = player2ShipIndex + 1
    setPlayer2ShipIndex(nextIndex)
    
    // Check if both players are done
    if (nextIndex >= SHIPS.length && player1ShipIndex >= SHIPS.length) {
      setIsPlacingManually(false)
      setMessage('Both players: Press Ready when ready to start!')
    } else if (nextIndex >= SHIPS.length) {
      setMessage(`Player 2 done! Waiting for Player 1 (${player1ShipIndex}/${SHIPS.length} ships placed)`)
    } else {
      setMessage(`Player 1: ${player1ShipIndex}/${SHIPS.length} ships | Player 2: ${nextIndex}/${SHIPS.length} ships`)
    }
  }

  const handlePlayer1BoardHover = (row: number, col: number): void => {
    if (isPlacingManually && player1ShipIndex < SHIPS.length) {
      setPlayer1PreviewPosition({ row, col })
    }
  }

  const handlePlayer2BoardHover = (row: number, col: number): void => {
    if (isPlacingManually && player2ShipIndex < SHIPS.length && gameMode === 'pvp') {
      setPlayer2PreviewPosition({ row, col })
    }
  }
  const handlePlayer1Ready = (): void => {
    if (gameMode === 'online') {
      multiplayer.setReady()
      setPlayer1Ready(true)
      setMessage(multiplayer.opponentReady ? 'Starting game...' : 'Waiting for opponent...')
    } else {
      setPlayer1Ready(true)
      if (player2Ready) {
        setGameStarted(true)
        setMessage("Game started! Player 1's turn - attack Player 2's board!")
      } else {
        setMessage('Player 1 is ready! Waiting for Player 2...')
      }
    }
  }

  const handlePlayer2Ready = (): void => {
    setPlayer2Ready(true)
    if (player1Ready) {
      setGameStarted(true)
      setMessage("Game started! Player 1's turn - attack Player 2's board!")
    } else {
      setMessage('Player 2 is ready! Waiting for Player 1...')
    }
  }
  const handleTurnTransition = (): void => {
    setShowingTransition(false)
    // Computer's turn in PvC mode
    if (gameMode === 'pvc' && currentTurn === 'computer') {
      setTimeout(computerTurn, 1000)
    }
  }

  const handlePlayer1BoardLeave = (): void => {
    setPlayer1PreviewPosition(null)
  }

  const handlePlayer2BoardLeave = (): void => {
    setPlayer2PreviewPosition(null)
  }

  const isValidPlayer1Preview = (row: number, col: number): boolean => {
    if (!isPlacingManually || player1ShipIndex >= SHIPS.length) return false
    const ship = SHIPS[player1ShipIndex]
    const horizontal = player1Orientation === 'horizontal'
    return canPlaceShip(playerBoard, row, col, ship.size, horizontal)
  }

  const isValidPlayer2Preview = (row: number, col: number): boolean => {
    if (!isPlacingManually || player2ShipIndex >= SHIPS.length) return false
    const ship = SHIPS[player2ShipIndex]
    const horizontal = player2Orientation === 'horizontal'
    return canPlaceShip(computerBoard, row, col, ship.size, horizontal)
  }

  const getPlayer1PreviewCells = (): Position[] => {
    if (!player1PreviewPosition || !isPlacingManually || player1ShipIndex >= SHIPS.length) {
      return []
    }

    const ship = SHIPS[player1ShipIndex]
    const horizontal = player1Orientation === 'horizontal'
    const { row, col } = player1PreviewPosition
    const cells: Position[] = []

    if (!isValidPlayer1Preview(row, col)) return []

    for (let i = 0; i < ship.size; i++) {
      const r = horizontal ? row : row + i
      const c = horizontal ? col + i : col
      cells.push({ row: r, col: c })
    }

    return cells
  }

  const getPlayer2PreviewCells = (): Position[] => {
    if (!player2PreviewPosition || !isPlacingManually || player2ShipIndex >= SHIPS.length || gameMode !== 'pvp') {
      return []
    }

    const ship = SHIPS[player2ShipIndex]
    const horizontal = player2Orientation === 'horizontal'
    const { row, col } = player2PreviewPosition
    const cells: Position[] = []

    if (!isValidPlayer2Preview(row, col)) return []

    for (let i = 0; i < ship.size; i++) {
      const r = horizontal ? row : row + i
      const c = horizontal ? col + i : col
      cells.push({ row: r, col: c })
    }

    return cells
  }

  const handleCellClick = (row: number, col: number, isPlayerBoard: boolean): void => {
    // Handle manual ship placement
    if (isPlacingManually) {
      if (isPlayerBoard) {
        handlePlayer1Placement(row, col)
      } else if (gameMode === 'pvp') {
        handlePlayer2Placement(row, col)
      }
      return
    }

    // Handle game play
    if (!gameStarted || gameOver) return
    if (isPlayerBoard) return // Can't click own board during game
    if (currentTurn !== 'player') return

    const cell = computerBoard[row][col]
    if (cell.isHit || cell.isMiss) return // Already attacked

    // Online multiplayer mode
    if (gameMode === 'online') {
      multiplayer.sendAttack(row, col)
      return
    }

    // Local modes (pvp and pvc)
    const newBoard = [...computerBoard]
    const newShips = [...computerShips]

    if (cell.hasShip && cell.shipId !== null) {
      newBoard[row][col] = { ...cell, isHit: true }
      const ship = newShips[cell.shipId]
      ship.hits++
      
      const playerName = gameMode === 'pvp' ? 'Player 1' : 'You'
      if (ship.hits === ship.size) {
        setMessage(`${playerName} sunk the ${ship.name}!`)
      } else {
        setMessage('Hit! Take another shot!')
      }

      setComputerBoard(newBoard)
      setComputerShips(newShips)

      if (checkWin(newShips)) {
        setGameOver(true)
        setWinner('player')
        if (gameMode === 'pvp') {
          setMessage('🎉 Player 1 won! All enemy ships destroyed!')
          saveResult('Player 1', 'Player 2')
        } else {
          setMessage('🎉 You won! All enemy ships destroyed!')
          saveResult(multiplayer.playerName, 'Computer')
        }
        setTimeout(() => initializeGame(), 3000)
        return
      }
    } else {
      newBoard[row][col] = { ...cell, isMiss: true }
      setComputerBoard(newBoard)
      
      if (gameMode === 'pvp') {
        setMessage('Miss! Switching to Player 2...')
        setCurrentTurn('computer')
        setShowingTransition(true)
      } else {
        setMessage('Miss! Computer\'s turn...')
        setCurrentTurn('computer')
        setTimeout(computerTurn, 1000)
      }
    }
  }

  const computerTurn = (): void => {
    // In PvP mode, this is actually Player 2's turn - no auto-play
    if (gameMode === 'pvp') {
      return // Player 2 plays manually
    }
    
    let row: number, col: number

    // Smart targeting: if we have targets in queue, use them
    if (targetQueue.length > 0) {
      const target = targetQueue.shift()!
      row = target.row
      col = target.col
      setTargetQueue([...targetQueue])
    } else {
      // Random targeting
      do {
        row = Math.floor(Math.random() * GRID_SIZE)
        col = Math.floor(Math.random() * GRID_SIZE)
      } while (playerBoard[row][col].isHit || playerBoard[row][col].isMiss)
    }

    const newBoard = [...playerBoard]
    const newShips = [...playerShips]
    const cell = newBoard[row][col]

    if (cell.hasShip && cell.shipId !== null) {
      newBoard[row][col] = { ...cell, isHit: true }
      const ship = newShips[cell.shipId]
      ship.hits++

      const shipSunk = ship.hits === ship.size

      if (shipSunk) {
        setMessage(`Computer sunk your ${ship.name}!`)
        // Clear target queue when ship is sunk
        setTargetQueue([])
        setLastHit(null)
      } else {
        setMessage('Computer hit your ship!')
        // Add adjacent cells to target queue
        const newTargets = getAdjacentCells(row, col, newBoard)
        setTargetQueue([...targetQueue, ...newTargets])
        setLastHit({ row, col })
      }

      setPlayerBoard(newBoard)
      setPlayerShips(newShips)

      if (checkWin(newShips)) {
        setGameOver(true)
        setWinner('computer')
        setMessage('💀 Game Over! Computer won!')
        saveResult('Computer', multiplayer.playerName)
        setTimeout(() => initializeGame(), 3000)
        return
      }

      setTimeout(computerTurn, 1000)
    } else {
      newBoard[row][col] = { ...cell, isMiss: true }
      setPlayerBoard(newBoard)
      setMessage('Computer missed! Your turn!')
      setCurrentTurn('player')
    }
  }

  const handlePlayer2Click = (row: number, col: number, isPlayerBoard: boolean): void => {
    if (!gameStarted || gameOver || gameMode !== 'pvp') return
    if (!isPlayerBoard) return // Player 2 can only attack player board
    if (currentTurn !== 'computer') return // Not Player 2's turn

    const cell = playerBoard[row][col]
    if (cell.isHit || cell.isMiss) return // Already attacked

    const newBoard = [...playerBoard]
    const newShips = [...playerShips]

    if (cell.hasShip && cell.shipId !== null) {
      newBoard[row][col] = { ...cell, isHit: true }
      const ship = newShips[cell.shipId]
      ship.hits++
      
      if (ship.hits === ship.size) {
        setMessage(`Player 2 sunk the ${ship.name}!`)
      } else {
        setMessage('Hit! Take another shot!')
      }

      setPlayerBoard(newBoard)
      setPlayerShips(newShips)

      if (checkWin(newShips)) {
        setGameOver(true)
        setWinner('computer')
        setMessage('🎉 Player 2 won! All enemy ships destroyed!')
        saveResult('Player 2', 'Player 1')
        setTimeout(() => initializeGame(), 3000)
        return
      }
    } else {
      newBoard[row][col] = { ...cell, isMiss: true }
      setPlayerBoard(newBoard)
      setMessage('Miss! Switching to Player 1...')
      setCurrentTurn('player')
      setShowingTransition(true)
    }
  }

  const getAdjacentCells = (row: number, col: number, board: Board): Position[] => {
    const adjacent: Position[] = []
    const directions = [
      { row: -1, col: 0 }, // up
      { row: 1, col: 0 },  // down
      { row: 0, col: -1 }, // left
      { row: 0, col: 1 }   // right
    ]

    for (const dir of directions) {
      const newRow = row + dir.row
      const newCol = col + dir.col

      // Check if cell is valid and not already targeted
      if (
        newRow >= 0 && newRow < GRID_SIZE &&
        newCol >= 0 && newCol < GRID_SIZE &&
        !board[newRow][newCol].isHit &&
        !board[newRow][newCol].isMiss
      ) {
        adjacent.push({ row: newRow, col: newCol })
      }
    }

    return adjacent
  }

  const checkWin = (ships: Ship[]): boolean => {
    return ships.every(ship => ship.hits === ship.size)
  }

  return (
    <div className="app">
      <h1>⚓ Sea Battlee ⚓</h1>
      
      {/* Player Name Display */}
      <div className="player-name-section" style={{
        textAlign: 'center',
        marginBottom: '20px',
        padding: '10px',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderRadius: '10px'
      }}>
        <label style={{ fontSize: '0.9rem', color: '#666', marginRight: '10px' }}>
          Your Name:
        </label>
        <input
          type="text"
          value={multiplayer.playerName}
          onChange={(e) => multiplayer.updatePlayerName(e.target.value)}
          placeholder="Enter your name"
          maxLength={20}
          style={{
            padding: '8px 12px',
            fontSize: '1rem',
            borderRadius: '8px',
            border: '2px solid #667eea',
            backgroundColor: 'white',
            minWidth: '200px',
            textAlign: 'center',
            fontWeight: 'bold'
          }}
        />
      </div>
      
      <div className="message-box">
        <p className="message">{message}</p>
        <div className="turn-indicator">
          {gameStarted && !gameOver && (
            <span className={currentTurn === 'player' ? 'active' : ''}>
              {gameMode === 'pvp' 
                ? (currentTurn === 'player' ? '🎯 Player 1 Turn' : '🎯 Player 2 Turn')
                : (currentTurn === 'player' ? '🎯 Your Turn' : '🤖 Computer Turn')
              }
            </span>
          )}
        </div>
      </div>

      {showingTransition && (
        <div className="turn-transition">
          <div className="transition-overlay">
            <h2>{currentTurn === 'player' ? "Player 1's Turn" : "Player 2's Turn"}</h2>
            <p>Pass the device to {currentTurn === 'player' ? 'Player 1' : 'Player 2'}</p>
            <button className="btn-primary" onClick={handleTurnTransition}>
              Ready
            </button>
          </div>
        </div>
      )}

      {!gameMode && (
        <>
          <div className="setup-controls">
            <h2>Select Game Mode</h2>
            <button className="btn-primary" onClick={() => selectGameMode('pvp')}>
              👥 Player vs Player (Local)
            </button>
            <button className="btn-primary" onClick={() => selectGameMode('online')}>
              🌐 Online Multiplayer
            </button>
            <button className="btn-primary" onClick={() => selectGameMode('pvc')}>
              🤖 Player vs Computer
            </button>
          </div>

          {/* Game Results Table */}
          {gameResults.length > 0 && (
            <div className="game-results" style={{
              marginTop: '40px',
              padding: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '15px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              maxWidth: '800px',
              margin: '40px auto 0'
            }}>
              <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#667eea' }}>
                🏆 Recent Game Results
              </h2>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.95rem'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#667eea', color: 'white' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderRadius: '8px 0 0 0' }}>Date</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Player 1</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>VS</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Player 2</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderRadius: '0 8px 0 0' }}>Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {gameResults.map((result, index) => (
                    <tr key={result.id} style={{
                      backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                      borderBottom: '1px solid #e0e0e0'
                    }}>
                      <td style={{ padding: '10px', fontSize: '0.85rem', color: '#666' }}>
                        {result.date}
                      </td>
                      <td style={{ 
                        padding: '10px',
                        fontWeight: result.winner === result.player1Name ? 'bold' : 'normal',
                        color: result.winner === result.player1Name ? '#667eea' : '#333'
                      }}>
                        {result.player1Name}
                        {result.winner === result.player1Name && ' 👑'}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', color: '#999' }}>⚔️</td>
                      <td style={{ 
                        padding: '10px',
                        fontWeight: result.winner === result.player2Name ? 'bold' : 'normal',
                        color: result.winner === result.player2Name ? '#667eea' : '#333'
                      }}>
                        {result.player2Name}
                        {result.winner === result.player2Name && ' 👑'}
                      </td>
                      <td style={{ 
                        padding: '10px',
                        fontWeight: 'bold',
                        color: '#667eea'
                      }}>
                        {result.winner}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {gameMode === 'online' && !multiplayer.gameId && (
        <div className="setup-controls">
          <h2>Join or Create Game</h2>
          <input
            type="text"
            placeholder="Enter Game ID (e.g., game123)"
            value={gameIdInput}
            onChange={(e) => setGameIdInput(e.target.value)}
            className="game-id-input"
            style={{
              padding: '12px 20px',
              fontSize: '1.1rem',
              borderRadius: '10px',
              border: '2px solid #667eea',
              marginRight: '10px',
              minWidth: '250px'
            }}
          />
          <button className="btn-primary" onClick={joinOnlineGame}>
            Join Game
          </button>
          <button className="btn-secondary" onClick={initializeGame}>
            Back
          </button>
          <p style={{ marginTop: '15px', color: '#666' }}>
            Share this Game ID with your friend to play together!<br/>
            {multiplayer.playerNumber && `You are Player ${multiplayer.playerNumber}`}
          </p>
        </div>
      )}

      {gameMode && multiplayer.gameId && !gameStarted && !isPlacingManually && (
        <div className="setup-controls">
          <div style={{
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            padding: '15px',
            borderRadius: '10px',
            marginBottom: '20px'
          }}>
            <p style={{ marginBottom: '10px', fontSize: '0.95rem' }}>
              <strong>Game ID: {multiplayer.gameId}</strong>
            </p>
            <p style={{ marginBottom: '10px', fontSize: '0.9rem' }}>
              You are {multiplayer.playerName} (Player {multiplayer.playerNumber}) | 
              {multiplayer.opponentConnected 
                ? ` ✓ ${multiplayer.opponentName || 'Opponent'} Connected` 
                : ' ⏳ Waiting for opponent...'}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={`${window.location.origin}${window.location.pathname}?game=${multiplayer.gameId}`}
                style={{
                  padding: '10px',
                  fontSize: '0.9rem',
                  borderRadius: '8px',
                  border: '2px solid #667eea',
                  backgroundColor: 'white',
                  flex: 1,
                  maxWidth: '500px'
                }}
                onClick={(e) => e.currentTarget.select()}
              />
              <button 
                className="btn-primary" 
                onClick={copyGameLink}
                style={{ whiteSpace: 'nowrap' }}
              >
                📋 Copy Link
              </button>
            </div>
            <p style={{ marginTop: '10px', fontSize: '0.85rem', color: '#666' }}>
              Share this link with your friend to play together!
            </p>
          </div>
          <button className="btn-primary" onClick={startManualPlacement}>
            Place Ships Manually
          </button>
          <button className="btn-primary" onClick={autoPlacePlayerShips}>
            Auto-Place Ships & Continue
          </button>
          <button className="btn-secondary" onClick={initializeGame}>
            Leave Game
          </button>
        </div>
      )}

      {gameMode && gameMode !== 'online' && !gameStarted && !isPlacingManually && (
        <div className="setup-controls">
          <button className="btn-primary" onClick={startManualPlacement}>
            Place Ships Manually
          </button>
          <button className="btn-primary" onClick={autoPlacePlayerShips}>
            Auto-Place Ships & Continue
          </button>
          <button className="btn-secondary" onClick={initializeGame}>
            Back to Mode Selection
          </button>
        </div>
      )}

      {isPlacingManually && (
        <div className="setup-controls">
          {gameMode === 'pvp' ? (
            <>
              <div className="placement-info">
                <p><strong>Player 1:</strong> {player1ShipIndex < SHIPS.length ? `${SHIPS[player1ShipIndex]?.name} (${SHIPS[player1ShipIndex]?.size})` : 'Complete!'} - {player1ShipIndex}/{SHIPS.length}</p>
              </div>
              <button className="btn-secondary" onClick={togglePlayer1Orientation} disabled={player1ShipIndex >= SHIPS.length}>
                P1 Rotate ({player1Orientation === 'horizontal' ? '→' : '↓'})
              </button>
              <div className="placement-info">
                <p><strong>Player 2:</strong> {player2ShipIndex < SHIPS.length ? `${SHIPS[player2ShipIndex]?.name} (${SHIPS[player2ShipIndex]?.size})` : 'Complete!'} - {player2ShipIndex}/{SHIPS.length}</p>
              </div>
              <button className="btn-secondary" onClick={togglePlayer2Orientation} disabled={player2ShipIndex >= SHIPS.length}>
                P2 Rotate ({player2Orientation === 'horizontal' ? '→' : '↓'})
              </button>
            </>
          ) : (
            <>
              <div className="placement-info">
                <p>Placing: <strong>{SHIPS[player1ShipIndex]?.name} ({SHIPS[player1ShipIndex]?.size} cells)</strong></p>
                <p>Ships placed: {player1ShipIndex} / {SHIPS.length}</p>
              </div>
              <button className="btn-secondary" onClick={togglePlayer1Orientation}>
                Rotate Ship ({player1Orientation === 'horizontal' ? '→' : '↓'})
              </button>
            </>
          )}
          <button className="btn-secondary" onClick={initializeGame}>
            Reset
          </button>
        </div>
      )}

      {gameMode && (
        <div className="boards-container">
          <div className="board-wrapper">
            <h2>
              {gameMode === 'online' 
                ? `${multiplayer.playerName}'s Fleet (You)` 
                : gameMode === 'pvp' ? 'Player 1 Fleet' : 'Your Fleet'}
            </h2>
            <GameBoard 
              board={playerBoard} 
              onCellClick={gameMode === 'pvp' && gameStarted ? handlePlayer2Click : handleCellClick}
              isPlayerBoard={true}
              hideShips={gameMode === 'pvp' && currentTurn === 'computer'}
              onCellHover={handlePlayer1BoardHover}
              onBoardLeave={handlePlayer1BoardLeave}
              previewCells={getPlayer1PreviewCells()}
              previewValid={player1PreviewPosition ? isValidPlayer1Preview(player1PreviewPosition.row, player1PreviewPosition.col) : true}
            />
            {(gameMode === 'pvp' || gameMode === 'online') && !gameStarted && playerShips.length === SHIPS.length && (
              <button 
                className="btn-primary" 
                onClick={handlePlayer1Ready}
                disabled={player1Ready}
                style={{ marginTop: '15px' }}
              >
                {player1Ready ? '✓ Ready!' : 'Ready'}
              </button>
            )}
            <div className="ships-status">
              {playerShips.map(ship => (
                <div key={ship.id} className={ship.hits === ship.size ? 'ship-sunk' : 'ship-alive'}>
                  {ship.name} ({ship.size}) {ship.hits === ship.size && '💀'}
                </div>
              ))}
            </div>
          </div>

          <div className="board-wrapper">
            <h2>
              {gameMode === 'online' 
                ? `${multiplayer.opponentName || 'Opponent'}'s Fleet` 
                : gameMode === 'pvp' ? 'Player 2 Fleet' : 'Enemy Waters'}
            </h2>
            <GameBoard 
              board={computerBoard} 
              onCellClick={handleCellClick}
              isPlayerBoard={false}
              hideShips={gameMode === 'pvp' ? currentTurn === 'player' : true}
              onCellHover={handlePlayer2BoardHover}
              onBoardLeave={handlePlayer2BoardLeave}
              previewCells={getPlayer2PreviewCells()}
              previewValid={player2PreviewPosition ? isValidPlayer2Preview(player2PreviewPosition.row, player2PreviewPosition.col) : true}
            />
            {gameMode === 'pvp' && !gameStarted && computerShips.length === SHIPS.length && (
              <button 
                className="btn-primary" 
                onClick={handlePlayer2Ready}
                disabled={player2Ready}
                style={{ marginTop: '15px' }}
              >
                {player2Ready ? '✓ Ready!' : 'Ready'}
              </button>
            )}
            <div className="ships-status">
              {computerShips.map(ship => (
                <div key={ship.id} className={ship.hits === ship.size ? 'ship-sunk' : 'ship-alive'}>
                  {ship.name} ({ship.size}) {ship.hits === ship.size && '💀'}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {gameOver && (
        <div className="game-over">
          <button className="btn-primary" onClick={initializeGame}>
            Play Again
          </button>
        </div>
      )}
    </div>
  )
}

export default App
