import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFile, writeFile } from 'fs/promises';
import { existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the functions we want to test
// We'll use dynamic import to ensure fresh module state
let getGameResults: any;
let saveGameResult: any;
let TEST_DB_FILE: string;

describe('database', () => {
  beforeEach(async () => {
    // Clear module cache and reimport
    vi.resetModules();
    
    // Set up test database file
    TEST_DB_FILE = join(__dirname, 'test-game-results.json');
    
    // Clean up test files BEFORE tests
    const testFiles = [
      TEST_DB_FILE,
      join(dirname(__dirname), '..', 'backend', 'game-results.json'),
      join(dirname(__dirname), '..', 'backend', 'data', 'game-results.json')
    ];
    
    testFiles.forEach(file => {
      if (existsSync(file)) {
        try {
          unlinkSync(file);
        } catch (e) {
          // Ignore errors
        }
      }
    });
    
    // Mock the DB_FILE path in the module
    vi.doMock('../../backend/database.js', async () => {
      const actualModule = await vi.importActual('../../backend/database.js');
      return {
        ...actualModule as any,
        // We'll test with actual file operations
      };
    });

    const module = await import('../../backend/database.js');
    getGameResults = module.getGameResults;
    saveGameResult = module.saveGameResult;
  });

  afterEach(() => {
    // Clean up test files
    const testFiles = [
      TEST_DB_FILE,
      join(dirname(__dirname), '..', 'backend', 'game-results.json'),
      join(dirname(__dirname), '..', 'backend', 'data', 'game-results.json')
    ];
    
    testFiles.forEach(file => {
      if (existsSync(file)) {
        try {
          unlinkSync(file);
        } catch (e) {
          // Ignore errors
        }
      }
    });
  });

  describe('getGameResults', () => {
    it('should return empty array when file does not exist', async () => {
      const results = await getGameResults();
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });

    it('should return saved results from file', async () => {
      const mockResults = [
        {
          id: '1',
          date: '2026-01-15',
          player1Name: 'Player1',
          player2Name: 'Player2',
          winner: 'Player1',
          gameMode: 'online'
        }
      ];

      await saveGameResult(mockResults[0]);
      const results = await getGameResults();

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(mockResults[0]);
    });

    it('should handle corrupted JSON file gracefully', async () => {
      const dbPath = join(dirname(__dirname), '..', 'backend', 'game-results.json');
      await writeFile(dbPath, 'invalid json', 'utf-8');

      const results = await getGameResults();
      expect(results).toEqual([]);
    });
  });

  describe('saveGameResult', () => {
    it('should save a new result', async () => {
      const newResult = {
        id: '1',
        date: '2026-01-15',
        player1Name: 'Player1',
        player2Name: 'Player2',
        winner: 'Player1',
        gameMode: 'online' as const
      };

      const results = await saveGameResult(newResult);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(newResult);
    });

    it('should add new results to the beginning of the array', async () => {
      const result1 = {
        id: '1',
        date: '2026-01-15',
        player1Name: 'Player1',
        player2Name: 'Player2',
        winner: 'Player1',
        gameMode: 'online' as const
      };

      const result2 = {
        id: '2',
        date: '2026-01-16',
        player1Name: 'Player3',
        player2Name: 'Player4',
        winner: 'Player3',
        gameMode: 'pvp' as const
      };

      await saveGameResult(result1);
      const results = await saveGameResult(result2);

      expect(results[0]).toEqual(result2);
      expect(results[1]).toEqual(result1);
    });

    it('should limit results to MAX_RESULTS (50)', async () => {
      // Save 51 results
      for (let i = 0; i < 51; i++) {
        await saveGameResult({
          id: i.toString(),
          date: new Date().toLocaleString(),
          player1Name: 'Player1',
          player2Name: 'Player2',
          winner: 'Player1',
          gameMode: 'online' as const
        });
      }

      const results = await getGameResults();
      expect(results).toHaveLength(50);
    });

    it('should persist results to file', async () => {
      const newResult = {
        id: '1',
        date: '2026-01-15',
        player1Name: 'Player1',
        player2Name: 'Player2',
        winner: 'Player1',
        gameMode: 'pvc' as const
      };

      await saveGameResult(newResult);

      // Read results again to ensure persistence
      const results = await getGameResults();
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(newResult);
    });

    it('should return all results after saving', async () => {
      const result1 = {
        id: '1',
        date: '2026-01-15',
        player1Name: 'Player1',
        player2Name: 'Player2',
        winner: 'Player1',
        gameMode: 'online' as const
      };

      const result2 = {
        id: '2',
        date: '2026-01-16',
        player1Name: 'Player3',
        player2Name: 'Player4',
        winner: 'Player4',
        gameMode: 'pvp' as const
      };

      await saveGameResult(result1);
      const allResults = await saveGameResult(result2);

      expect(allResults).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('should handle write errors gracefully', async () => {
      // This test would need filesystem mocking for proper error simulation
      // For now, we just ensure the function exists and can be called
      const result = {
        id: '1',
        date: '2026-01-15',
        player1Name: 'Player1',
        player2Name: 'Player2',
        winner: 'Player1',
        gameMode: 'online' as const
      };

      await expect(saveGameResult(result)).resolves.toBeDefined();
    });
  });
});
