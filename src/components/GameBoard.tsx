import './GameBoard.css'

interface Cell {
  hasShip: boolean
  isHit: boolean
  isMiss: boolean
  shipId: number | null
}

type Board = Cell[][]

interface GameBoardProps {
  board: Board
  onCellClick: (row: number, col: number, isPlayerBoard: boolean) => void
  isPlayerBoard: boolean
  hideShips: boolean
}

const GameBoard = ({ board, onCellClick, isPlayerBoard, hideShips }: GameBoardProps) => {
  const handleClick = (row: number, col: number): void => {
    onCellClick(row, col, isPlayerBoard)
  }

  const getCellClass = (cell: Cell): string => {
    const classes = ['cell']
    
    if (cell.isHit) {
      classes.push('hit')
    } else if (cell.isMiss) {
      classes.push('miss')
    } else if (cell.hasShip && !hideShips) {
      classes.push('ship')
    }

    if (!isPlayerBoard && !cell.isHit && !cell.isMiss) {
      classes.push('clickable')
    }

    return classes.join(' ')
  }

  return (
    <div className="game-board">
      <div className="board-labels">
        <div className="corner-label"></div>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="col-label">{i + 1}</div>
        ))}
      </div>
      
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="board-row">
          <div className="row-label">{String.fromCharCode(65 + rowIndex)}</div>
          {row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={getCellClass(cell)}
              onClick={() => handleClick(rowIndex, colIndex)}
            >
              {cell.isHit && <span className="hit-marker">💥</span>}
              {cell.isMiss && <span className="miss-marker">○</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default GameBoard
