import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getCookie, setCookie } from '../utils/cookies';
import { generateRandomName } from '../utils/nameGenerator';

// Automatically detect if running on localhost or production
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const SERVER_URL = isLocalhost 
  ? 'http://localhost:3001'
  : 'http://ec2-54-75-57-244.eu-west-1.compute.amazonaws.com:3001';

interface Ship {
  id: number;
  name: string;
  size: number;
  positions: { row: number; col: number }[];
  hits: number;
}

interface Cell {
  hasShip: boolean;
  isHit: boolean;
  isMiss: boolean;
  shipId: number | null;
}

type Board = Cell[][];

export const useMultiplayer = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [gameId, setGameId] = useState<string>('');
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [opponentShipsPlaced, setOpponentShipsPlaced] = useState(0);
  const [isMultiplayerMode, setIsMultiplayerMode] = useState(false);
  const [playerName, setPlayerName] = useState<string>('');
  const [opponentName, setOpponentName] = useState<string>('');

  // Initialize player name from cookie or generate new one
  useEffect(() => {
    const savedName = getCookie('playerName');
    if (savedName) {
      setPlayerName(savedName);
    } else {
      const newName = generateRandomName();
      setPlayerName(newName);
      setCookie('playerName', newName);
    }
  }, []);

  const updatePlayerName = useCallback((newName: string) => {
    setPlayerName(newName);
    setCookie('playerName', newName);
    if (socket && gameId) {
      socket.emit('updatePlayerName', { gameId, playerName: newName });
    }
  }, [socket, gameId]);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    newSocket.on('playerAssigned', ({ playerNumber: pNum }) => {
      setPlayerNumber(pNum);
      console.log('Assigned as Player', pNum);
    });

    newSocket.on('opponentJoined', ({ opponentName: oppName }) => {
      setOpponentConnected(true);
      if (oppName) {
        setOpponentName(oppName);
      }
      console.log('Opponent joined');
    });

    newSocket.on('opponentShipsUpdated', ({ shipsPlaced }) => {
      setOpponentShipsPlaced(shipsPlaced);
    });

    newSocket.on('opponentReady', () => {
      setOpponentReady(true);
    });

    newSocket.on('opponentNameUpdated', ({ playerName: oppName }) => {
      setOpponentName(oppName);
    });

    newSocket.on('gameFull', () => {
      alert('This game is already full. Please create or join a different game.');
    });

    newSocket.on('opponentDisconnected', ({ message, beforeGameStart }) => {
      alert(message || 'Opponent disconnected. Game ended.');
      setOpponentConnected(false);
      setOpponentName('');
      if (beforeGameStart) {
        setOpponentReady(false);
        setOpponentShipsPlaced(0);
      }
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const joinGame = useCallback((id: string) => {
    if (socket && id && playerName) {
      setGameId(id);
      setIsMultiplayerMode(true);
      socket.emit('joinGame', { gameId: id, playerName });
    }
  }, [socket, playerName]);

  const updateShips = useCallback((ships: Ship[], board: Board) => {
    if (socket && gameId && isMultiplayerMode) {
      socket.emit('updateShips', { gameId, ships, board });
    }
  }, [socket, gameId, isMultiplayerMode]);

  const setReady = useCallback(() => {
    if (socket && gameId && isMultiplayerMode) {
      socket.emit('setReady', { gameId });
    }
  }, [socket, gameId, isMultiplayerMode]);

  const sendAttack = useCallback((row: number, col: number) => {
    if (socket && gameId && isMultiplayerMode) {
      socket.emit('attack', { gameId, row, col });
    }
  }, [socket, gameId, isMultiplayerMode]);

  return {
    socket,
    playerNumber,
    gameId,
    opponentConnected,
    opponentReady,
    opponentShipsPlaced,
    isMultiplayerMode,
    playerName,
    opponentName,
    joinGame,
    updateShips,
    setReady,
    sendAttack,
    setIsMultiplayerMode,
    updatePlayerName
  };
};
