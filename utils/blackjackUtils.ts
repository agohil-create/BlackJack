import { Card, Suit } from '../types';

export const createDeck = (numDecks: number = 6): Card[] => {
  const suits = [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];

  for (let d = 0; d < numDecks; d++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        let value = parseInt(rank);
        if (isNaN(value)) {
          if (rank === 'A') value = 11;
          else value = 10;
        }
        deck.push({ suit, rank, value });
      }
    }
  }
  return shuffleDeck(deck);
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

export const calculateScore = (hand: Card[]): number => {
  let score = 0;
  let aces = 0;

  for (const card of hand) {
    if (card.isHidden) continue;
    score += card.value;
    if (card.rank === 'A') aces += 1;
  }

  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }

  return score;
};

// --- SIDE BET LOGIC ---

// Perfect Pairs
// Mixed Pair (5:1): Same Rank, Different Color
// Colored Pair (12:1): Same Rank, Same Color, Different Suit
// Perfect Pair (25:1): Same Rank, Same Suit
export const evaluatePerfectPairs = (card1: Card, card2: Card): { multiplier: number, label: string } | null => {
  if (card1.rank !== card2.rank) return null;

  if (card1.suit === card2.suit) {
    return { multiplier: 25, label: "Perfect Pair" };
  }

  const isRed1 = card1.suit === Suit.Hearts || card1.suit === Suit.Diamonds;
  const isRed2 = card2.suit === Suit.Hearts || card2.suit === Suit.Diamonds;

  if (isRed1 === isRed2) {
    return { multiplier: 12, label: "Colored Pair" };
  }

  return { multiplier: 5, label: "Mixed Pair" };
};

// 21+3 (Poker hand with player's 2 cards + dealer up card)
// Flush (5:1)
// Straight (10:1)
// Three of a Kind (30:1)
// Straight Flush (40:1)
// Suited Trips (100:1)
export const evaluate21Plus3 = (playerHand: Card[], dealerUpCard: Card): { multiplier: number, label: string } | null => {
  if (playerHand.length !== 2) return null;
  
  const cards = [playerHand[0], playerHand[1], dealerUpCard];
  
  // Sort by rank index for straight calculation
  const rankOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const indices = cards.map(c => rankOrder.indexOf(c.rank)).sort((a, b) => a - b);
  
  const isFlush = cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;
  
  const isThreeOfAKind = cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank;
  
  // Check Straight
  // Handle Ace low (0, 1, 12) -> A, 2, 3? No, usually Blackjack straights are rank based.
  // Let's assume strictly consecutive indices. 
  // Also need to handle A, 2, 3 (Indices 12, 0, 1) and Q, K, A (10, 11, 12).
  // Simplified: Standard Poker Straight
  let isStraight = (indices[1] === indices[0] + 1 && indices[2] === indices[1] + 1);
  // Special Ace Low case: 2, 3, A
  if (!isStraight && indices[0] === 0 && indices[1] === 1 && indices[2] === 12) {
      isStraight = true;
  }

  if (isThreeOfAKind && isFlush) return { multiplier: 100, label: "Suited Trips" };
  if (isStraight && isFlush) return { multiplier: 40, label: "Straight Flush" };
  if (isThreeOfAKind) return { multiplier: 30, label: "Three of a Kind" };
  if (isStraight) return { multiplier: 10, label: "Straight" };
  if (isFlush) return { multiplier: 5, label: "Flush" };

  return null;
};