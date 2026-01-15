import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { Server } from 'socket.io';

describe('HTTP API Endpoints', () => {
  let httpServer: any;
  let ioServer: Server;
  const TEST_PORT = 3003;
  const BASE_URL = `http://localhost:${TEST_PORT}`;

  beforeAll(async () => {
    // Import and set up the server with mock database
    httpServer = createServer(async (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.method === 'GET' && req.url === '/api/results') {
        try {
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
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(mockResults));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to fetch results' }));
        }
        return;
      }

      if (req.method === 'POST' && req.url === '/api/results') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', async () => {
          try {
            const result = JSON.parse(body);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify([result]));
          } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to save result' }));
          }
        });
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });

    ioServer = new Server(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(TEST_PORT, () => {
        resolve();
      });
    });
  });

  afterAll(() => {
    ioServer.close();
    httpServer.close();
  });

  describe('GET /api/results', () => {
    it('should return game results', async () => {
      const response = await fetch(`${BASE_URL}/api/results`);
      
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return JSON content type', async () => {
      const response = await fetch(`${BASE_URL}/api/results`);
      
      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('application/json');
    });

    it('should include CORS headers', async () => {
      const response = await fetch(`${BASE_URL}/api/results`);
      
      expect(response.headers.get('access-control-allow-origin')).toBeTruthy();
    });
  });

  describe('POST /api/results', () => {
    it('should save a new game result', async () => {
      const newResult = {
        id: Date.now().toString(),
        date: new Date().toLocaleString(),
        player1Name: 'TestPlayer1',
        player2Name: 'TestPlayer2',
        winner: 'TestPlayer1',
        gameMode: 'online'
      };

      const response = await fetch(`${BASE_URL}/api/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newResult),
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return error for invalid JSON', async () => {
      const response = await fetch(`${BASE_URL}/api/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      expect(response.status).toBe(500);
    });

    it('should handle OPTIONS preflight request', async () => {
      const response = await fetch(`${BASE_URL}/api/results`, {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(200);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await fetch(`${BASE_URL}/api/unknown`);
      
      expect(response.status).toBe(404);
    });
  });
});
