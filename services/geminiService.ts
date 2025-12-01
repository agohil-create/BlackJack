
import { GoogleGenAI, Chat } from "@google/genai";
import { Card, GameResult, GameState } from '../types';
import { calculateScore } from '../utils/blackjackUtils';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const formatHand = (hand: Card[]) => {
  return hand.map(c => c.isHidden ? "[Hidden]" : `${c.rank}${c.suit}`).join(', ');
};

export const VIC_PERSONA = `
You are Victoria (Vic), a sharp-tongued, witty, and slightly flirty high-stakes dealer at khel.fun. 
You respect big bold plays but love to tease hesitation or bad luck.
Your tone is dry, confident, and conversational. Avoid generic robot casino clichés.
Be sarcastic if they lose, slightly impressed if they win big.
You are chatting with the player while dealing Blackjack.
Keep your responses relatively short, punchy, and engaging.
`;

const FALLBACK_COMMENTS: Record<string, string[]> = {
  initial: [
    "Chips are down. Don't choke.",
    "Let's see if luck has a pulse today.",
    "Cards are flying. Try to keep up.",
    "Big money, dubious choices. My favorite.",
    "Here we go. Try not to blink."
  ],
  hit: [
    "Living dangerously? I like it.",
    "Digging for gold, or digging a grave?",
    "Bold strategy. Let's see if it pays.",
    "One more? You have a death wish.",
    "Searching for a miracle?"
  ],
  stand: [
    "Parking the bus? Smart.",
    "Playing it safe. How boring.",
    "Stopping there? Alright, my turn.",
    "Cowardice or calculation? We'll see.",
    "Done already? Shame."
  ],
  double: [
    "Double down? Someone's feeling cocky.",
    "Twice the risk, twice the... pain?",
    "Aggressive. I hope your wallet can handle it.",
    "Going big! I love a risk-taker."
  ],
  surrender: [
    "Running away? Probably wise.",
    "Surrender accepted. Coward.",
    "Cutting your losses. Smart, but dull.",
    "Fleeing the scene? Fair enough."
  ],
  insurance: [
    "Buying protection? How prudent.",
    "Scared of the Ace? You should be.",
    "Insurance. The tax on fear."
  ],
  split: [
      "Dividing forces? Divide and conquer.",
      "Two hands, double the trouble.",
      "Splitting? Getting fancy, aren't we.",
      "Let's see if two heads are better than one."
  ],
  player_win: [
    "Fine, take the money. Don't gloat.",
    "Beginner's luck is a powerful drug.",
    "You got me. Enjoy it while it lasts.",
    "Nice hand. I've seen better, but it pays.",
    "Calculated win. I respect that.",
    "Don't spend it all on cheap drinks."
  ],
  dealer_win: [
    "The house always wins. Shocking, I know.",
    "Don't cry, it stains the felt.",
    "My chips now. Thanks for the donation.",
    "Better luck in the next life.",
    "Not your hand, darling. Maybe next time.",
    "Ouch. That looked expensive."
  ],
  blackjack: [
    "Blackjack. Show off.",
    "21. You're ruining my profit margins.",
    "Look at you, counting cards?",
    "Winner winner. Yeah, yeah, take it.",
    "Perfection. I hate it.",
    "Blackjack! You're on fire."
  ],
  bust: [
    "And... boom. Too much.",
    "Greed is a killer, darling.",
    "Bust. That was painful to watch.",
    "Over the limit. Story of your life?",
    "You flew too close to the sun.",
    "Calculated risk... bad calculation."
  ],
  push: [
    "Push. Like kissing your sister.",
    "A tie. How anticlimactic.",
    "Nobody wins. Exciting stuff.",
    "Money back. Try actually winning next time.",
    "Stalemate. Boring."
  ],
  mixed: [
      "Win some, lose some. The circle of life.",
      "A mixed bag. Could be worse.",
      "Breaking even is better than broke.",
      "Half victory, half defeat."
  ],
  default: [
    "Let's see how this plays out.",
    "Interesting...",
    "The cards are fickle mistresses."
  ]
};

const getRandomFallback = (key: string): string => {
  const comments = FALLBACK_COMMENTS[key] || FALLBACK_COMMENTS.default;
  return comments[Math.floor(Math.random() * comments.length)];
};

export const generateDealerAvatar = async (): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        text: 'A hyper-realistic close-up portrait of a beautiful Eurasian female casino dealer named Victoria. She has sophisticated makeup, glossy lips, and is wearing a formal black tuxedo vest with a bowtie. She is looking directly at the camera with a confident, slight smile. The background is pure solid black. 8k resolution, cinematic lighting, photorealistic.'
                    }
                ]
            }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (error) {
        console.error("Failed to generate avatar:", error);
        return null;
    }
};

