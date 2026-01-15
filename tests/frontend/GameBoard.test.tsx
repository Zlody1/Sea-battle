import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GameBoard from '../../src/components/GameBoard';

describe('GameBoard', () => {
  const createEmptyBoard = () => {
    return Array(10).fill(null).map(() => 
      Array(10).fill(null).map(() => ({
        hasShip: false,
        isHit: false,
        isMiss: false,
        shipId: null
      }))
    );
  };

  it('should render a 10x10 grid', () => {
    const board = createEmptyBoard();
    const { container } = render(<GameBoard board={board} onCellClick={() => {}} isPlayerBoard={false} />);

    const cells = container.querySelectorAll('.cell');
    expect(cells).toHaveLength(100);
  });

  it('should call onCellClick when a cell is clicked', () => {
    const board = createEmptyBoard();
    const mockClick = vi.fn();
    
    const { container } = render(<GameBoard board={board} onCellClick={mockClick} isPlayerBoard={false} />);

    const cells = container.querySelectorAll('.cell');
    fireEvent.click(cells[0]);

    expect(mockClick).toHaveBeenCalledWith(0, 0, false);
  });

  it('should display ships on player board', () => {
    const board = createEmptyBoard();
    board[0][0].hasShip = true;
    board[0][0].shipId = 0;

    const { container } = render(
      <GameBoard board={board} onCellClick={() => {}} isPlayerBoard={true} />
    );

    const shipCells = container.querySelectorAll('.cell.ship');
    expect(shipCells.length).toBeGreaterThan(0);
  });

  it('should hide ships on opponent board', () => {
    const board = createEmptyBoard();
    board[0][0].hasShip = true;
    board[0][0].shipId = 0;

    const { container } = render(
      <GameBoard board={board} onCellClick={() => {}} isPlayerBoard={false} hideShips={true} />
    );

    const shipCells = container.querySelectorAll('.cell.ship');
    expect(shipCells.length).toBe(0);
  });

  it('should display hits correctly', () => {
    const board = createEmptyBoard();
    board[0][0].isHit = true;

    const { container } = render(
      <GameBoard board={board} onCellClick={() => {}} isPlayerBoard={false} />
    );

    const hitCells = container.querySelectorAll('.cell.hit');
    expect(hitCells.length).toBeGreaterThan(0);
  });

  it('should display misses correctly', () => {
    const board = createEmptyBoard();
    board[0][0].isMiss = true;

    const { container } = render(
      <GameBoard board={board} onCellClick={() => {}} isPlayerBoard={false} />
    );

    const missCells = container.querySelectorAll('.cell.miss');
    expect(missCells.length).toBeGreaterThan(0);
  });

  it('should call onCellHover when hovering over cells', () => {
    const board = createEmptyBoard();
    const mockHover = vi.fn();

    const { container } = render(
      <GameBoard 
        board={board} 
        onCellClick={() => {}} 
        isPlayerBoard={false}
        onCellHover={mockHover}
      />
    );

    const cells = container.querySelectorAll('.cell');
    fireEvent.mouseEnter(cells[5]);

    expect(mockHover).toHaveBeenCalled();
  });

  it('should call onBoardLeave when mouse leaves board', () => {
    const board = createEmptyBoard();
    const mockLeave = vi.fn();

    const { container } = render(
      <GameBoard 
        board={board} 
        onCellClick={() => {}} 
        isPlayerBoard={false}
        onBoardLeave={mockLeave}
      />
    );

    const boardElement = container.querySelector('.game-board');
    if (boardElement) {
      fireEvent.mouseLeave(boardElement);
    }

    expect(mockLeave).toHaveBeenCalled();
  });

  it('should display preview cells when provided', () => {
    const board = createEmptyBoard();
    const previewCells = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 }
    ];

    const { container } = render(
      <GameBoard 
        board={board} 
        onCellClick={() => {}} 
        isPlayerBoard={true}
        previewCells={previewCells}
        previewValid={true}
      />
    );

    const previewElements = container.querySelectorAll('.cell.preview-valid');
    expect(previewElements.length).toBeGreaterThan(0);
  });
});
