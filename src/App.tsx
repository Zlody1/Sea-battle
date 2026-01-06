import { useState, useEffect } from 'react'
import './App.css'
import GameBoard from './components/GameBoard.tsx'

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
    
    const computerShipsPlaced = placeShipsRandomly(newComputerBoard)
    
    setPlayerBoard(newPlayerBoard)
    setComputerBoard(newComputerBoard)
    setPlayerShips([])
    setComputerShips(computerShipsPlaced)
    setGameStarted(false)
    setGameOver(false)
    setWinner(null)
    setCurrentTurn('player')
    setMessage('Place your ships!')
  }

  const placeShipsRandomly = (board: Board): Ship[] => {
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

    return ships
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
    const ships = placeShipsRandomly(newBoard)
    setPlayerBoard(newBoard)
    setPlayerShips(ships)
    setGameStarted(true)
    setMessage("Game started! Your turn - attack the computer's board!")
  }

  const handleCellClick = (row: number, col: number, isPlayerBoard: boolean): void => {
    if (!gameStarted || gameOver) return
    if (isPlayerBoard) return // Can't click own board
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
    do {
      row = Math.floor(Math.random() * GRID_SIZE)
      col = Math.floor(Math.random() * GRID_SIZE)
    } while (playerBoard[row][col].isHit || playerBoard[row][col].isMiss)

    const newBoard = [...playerBoard]
    const newShips = [...playerShips]
    const cell = newBoard[row][col]

    if (cell.hasShip && cell.shipId !== null) {
      newBoard[row][col] = { ...cell, isHit: true }
      const ship = newShips[cell.shipId]
      ship.hits++

      if (ship.hits === ship.size) {
        setMessage(`Computer sunk your ${ship.name}!`)
      } else {
        setMessage('Computer hit your ship!')
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

      {!gameStarted && (
        <div className="setup-controls">
          <button className="btn-primary" onClick={autoPlacePlayerShips}>
            Auto-Place Ships & Start Game
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
