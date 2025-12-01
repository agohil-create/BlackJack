
export enum Suit {
  Hearts = '♥',
  Diamonds = '♦',
  Clubs = '♣',
  Spades = '♠'
}

export interface Card {
  suit: Suit;
  rank: string;
  value: number;
  isHidden?: boolean;
}

export enum GameState {
  Betting,
  Dealing, // New state for animation phase
  Insurance,
  Playing,
  DealerTurn,
  GameOver
}

export enum GameResult {
  None,
  PlayerWin,
  DealerWin,
  Push,
  Blackjack,
  Bust,
  Surrender,
  InsuranceWin,
  InsuranceLose
}

export interface ChipValue {
  value: number;
  color: string;
  borderColor: string;
  label: string;
}

export interface HandMetadata {
  bet: number;
  isDoubled: boolean;
  isSurrendered: boolean;
}