import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../src/App';

// Mock the game results utilities
vi.mock('../../src/utils/gameResults', () => ({
  getGameResults: vi.fn(() => Promise.resolve([])),
  saveGameResult: vi.fn(() => Promise.resolve())
}));

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const mockSocket = {
    on: vi.fn(),
    emit: vi.fn(),
    off: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    close: vi.fn(),
    connected: false,
  };
  return {
    default: vi.fn(() => mockSocket),
    io: vi.fn(() => mockSocket)
  };
});

describe('App', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('renders the game title', () => {
    render(<App />);
    expect(screen.getByText(/Sea Battle/i)).toBeInTheDocument();
  });

  it('displays game mode selection by default', () => {
    render(<App />);
    expect(screen.getByText('Select Game Mode')).toBeInTheDocument();
  });

  it('shows player name input field', () => {
    render(<App />);
    const nameInput = screen.getByPlaceholderText('Enter your name');
    expect(nameInput).toBeInTheDocument();
  });

  it('allows player to change their name', () => {
    render(<App />);
    const nameInput = screen.getByPlaceholderText('Enter your name') as HTMLInputElement;
    
    fireEvent.change(nameInput, { target: { value: 'TestPlayer' } });
    
    expect(nameInput.value).toBe('TestPlayer');
  });

  it('displays local multiplayer button', () => {
    render(<App />);
    expect(screen.getByText(/Player vs Player \(Local\)/i)).toBeInTheDocument();
  });

  it('displays online multiplayer button', () => {
    render(<App />);
    expect(screen.getByText(/Online Multiplayer/i)).toBeInTheDocument();
  });

  it('displays player vs computer button', () => {
    render(<App />);
    expect(screen.getByText(/Player vs Computer/i)).toBeInTheDocument();
  });

  it('starts local game when clicking local mode button', () => {
    render(<App />);
    const localButton = screen.getByText(/Player vs Player \(Local\)/i);
    
    fireEvent.click(localButton);
    
    // Should show the auto-place button after selecting local mode
    expect(screen.queryByText('Select Game Mode')).not.toBeInTheDocument();
  });

  it('starts computer game when clicking computer mode button', () => {
    render(<App />);
    const computerButton = screen.getByText(/Player vs Computer/i);
    
    fireEvent.click(computerButton);
    
    // Should show the auto-place button after selecting computer mode
    expect(screen.queryByText('Select Game Mode')).not.toBeInTheDocument();
  });
});
