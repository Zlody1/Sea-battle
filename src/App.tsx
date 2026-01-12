import { useState, useEffect } from 'react'
import './App.css'
import GameBoard from './components/GameBoard'

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

function App() {
  const [playerBoard, setPlayerBoard] = useState<Board>([])
  const [computerBoard, setComputerBoard] = useState<Board>([])
  const [playerShips, setPlayerShips] = useState<Ship[]>([])
  const [computerShips, setComputerShips] = useState<Ship[]>([])
  const [gameStarted, setGameStarted] = useState<boolean>(false)
  const [gameOver, setGameOver] = useState<boolean>(false)
  const [winner, setWinner] = useState<Turn | null>(null)
  const [currentTurn, setCurrentTurn] = useState<Turn>('player')
  const [message, setMessage] = useState<string>('Place your ships!')
  
  // Manual placement states
  const [isPlacingManually, setIsPlacingManually] = useState<boolean>(false)
  const [currentShipIndex, setCurrentShipIndex] = useState<number>(0)
  const [shipOrientation, setShipOrientation] = useState<'horizontal' | 'vertical'>('horizontal')
  const [previewPosition, setPreviewPosition] = useState<{ row: number; col: number } | null>(null)

  // Computer AI states
  const [lastHit, setLastHit] = useState<Position | null>(null)
  const [targetQueue, setTargetQueue] = useState<Position[]>([])

  // Suppress unused variable warning - winner and lastHit are set for future use
  void winner
  void lastHit

  useEffect(() => {
    initializeGame()
  }, [])

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

  const initializeGame = (): void => {
    const newPlayerBoard = createEmptyBoard()
    const newComputerBoard = createEmptyBoard()
    
    const computerResult = placeShipsRandomly(newComputerBoard)
    
    setPlayerBoard(newPlayerBoard)
    setComputerBoard(computerResult.board)
    setPlayerShips([])
    setComputerShips(computerResult.ships)
    setGameStarted(false)
    setGameOver(false)
    setWinner(null)
    setCurrentTurn('player')
    setMessage('Place your ships!')
    setIsPlacingManually(false)
    setCurrentShipIndex(0)
    setShipOrientation('horizontal')
    setPreviewPosition(null)
    setLastHit(null)
    setTargetQueue([])
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
    if (horizontal) {
      if (col + size > GRID_SIZE) return false
      for (let i = 0; i < size; i++) {
        if (board[row][col + i].hasShip) return false
      }
    } else {
      if (row + size > GRID_SIZE) return false
      for (let i = 0; i < size; i++) {
        if (board[row + i][col].hasShip) return false
      }
    }
    return true
  }

  const autoPlacePlayerShips = (): void => {
    const newBoard = createEmptyBoard()
    const result = placeShipsRandomly(newBoard)
    setPlayerBoard(result.board)
    setPlayerShips(result.ships)
    setGameStarted(true)
    setMessage("Game started! Your turn - attack the computer's board!")
  }

  const startManualPlacement = (): void => {
    setIsPlacingManually(true)
    setCurrentShipIndex(0)
    setPlayerBoard(createEmptyBoard())
    setPlayerShips([])
    setMessage(`Place your ${SHIPS[0].name} (${SHIPS[0].size} cells). Click to rotate, then click on board to place.`)
  }

  const toggleOrientation = (): void => {
    setShipOrientation(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')
  }

  const handleManualPlacement = (row: number, col: number): void => {
    if (!isPlacingManually || currentShipIndex >= SHIPS.length) return

    const ship = SHIPS[currentShipIndex]
    const horizontal = shipOrientation === 'horizontal'

    if (!canPlaceShip(playerBoard, row, col, ship.size, horizontal)) {
      setMessage('Cannot place ship here! Try another position.')
      return
    }

    const newBoard = JSON.parse(JSON.stringify(playerBoard)) as Board
    const positions: Position[] = []

    for (let i = 0; i < ship.size; i++) {
      const r = horizontal ? row : row + i
      const c = horizontal ? col + i : col
      newBoard[r][c] = { ...newBoard[r][c], hasShip: true, shipId: currentShipIndex }
      positions.push({ row: r, col: c })
    }

    const newShip: Ship = { ...ship, id: currentShipIndex, positions, hits: 0 }
    const newShips = [...playerShips, newShip]

    setPlayerBoard(newBoard)
    setPlayerShips(newShips)
    setPreviewPosition(null)

    const nextIndex = currentShipIndex + 1
    if (nextIndex < SHIPS.length) {
      setCurrentShipIndex(nextIndex)
      setMessage(`Place your ${SHIPS[nextIndex].name} (${SHIPS[nextIndex].size} cells). Click to rotate, then click on board to place.`)
    } else {
      setIsPlacingManually(false)
      setGameStarted(true)
      setMessage("All ships placed! Your turn - attack the computer's board!")
    }
  }

  const handleBoardHover = (row: number, col: number): void => {
    if (isPlacingManually && currentShipIndex < SHIPS.length) {
      setPreviewPosition({ row, col })
    }
  }

  const handleBoardLeave = (): void => {
    setPreviewPosition(null)
  }

  const isValidPreview = (row: number, col: number): boolean => {
    if (!isPlacingManually || currentShipIndex >= SHIPS.length) return false
    const ship = SHIPS[currentShipIndex]
    const horizontal = shipOrientation === 'horizontal'
    return canPlaceShip(playerBoard, row, col, ship.size, horizontal)
  }

  const getPreviewCells = (): Position[] => {
    if (!previewPosition || !isPlacingManually || currentShipIndex >= SHIPS.length) {
      return []
    }

    const ship = SHIPS[currentShipIndex]
    const horizontal = shipOrientation === 'horizontal'
    const { row, col } = previewPosition
    const cells: Position[] = []

    if (!isValidPreview(row, col)) return []

    for (let i = 0; i < ship.size; i++) {
      const r = horizontal ? row : row + i
      const c = horizontal ? col + i : col
      cells.push({ row: r, col: c })
    }

    return cells
  }

  const handleCellClick = (row: number, col: number, isPlayerBoard: boolean): void => {
    // Handle manual ship placement
    if (isPlacingManually && isPlayerBoard) {
      handleManualPlacement(row, col)
      return
    }

    // Handle game play
    if (!gameStarted || gameOver) return
    if (isPlayerBoard) return // Can't click own board during game
    if (currentTurn !== 'player') return

    const cell = computerBoard[row][col]
    if (cell.isHit || cell.isMiss) return // Already attacked

    const newBoard = [...computerBoard]
    const newShips = [...computerShips]

    if (cell.hasShip && cell.shipId !== null) {
      newBoard[row][col] = { ...cell, isHit: true }
      const ship = newShips[cell.shipId]
      ship.hits++
      
      if (ship.hits === ship.size) {
        setMessage(`You sunk the ${ship.name}!`)
      } else {
        setMessage('Hit! Take another shot!')
      }

      setComputerBoard(newBoard)
      setComputerShips(newShips)

      if (checkWin(newShips)) {
        setGameOver(true)
        setWinner('player')
        setMessage('🎉 You won! All enemy ships destroyed!')
        return
      }
    } else {
      newBoard[row][col] = { ...cell, isMiss: true }
      setComputerBoard(newBoard)
      setMessage('Miss! Computer\'s turn...')
      setCurrentTurn('computer')
      setTimeout(computerTurn, 1000)
    }
  }

  const computerTurn = (): void => {
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
      <h1>⚓ Sea Battle ⚓</h1>
      
      <div className="message-box">
        <p className="message">{message}</p>
        <div className="turn-indicator">
          {gameStarted && !gameOver && (
            <span className={currentTurn === 'player' ? 'active' : ''}>
              {currentTurn === 'player' ? '🎯 Your Turn' : '🤖 Computer Turn'}
            </span>
          )}
        </div>
      </div>

      {!gameStarted && !isPlacingManually && (
        <div className="setup-controls">
          <button className="btn-primary" onClick={startManualPlacement}>
            Place Ships Manually
          </button>
          <button className="btn-primary" onClick={autoPlacePlayerShips}>
            Auto-Place Ships & Start Game
          </button>
        </div>
      )}

      {isPlacingManually && (
        <div className="setup-controls">
          <div className="placement-info">
            <p>Placing: <strong>{SHIPS[currentShipIndex]?.name} ({SHIPS[currentShipIndex]?.size} cells)</strong></p>
            <p>Ships placed: {currentShipIndex} / {SHIPS.length}</p>
          </div>
          <button className="btn-secondary" onClick={toggleOrientation}>
            Rotate Ship ({shipOrientation === 'horizontal' ? '→' : '↓'})
          </button>
          <button className="btn-secondary" onClick={initializeGame}>
            Reset
          </button>
        </div>
      )}

      <div className="boards-container">
        <div className="board-wrapper">
          <h2>Your Fleet</h2>
          <GameBoard 
            board={playerBoard} 
            onCellClick={handleCellClick}
            isPlayerBoard={true}
            hideShips={false}
            onCellHover={handleBoardHover}
            onBoardLeave={handleBoardLeave}
            previewCells={getPreviewCells()}
            previewValid={previewPosition ? isValidPreview(previewPosition.row, previewPosition.col) : true}
          />
          <div className="ships-status">
            {playerShips.map(ship => (
              <div key={ship.id} className={ship.hits === ship.size ? 'ship-sunk' : 'ship-alive'}>
                {ship.name} ({ship.size}) {ship.hits === ship.size && '💀'}
              </div>
            ))}
          </div>
        </div>

        <div className="board-wrapper">
          <h2>Enemy Waters</h2>
          <GameBoard 
            board={computerBoard} 
            onCellClick={handleCellClick}
            isPlayerBoard={false}
            hideShips={true}
          />
          <div className="ships-status">
            {computerShips.map(ship => (
              <div key={ship.id} className={ship.hits === ship.size ? 'ship-sunk' : 'ship-alive'}>
                {ship.name} ({ship.size}) {ship.hits === ship.size && '💀'}
              </div>
            ))}
          </div>
        </div>
      </div>

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