export const getDealerComment = async (
  gameState: GameState,
  results: GameResult[],
  playerHands: Card[][],
  dealerHand: Card[],
  currentBet: number,
  totalBalance: number,
  action?: 'double' | 'surrender' | 'insurance'
): Promise<string> => {
  
  try {
    const modelId = 'gemini-2.5-flash';
    const dealerHandStr = formatHand(dealerHand);
    
    let context = "";
    let fallbackKey = 'default';
    
    const isSplit = playerHands.length > 1;
    const scores = playerHands.map(h => calculateScore(h));

    // Handle specific explicit actions first
    if (action === 'double') {
        context = "Player just Doubled Down. High risk, high reward.";
        fallbackKey = 'double';
    } else if (action === 'surrender') {
        context = "Player Surrendered the hand, forfeiting half the bet.";
        fallbackKey = 'surrender';
    } else if (action === 'insurance') {
        context = "Dealer is showing an Ace. Player is considering Insurance.";
        fallbackKey = 'insurance';
    } else if (gameState === GameState.Playing) {
        const totalCards = playerHands.reduce((acc, h) => acc + h.length, 0);
        
        if (isSplit && totalCards === 4 && playerHands[1].length === 2 && playerHands[0].length === 2) {
             context = "Player just split their hand.";
             fallbackKey = 'split';
        } else if (playerHands[0].length === 2 && !isSplit) {
            context = `The player has just been dealt their opening hand. Score: ${scores[0]}.`;
            fallbackKey = 'initial';
        } else {
            context = `The player is hitting. Scores: ${scores.join(', ')}.`;
            fallbackKey = 'hit';
        }
    } else if (gameState === GameState.DealerTurn) {
        context = `The player finished their turn. Final Player Scores: ${scores.join(', ')}. Now dealer plays.`;
        fallbackKey = 'stand';
    } else {
        // Game Over
        const wins = results.filter(r => r === GameResult.PlayerWin || r === GameResult.Blackjack).length;
        const losses = results.filter(r => r === GameResult.DealerWin || r === GameResult.Bust).length;
        
        if (results.includes(GameResult.Surrender)) {
             context = "Player surrendered.";
             fallbackKey = 'surrender';
        } else if (isSplit) {
            if (wins > losses) { context = "Player won majority of split hands."; fallbackKey = 'player_win'; }
            else if (losses > wins) { context = "Player lost majority of split hands."; fallbackKey = 'dealer_win'; }
            else { context = "Player broke even on split hands."; fallbackKey = 'mixed'; }
        } else {
            switch(results[0]) {
                case GameResult.PlayerWin: context = "The player won."; fallbackKey = 'player_win'; break;
                case GameResult.DealerWin: context = "The dealer (you) won."; fallbackKey = 'dealer_win'; break;
                case GameResult.Bust: context = "The player busted."; fallbackKey = 'bust'; break;
                case GameResult.Blackjack: context = "The player got Blackjack!"; fallbackKey = 'blackjack'; break;
                case GameResult.Push: context = "It's a push (tie)."; fallbackKey = 'push'; break;
            }
        }
    }

    const prompt = `
      ${VIC_PERSONA}
      
      Current Game Event: ${context}
      Data:
      - Player's Hand(s): ${playerHands.map(h => formatHand(h)).join(' | ')} (Scores: ${scores.join(', ')})
      - Dealer's Hand: ${dealerHandStr}
      - Bet: $${currentBet}
      - Balance: $${totalBalance}
      
      Generate a ONE-sentence comment (max 15 words) that reacts to the situation.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: { maxOutputTokens: 60, temperature: 1.1 }
    });

    return response.text?.trim() || getRandomFallback(fallbackKey);
  } catch (error) {
    if (action) return getRandomFallback(action);
    if (gameState === GameState.Playing) return getRandomFallback('hit');
    return getRandomFallback('default');
  }
};


// --- CHAT SERVICE ---
let chatSession: Chat | null = null;

export const initChatSession = () => {
    if (!chatSession) {
        chatSession = ai.chats.create({
            model: 'gemini-3-pro-preview',
            config: {
                systemInstruction: VIC_PERSONA + "\nIf the user asks about the game rules, explain them briefly. If they flirt, flirt back but keep it professional-ish. Keep answers relatively short to fit in a chat bubble."
            }
        });
    }
    return chatSession;
};

export const sendChatMessage = async (message: string): Promise<string> => {
    try {
        const session = initChatSession();
        const response = await session.sendMessage({ message });
        return response.text || "I'm busy shuffling, darling. Ask me in a second.";
    } catch (error) {
        console.error("Chat error:", error);
        // Reset session on error to prevent stuck state
        chatSession = null;
        return "Not now, honey. The pit boss is watching.";
    }
};