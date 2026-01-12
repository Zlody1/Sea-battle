import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3001';

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

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    newSocket.on('playerAssigned', ({ playerNumber: pNum }) => {
      setPlayerNumber(pNum);
      console.log('Assigned as Player', pNum);
    });

    newSocket.on('opponentJoined', () => {
      setOpponentConnected(true);
      console.log('Opponent joined');
    });

    newSocket.on('opponentShipsUpdated', ({ shipsPlaced }) => {
      setOpponentShipsPlaced(shipsPlaced);
    });

    newSocket.on('opponentReady', () => {
      setOpponentReady(true);
    });

    newSocket.on('gameFull', () => {
      alert('This game is already full. Please create or join a different game.');
    });

    newSocket.on('opponentDisconnected', () => {
      alert('Opponent disconnected. Game ended.');
      setOpponentConnected(false);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const joinGame = useCallback((id: string) => {
    if (socket && id) {
      setGameId(id);
      setIsMultiplayerMode(true);
      socket.emit('joinGame', id);
    }
  }, [socket]);

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
    joinGame,
    updateShips,
    setReady,
    sendAttack,
    setIsMultiplayerMode
  };
};
