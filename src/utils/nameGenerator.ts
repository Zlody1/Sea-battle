const adjectives = [
  'Brave', 'Swift', 'Mighty', 'Cunning', 'Fearless',
  'Bold', 'Noble', 'Fierce', 'Wise', 'Silent',
  'Thunder', 'Storm', 'Iron', 'Steel', 'Shadow',
  'Golden', 'Silver', 'Crimson', 'Azure', 'Emerald',
  'Phantom', 'Rogue', 'Savage', 'Ancient', 'Mystic'
];

const nouns = [
  'Captain', 'Admiral', 'Sailor', 'Pirate', 'Navigator',
  'Warrior', 'Commander', 'Hunter', 'Raider', 'Corsair',
  'Mariner', 'Buccaneer', 'Skipper', 'Seafarer', 'Voyager',
  'Conqueror', 'Champion', 'Legend', 'Hero', 'Titan',
  'Guardian', 'Defender', 'Destroyer', 'Avenger', 'Striker'
];

export const generateRandomName = (): string => {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 999) + 1;
  
  return `${adjective}${noun}${number}`;
};
