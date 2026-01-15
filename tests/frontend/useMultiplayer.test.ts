import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMultiplayer } from '../../src/hooks/useMultiplayer';
import { act } from 'react';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    off: vi.fn(),
    close: vi.fn()
  }))
}));

// Mock cookie utilities
vi.mock('../../src/utils/cookies', () => ({
  getCookie: vi.fn(() => null),
  setCookie: vi.fn()
}));

// Mock name generator
vi.mock('../../src/utils/nameGenerator', () => ({
  generateRandomName: vi.fn(() => 'TestPlayer123')
}));

describe('useMultiplayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useMultiplayer());

    expect(result.current.playerNumber).toBeNull();
    expect(result.current.gameId).toBe('');
    expect(result.current.opponentConnected).toBe(false);
    expect(result.current.opponentReady).toBe(false);
    expect(result.current.opponentShipsPlaced).toBe(0);
    expect(result.current.isMultiplayerMode).toBe(false);
  });

  it('should initialize player name from cookie or generate new one', async () => {
    const { result } = renderHook(() => useMultiplayer());

    await waitFor(() => {
      expect(result.current.playerName).toBeTruthy();
    });
  });

  it('should have all required functions', () => {
    const { result } = renderHook(() => useMultiplayer());

    expect(typeof result.current.joinGame).toBe('function');
    expect(typeof result.current.updateShips).toBe('function');
    expect(typeof result.current.setReady).toBe('function');
    expect(typeof result.current.sendAttack).toBe('function');
    expect(typeof result.current.updatePlayerName).toBe('function');
    expect(typeof result.current.setIsMultiplayerMode).toBe('function');
  });

  it('should update player name', async () => {
    const { getCookie, setCookie } = await import('../../src/utils/cookies');
    const { result } = renderHook(() => useMultiplayer());

    await waitFor(() => {
      expect(result.current.playerName).toBeTruthy();
    });

    act(() => {
      result.current.updatePlayerName('NewName');
    });

    await waitFor(() => {
      expect(result.current.playerName).toBe('NewName');
      expect(setCookie).toHaveBeenCalledWith('playerName', 'NewName');
    });
  });

  it('should set multiplayer mode', () => {
    const { result } = renderHook(() => useMultiplayer());

    act(() => {
      result.current.setIsMultiplayerMode(true);
    });

    expect(result.current.isMultiplayerMode).toBe(true);
  });
});
