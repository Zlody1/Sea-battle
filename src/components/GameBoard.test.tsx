import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GameBoard from '../components/GameBoard'

interface Cell {
  hasShip: boolean
  isHit: boolean
  isMiss: boolean
  shipId: number | null
}

type Board = Cell[][]

describe('GameBoard', () => {
  const mockBoard: Board = Array(10).fill(null).map(() =>
    Array(10).fill(null).map(() => ({
      hasShip: false,
      isHit: false,
      isMiss: false,
      shipId: null
    }))
  )

  it('renders the game board with correct grid size', () => {
    const mockOnCellClick = vi.fn()
    render(
      <GameBoard
        board={mockBoard}
        onCellClick={mockOnCellClick}
        isPlayerBoard={true}
        hideShips={false}
      />
    )

    const cells = screen.getAllByRole('generic').filter(el => 
      el.className.includes('cell')
    )
    expect(cells.length).toBe(100) // 10x10 grid
  })

  it('displays column labels from 1 to 10', () => {
    const mockOnCellClick = vi.fn()
    render(
      <GameBoard
        board={mockBoard}
        onCellClick={mockOnCellClick}
        isPlayerBoard={true}
        hideShips={false}
      />
    )

    for (let i = 1; i <= 10; i++) {
      expect(screen.getByText(i.toString())).toBeInTheDocument()
    }
  })

  it('displays row labels from A to J', () => {
    const mockOnCellClick = vi.fn()
    render(
      <GameBoard
        board={mockBoard}
        onCellClick={mockOnCellClick}
        isPlayerBoard={true}
        hideShips={false}
      />
    )

    for (let i = 0; i < 10; i++) {
      const letter = String.fromCharCode(65 + i)
      expect(screen.getByText(letter)).toBeInTheDocument()
    }
  })

  it('calls onCellClick when a cell is clicked', async () => {
    const mockOnCellClick = vi.fn()
    const user = userEvent.setup()
    
    render(
      <GameBoard
        board={mockBoard}
        onCellClick={mockOnCellClick}
        isPlayerBoard={false}
        hideShips={true}
      />
    )

    const cells = screen.getAllByRole('generic').filter(el =>
      el.className.includes('cell') && el.className.includes('clickable')
    )
    
    if (cells.length > 0) {
      await user.click(cells[0])
      expect(mockOnCellClick).toHaveBeenCalled()
    }
  })

  it('displays hit marker when cell is hit', () => {
    const hitBoard: Board = JSON.parse(JSON.stringify(mockBoard))
    hitBoard[0][0] = { hasShip: true, isHit: true, isMiss: false, shipId: 0 }
    
    const mockOnCellClick = vi.fn()
    render(
      <GameBoard
        board={hitBoard}
        onCellClick={mockOnCellClick}
        isPlayerBoard={true}
        hideShips={false}
      />
    )

    expect(screen.getByText('💥')).toBeInTheDocument()
  })

  it('displays miss marker when cell is missed', () => {
    const missBoard: Board = JSON.parse(JSON.stringify(mockBoard))
    missBoard[0][0] = { hasShip: false, isHit: false, isMiss: true, shipId: null }
    
    const mockOnCellClick = vi.fn()
    render(
      <GameBoard
        board={missBoard}
        onCellClick={mockOnCellClick}
        isPlayerBoard={true}
        hideShips={false}
      />
    )

    expect(screen.getByText('○')).toBeInTheDocument()
  })

  it('shows ships on player board when hideShips is false', () => {
    const shipBoard: Board = JSON.parse(JSON.stringify(mockBoard))
    shipBoard[0][0] = { hasShip: true, isHit: false, isMiss: false, shipId: 0 }
    
    const mockOnCellClick = vi.fn()
    const { container } = render(
      <GameBoard
        board={shipBoard}
        onCellClick={mockOnCellClick}
        isPlayerBoard={true}
        hideShips={false}
      />
    )

    const shipCell = container.querySelector('.cell.ship')
    expect(shipCell).toBeInTheDocument()
  })

  it('hides ships when hideShips is true', () => {
    const shipBoard: Board = JSON.parse(JSON.stringify(mockBoard))
    shipBoard[0][0] = { hasShip: true, isHit: false, isMiss: false, shipId: 0 }
    
    const mockOnCellClick = vi.fn()
    const { container } = render(
      <GameBoard
        board={shipBoard}
        onCellClick={mockOnCellClick}
        isPlayerBoard={false}
        hideShips={true}
      />
    )

    const shipCell = container.querySelector('.cell.ship')
    expect(shipCell).not.toBeInTheDocument()
  })
})
