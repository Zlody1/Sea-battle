import { describe, it, expect } from 'vitest';
import { generateRandomName } from '../../src/utils/nameGenerator';

describe('nameGenerator', () => {
  describe('generateRandomName', () => {
    it('should generate a name with the correct format', () => {
      const name = generateRandomName();
      
      // Should match pattern: AdjNoun123
      expect(name).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d{1,3}$/);
    });

    it('should generate unique names', () => {
      const names = new Set();
      
      // Generate 100 names
      for (let i = 0; i < 100; i++) {
        names.add(generateRandomName());
      }
      
      // Should have at least 90 unique names (allowing some collisions)
      expect(names.size).toBeGreaterThan(90);
    });

    it('should always return a string', () => {
      const name = generateRandomName();
      expect(typeof name).toBe('string');
    });

    it('should include a number between 1-999', () => {
      const name = generateRandomName();
      const numberMatch = name.match(/\d+$/);
      
      expect(numberMatch).not.toBeNull();
      if (numberMatch) {
        const number = parseInt(numberMatch[0]);
        expect(number).toBeGreaterThanOrEqual(1);
        expect(number).toBeLessThanOrEqual(999);
      }
    });

    it('should not be empty', () => {
      const name = generateRandomName();
      expect(name.length).toBeGreaterThan(0);
    });
  });
});
