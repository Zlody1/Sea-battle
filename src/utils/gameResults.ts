export interface GameResult {
  id: string;
  date: string;
  player1Name: string;
  player2Name: string;
  winner: string;
  gameMode: 'pvp' | 'pvc' | 'online';
}

// Automatically detect if running on localhost or production
const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const SERVER_URL = isLocalhost 
  ? 'http://localhost:3001'
  : 'http://ec2-54-75-57-244.eu-west-1.compute.amazonaws.com:3001';

export const saveGameResult = async (result: GameResult): Promise<void> => {
  try {
    const response = await fetch(`${SERVER_URL}/api/results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save game result');
    }
  } catch (error) {
    console.error('Error saving game result:', error);
    // Fallback to localStorage if server is unavailable
    const results = getLocalResults();
    results.unshift(result);
    const trimmedResults = results.slice(0, 10);
    localStorage.setItem('seaBattleResults', JSON.stringify(trimmedResults));
  }
};

export const getGameResults = async (): Promise<GameResult[]> => {
  try {
    const response = await fetch(`${SERVER_URL}/api/results`);
    if (!response.ok) {
      throw new Error('Failed to fetch game results');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching game results:', error);
    // Fallback to localStorage if server is unavailable
    return getLocalResults();
  }
};

const getLocalResults = (): GameResult[] => {
  const stored = localStorage.getItem('seaBattleResults');
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

export const clearGameResults = (): void => {
  localStorage.removeItem('seaBattleResults');
};
