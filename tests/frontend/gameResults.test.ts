import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveGameResult, getGameResults, GameResult } from '../../src/utils/gameResults';

// Mock fetch
global.fetch = vi.fn();

describe('gameResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockResult: GameResult = {
    id: '123',
    date: '2026-01-15',
    player1Name: 'Player1',
    player2Name: 'Player2',
    winner: 'Player1',
    gameMode: 'pvp'
  };

  describe('saveGameResult', () => {
    it('should save result to server successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [mockResult]
      });

      await saveGameResult(mockResult);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/results',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockResult)
        })
      );
    });

    it('should fallback to localStorage on server error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await saveGameResult(mockResult);

      const stored = localStorage.getItem('seaBattleResults');
      expect(stored).not.toBeNull();
      if (stored) {
        const results = JSON.parse(stored);
        expect(results).toHaveLength(1);
        expect(results[0]).toEqual(mockResult);
      }
    });

    it('should fallback to localStorage when server returns error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await saveGameResult(mockResult);

      const stored = localStorage.getItem('seaBattleResults');
      expect(stored).not.toBeNull();
    });
  });

  describe('getGameResults', () => {
    it('should fetch results from server successfully', async () => {
      const mockResults = [mockResult];
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResults
      });

      const results = await getGameResults();

      expect(results).toEqual(mockResults);
      expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/results');
    });

    it('should fallback to localStorage on server error', async () => {
      const mockResults = [mockResult];
      localStorage.setItem('seaBattleResults', JSON.stringify(mockResults));
      
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const results = await getGameResults();

      expect(results).toEqual(mockResults);
    });

    it('should return empty array when no results exist', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const results = await getGameResults();

      expect(results).toEqual([]);
    });

    it('should handle localStorage parse errors', async () => {
      localStorage.setItem('seaBattleResults', 'invalid json');
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const results = await getGameResults();

      expect(results).toEqual([]);
    });
  });
});
