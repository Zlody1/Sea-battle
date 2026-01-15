# Tests

This directory contains comprehensive tests for both frontend and backend code.

## Structure

```
tests/
├── frontend/          Frontend tests (React components, hooks, utilities)
│   ├── GameBoard.test.tsx
│   ├── useMultiplayer.test.ts
│   ├── cookies.test.ts
│   ├── gameResults.test.ts
│   └── nameGenerator.test.ts
└── backend/           Backend tests (Server, database, API)
    ├── server.test.ts
    ├── api.test.ts
    └── database.test.ts
```

## Running Tests

### All Tests
```bash
npm test
```

### Frontend Tests Only
```bash
npm test tests/frontend
```

### Backend Tests Only
```bash
npm test tests/backend
```

### With Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm test -- --watch
```

### UI Mode
```bash
npm run test:ui
```

## Coverage Goals

This test suite aims for 80% code coverage across:
- Lines
- Functions
- Branches
- Statements

## Frontend Tests

### Components
- **GameBoard.test.tsx** - Tests for the game board component including rendering, click handlers, ship display, and preview functionality

### Hooks
- **useMultiplayer.test.ts** - Tests for the multiplayer hook including socket connection, player name management, and game state

### Utilities
- **cookies.test.ts** - Tests for cookie management (set, get, delete)
- **gameResults.test.ts** - Tests for game results API integration and localStorage fallback
- **nameGenerator.test.ts** - Tests for random name generation

## Backend Tests

### Server
- **server.test.ts** - Tests for Socket.IO real-time multiplayer functionality including:
  - Player joining games
  - Opponent notifications
  - Ship placement updates
  - Ready state management
  - Disconnection handling

### API
- **api.test.ts** - Tests for HTTP REST API endpoints:
  - GET /api/results
  - POST /api/results
  - CORS headers
  - Error handling

### Database
- **database.test.ts** - Tests for database operations:
  - Saving game results
  - Retrieving game results
  - Result ordering (newest first)
  - Max results limit (50)
  - Error handling

## Test Coverage Report

After running `npm run test:coverage`, view the HTML coverage report at:
```
coverage/index.html
```

## Writing New Tests

### Frontend Test Template
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('ComponentName', () => {
  it('should do something', () => {
    // Arrange
    // Act
    // Assert
    expect(true).toBe(true);
  });
});
```

### Backend Test Template
```typescript
import { describe, it, expect } from 'vitest';

describe('FunctionName', () => {
  it('should do something', async () => {
    // Arrange
    // Act
    const result = await someFunction();
    // Assert
    expect(result).toBeDefined();
  });
});
```

## Mocking

Tests use Vitest's built-in mocking capabilities:
- `vi.fn()` - Create mock functions
- `vi.mock()` - Mock entire modules
- `vi.spyOn()` - Spy on object methods

## Dependencies

Test dependencies are already installed:
- vitest - Test runner
- @testing-library/react - React component testing utilities
- @testing-library/jest-dom - Custom matchers for DOM
- jsdom - DOM implementation for Node.js
- socket.io-client - For testing WebSocket connections

## CI/CD Integration

These tests are designed to run in CI/CD pipelines. Example GitHub Actions:

```yaml
- name: Run tests
  run: npm test -- --run

- name: Check coverage
  run: npm run test:coverage
```
