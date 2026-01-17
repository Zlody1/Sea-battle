import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, 'data');
const DB_FILE = join(DATA_DIR, 'game-results.json');
const MAX_RESULTS = 50;

// Ensure data directory exists
try {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
} catch (error) {
  console.error('Error creating data directory:', error);
}

export async function getGameResults() {
  try {
    if (!existsSync(DB_FILE)) {
      return [];
    }
    const data = await readFile(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading game results:', error);
    return [];
  }
}

export async function saveGameResult(result) {
  try {
    const results = await getGameResults();
    results.unshift(result); // Add to beginning
    
    // Keep only the latest MAX_RESULTS
    const trimmedResults = results.slice(0, MAX_RESULTS);
    
    await writeFile(DB_FILE, JSON.stringify(trimmedResults, null, 2), 'utf-8');
    return trimmedResults;
  } catch (error) {
    console.error('Error saving game result:', error);
    throw error;
  }
}
