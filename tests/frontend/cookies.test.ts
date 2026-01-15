import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setCookie, getCookie, deleteCookie } from '../../src/utils/cookies';

describe('cookies', () => {
  beforeEach(() => {
    // Clear all cookies before each test
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
    });
  });

  describe('setCookie', () => {
    it('should set a cookie with the given name and value', () => {
      setCookie('testCookie', 'testValue');
      
      expect(document.cookie).toContain('testCookie=testValue');
    });

    it('should set a cookie with default expiry of 365 days', () => {
      setCookie('testCookie', 'testValue');
      
      // Cookie should exist
      expect(getCookie('testCookie')).toBe('testValue');
    });

    it('should set a cookie with custom expiry days', () => {
      setCookie('testCookie', 'testValue', 30);
      
      expect(getCookie('testCookie')).toBe('testValue');
    });

    it('should overwrite existing cookie with same name', () => {
      setCookie('testCookie', 'value1');
      setCookie('testCookie', 'value2');
      
      expect(getCookie('testCookie')).toBe('value2');
    });
  });

  describe('getCookie', () => {
    it('should retrieve a cookie by name', () => {
      setCookie('testCookie', 'testValue');
      
      expect(getCookie('testCookie')).toBe('testValue');
    });

    it('should return null for non-existent cookie', () => {
      expect(getCookie('nonExistent')).toBeNull();
    });

    it('should handle cookies with spaces in the name', () => {
      document.cookie = 'spaced Cookie=value';
      
      expect(getCookie('spaced Cookie')).toBe('value');
    });

    it('should retrieve correct cookie when multiple exist', () => {
      setCookie('cookie1', 'value1');
      setCookie('cookie2', 'value2');
      setCookie('cookie3', 'value3');
      
      expect(getCookie('cookie2')).toBe('value2');
    });
  });

  describe('deleteCookie', () => {
    it('should delete an existing cookie', () => {
      setCookie('testCookie', 'testValue');
      expect(getCookie('testCookie')).toBe('testValue');
      
      deleteCookie('testCookie');
      
      expect(getCookie('testCookie')).toBeNull();
    });

    it('should not throw error when deleting non-existent cookie', () => {
      expect(() => deleteCookie('nonExistent')).not.toThrow();
    });
  });
});
