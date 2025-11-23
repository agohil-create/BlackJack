import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, GameState, GameResult, ChipValue, HandMetadata, Suit } from './types';
import { createDeck, calculateScore, evaluatePerfectPairs, evaluate21Plus3 } from './utils/blackjackUtils';
import { CardComponent } from './components/CardComponent';
import { Chip } from './components/Chip';
import { VicAvatar } from './components/VicAvatar';
import { DeckPile } from './components/DeckPile';
import { ChatWidget } from './components/ChatWidget';
import { getDealerComment, generateDealerAvatar } from './services/geminiService';
import { Coins, RefreshCw, User, Shield, Split, ShieldAlert, ArrowDownCircle, Flag, Gem, Spade, MessageSquare } from 'lucide-react';
import { 
  initAudio, 
  playCardSound, 
  playChipSound, 
  playWinSound, 
  playLoseSound, 
  playBlackjackSound,
  playMessageSound 
} from './utils/audioManager';

const CHIPS: ChipValue[] = [
  { value: 5, color: 'bg-red-600', borderColor: 'border-white', label: '5' },
  { value: 25, color: 'bg-green-600', borderColor: 'border-white', label: '25' },
  { value: 100, color: 'bg-black', borderColor: 'border-red-500', label: '100' },
  { value: 500, color: 'bg-purple-700', borderColor: 'border-yellow-400', label: '500' },
];

const INITIAL_BALANCE = 1000;

const App: React.FC = () => {
  const [deck, setDeck] = useState<Card[]>([]);
  
  // Game State
  const [playerHands, setPlayerHands] = useState<Card[][]>([]); 
  const [handMetadata, setHandMetadata] = useState<HandMetadata[]>([]);
  const [activeHandIndex, setActiveHandIndex] = useState<number>(0);
  const [handResults, setHandResults] = useState<GameResult[]>([]);
  
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [gameState, setGameState] = useState<GameState>(GameState.Betting);
  
  const [isGameOver, setIsGameOver] = useState(false);

  // Economy
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [currentBet, setCurrentBet] = useState(0);
  const [insuranceBet, setInsuranceBet] = useState(0);

  // Side Bets
  const [perfectPairsBet, setPerfectPairsBet] = useState(0);
  const [rummyBet, setRummyBet] = useState(0); // 21+3
  const [sideBetResults, setSideBetResults] = useState<{pp?: string, rummy?: string}>({});

  // UX / AI
  const [dealerMessage, setDealerMessage] = useState("Welcome to the high limit room.");
  const [showComments, setShowComments] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [dealerImageUrl, setDealerImageUrl] = useState<string | null>(null);
  
  const lastCommentRequestTime = useRef<number>(0);

  useEffect(() => {
    setDeck(createDeck(6));
    const loadAvatar = async () => {
        const cached = localStorage.getItem('vic_avatar_v1');
        if (cached) {
            setDealerImageUrl(cached);
        } else {
            try {
                const imageUrl = await generateDealerAvatar();
                if (imageUrl) {
                    setDealerImageUrl(imageUrl);
                    localStorage.setItem('vic_avatar_v1', imageUrl);
                }
            } catch (e) {
                console.warn("Failed to generate dealer avatar initially", e);
            }
        }
    };
    loadAvatar();
  }, []);

  const addToBet = (amount: number, type: 'main' | 'pp' | 'rummy') => {
    initAudio();
    if (balance >= amount) {
      playChipSound(amount);
      setBalance(prev => prev - amount);
      if (type === 'main') setCurrentBet(prev => prev + amount);
      if (type === 'pp') setPerfectPairsBet(prev => prev + amount);
      if (type === 'rummy') setRummyBet(prev => prev + amount);
    }
  };

  const clearBet = () => {
    if (currentBet > 0 || perfectPairsBet > 0 || rummyBet > 0) playChipSound(100); 
    
    setBalance(prev => prev + currentBet + perfectPairsBet + rummyBet);
    setCurrentBet(0);
    setPerfectPairsBet(0);
    setRummyBet(0);
  };

  const triggerDealerComment = async (
    state: GameState, 
    results: GameResult[], 
    pHands: Card[][], 
    dHand: Card[],
    action?: 'double' | 'surrender' | 'insurance'
  ) => {
    const requestTime = Date.now();
    lastCommentRequestTime.current = requestTime;
    
    setIsThinking(true);
    
    const comment = await getDealerComment(state, results, pHands, dHand, currentBet, balance, action);
    
    if (lastCommentRequestTime.current === requestTime && comment) {
        setDealerMessage(comment);
        setIsThinking(false);
        if (showComments) playMessageSound();
    } else if (lastCommentRequestTime.current === requestTime) {
        setIsThinking(false);
    }
  };

  const dealGame = async () => {
    if (currentBet === 0) return;
    initAudio();

    setIsGameOver(false);
    setHandResults([GameResult.None]);
    setSideBetResults({});
    setActiveHandIndex(0);
    setInsuranceBet(0);
    setGameState(GameState.Dealing); // Lock controls
    
    // Prepare deck
    let currentDeck = [...deck];
    if (currentDeck.length < 52) {
      setDealerMessage("Shuffling the shoe... one moment.");
      await new Promise(r => setTimeout(r, 1500));
      currentDeck = createDeck(6);
      setDeck(currentDeck);
    }

    // Initialize Hands
    setPlayerHands([[]]);
    setDealerHand([]);
    setHandMetadata([{ bet: currentBet, isDoubled: false, isSurrendered: false }]);

    // SEQUENTIAL DEALING ANIMATION
    const pHandCards: Card[] = [];
    const dHandCards: Card[] = [];

    // Card 1 to Player
    playCardSound();
    const p1 = currentDeck.pop()!;
    pHandCards.push(p1);
    setPlayerHands([[...pHandCards]]);
    setDeck(currentDeck);
    await new Promise(r => setTimeout(r, 600));

    // Card 1 to Dealer
    playCardSound();
    const d1 = currentDeck.pop()!;
    dHandCards.push(d1);
    setDealerHand([...dHandCards]);
    setDeck(currentDeck);
    await new Promise(r => setTimeout(r, 600));

    // Card 2 to Player
    playCardSound();
    const p2 = currentDeck.pop()!;
    pHandCards.push(p2);
    setPlayerHands([[...pHandCards]]);
    setDeck(currentDeck);
    await new Promise(r => setTimeout(r, 600));

    // Card 2 to Dealer (Hidden)
    playCardSound();
    const d2 = { ...currentDeck.pop()!, isHidden: true };
    dHandCards.push(d2);
    setDealerHand([...dHandCards]);
    setDeck(currentDeck);
    await new Promise(r => setTimeout(r, 600));

    // Dealing Complete - Check Logic
    const pHand = [p1, p2];
    const dHand = [d1, d2];
    
    let sideBetWinnings = 0;
    const newSideBetResults: {pp?: string, rummy?: string} = {};

    if (perfectPairsBet > 0) {
        const ppResult = evaluatePerfectPairs(p1, p2);
        if (ppResult) {
            const win = perfectPairsBet * ppResult.multiplier + perfectPairsBet;
            sideBetWinnings += win;
            newSideBetResults.pp = `${ppResult.label} +$${win}`;
        }
    }

    if (rummyBet > 0) {
        const rummyResult = evaluate21Plus3(pHand, d1);
        if (rummyResult) {
            const win = rummyBet * rummyResult.multiplier + rummyBet;
            sideBetWinnings += win;
            newSideBetResults.rummy = `${rummyResult.label} +$${win}`;
        }
    }

    if (sideBetWinnings > 0) {
        setBalance(prev => prev + sideBetWinnings);
        playWinSound();
        setSideBetResults(newSideBetResults);
    }

    const upCardValue = d1.value;
    const isAce = d1.rank === 'A';

    if (isAce) {
        setGameState(GameState.Insurance);
        setDealerMessage(sideBetWinnings > 0 ? "Nice side wins! Insurance now?" : "Insurance?");
        triggerDealerComment(GameState.Insurance, [], [pHand], dHand, 'insurance');
    } else if (upCardValue === 10) {
        checkForDealerBlackjack(dHand, currentDeck, [pHand], [{ bet: currentBet, isDoubled: false, isSurrendered: false }]);
    } else {
        setGameState(GameState.Playing);
        
        const pScore = calculateScore(pHand);
        if (pScore === 21) {
             handleGameOver([pHand], dHand, [GameResult.Blackjack], [{ bet: currentBet, isDoubled: false, isSurrendered: false }]);
        } else {
             if (sideBetWinnings > 0) setDealerMessage("Side bets paid. Good luck.");
             else setDealerMessage("Good luck.");
             triggerDealerComment(GameState.Playing, [GameResult.None], [pHand], dHand);
        }
    }
  };

  const handleInsurance = (takeInsurance: boolean) => {
     if (takeInsurance) {
        const cost = currentBet / 2;
        if (balance >= cost) {
            setBalance(prev => prev - cost);
            setInsuranceBet(cost);
            playChipSound(cost);
            setDealerMessage("Insurance placed.");
        } else {
            setDealerMessage("Insufficient funds for insurance.");
            return;
        }
     } else {
         setDealerMessage("No insurance. Very well.");
     }
     checkForDealerBlackjack(dealerHand, deck, playerHands, handMetadata);
  };

  const checkForDealerBlackjack = (
      currentDealerHand: Card[], 
      currentDeck: Card[], 
      currentPHands: Card[][], 
      currentMeta: HandMetadata[]
  ) => {
      const holeCard = currentDealerHand[1];
      const upCard = currentDealerHand[0];
      const dealerTotal = (upCard.rank === 'A' ? 11 : upCard.value) + (holeCard.rank === 'A' ? 11 : holeCard.value);
      const isDealerBJ = dealerTotal === 21; 

      if (isDealerBJ) {
          const revealed = [...currentDealerHand];
          revealed[1].isHidden = false;
          setDealerHand(revealed);

          const results = currentPHands.map(hand => {
              const pScore = calculateScore(hand);
              if (pScore === 21 && hand.length === 2) return GameResult.Push;
              return GameResult.DealerWin;
          });
          
          handleGameOver(currentPHands, revealed, results, currentMeta);
      } else {
          const pScore = calculateScore(currentPHands[0]);
          if (pScore === 21 && currentPHands[0].length === 2) {
             handleGameOver(currentPHands, currentDealerHand, [GameResult.Blackjack], currentMeta);
          } else {
             setGameState(GameState.Playing);
             if (insuranceBet === 0) {
                triggerDealerComment(GameState.Playing, [GameResult.None], currentPHands, currentDealerHand);
             }
          }
      }
  };

  const hit = () => {
    playCardSound();
    const newDeck = [...deck];
    const card = newDeck.pop()!;
    
    const newHands = [...playerHands];
    newHands[activeHandIndex] = [...newHands[activeHandIndex], card];
    
    setPlayerHands(newHands);
    setDeck(newDeck);

    const score = calculateScore(newHands[activeHandIndex]);
    if (score > 21) {
      const newResults = [...handResults];
      newResults[activeHandIndex] = GameResult.Bust;
      setHandResults(newResults);
      playLoseSound();
      stand(newHands, newResults);
    }
  };

  const doubleDown = () => {
      const currentMeta = handMetadata[activeHandIndex];
      const cost = currentMeta.bet;
      
      if (balance < cost) {
          setDealerMessage("Insufficient funds to double.");
          return;
      }
      
      playChipSound(cost);
      playCardSound();
      setBalance(prev => prev - cost);
      
      const newMetadata = [...handMetadata];
      newMetadata[activeHandIndex] = { ...currentMeta, bet: currentMeta.bet * 2, isDoubled: true };
      setHandMetadata(newMetadata);

      const newDeck = [...deck];
      const card = newDeck.pop()!;
      
      const newHands = [...playerHands];
      newHands[activeHandIndex] = [...newHands[activeHandIndex], card];
      
      setPlayerHands(newHands);
      setDeck(newDeck);
      
      triggerDealerComment(GameState.Playing, handResults, newHands, dealerHand, 'double');

      const score = calculateScore(newHands[activeHandIndex]);
      if (score > 21) {
          const newResults = [...handResults];
          newResults[activeHandIndex] = GameResult.Bust;
          setHandResults(newResults);
          playLoseSound();
          stand(newHands, newResults, newMetadata);
      } else {
          stand(newHands, handResults, newMetadata);
      }
  };

  const surrender = () => {
      const currentMeta = handMetadata[activeHandIndex];
      const returnAmount = currentMeta.bet / 2;
      setBalance(prev => prev + returnAmount);
      
      const newMetadata = [...handMetadata];
      newMetadata[activeHandIndex] = { ...currentMeta, isSurrendered: true };
      setHandMetadata(newMetadata);
      
      const newResults = [...handResults];
      newResults[activeHandIndex] = GameResult.Surrender;
      setHandResults(newResults);

      triggerDealerComment(GameState.Playing, newResults, playerHands, dealerHand, 'surrender');
      stand(playerHands, newResults, newMetadata);
  };

  const split = () => {
    if (playerHands.length !== 1) return;
    const handToSplit = playerHands[0];
    const currentMeta = handMetadata[0];
    
    if (balance < currentMeta.bet) {
        setDealerMessage("Insufficient funds to split.");
        return;
    }

    playChipSound(currentMeta.bet);
    playCardSound();

    setBalance(prev => prev - currentMeta.bet);

    const newDeck = [...deck];
    const splitCard1 = handToSplit[0];
    const splitCard2 = handToSplit[1];

    const hand1 = [splitCard1, newDeck.pop()!];
    const hand2 = [splitCard2, newDeck.pop()!]; 

    const newHands = [hand1, hand2];
    const newMetadata = [
        { ...currentMeta },
        { ...currentMeta } 
    ];
    
    setPlayerHands(newHands);
    setHandMetadata(newMetadata);
    setDeck(newDeck);
    setHandResults([GameResult.None, GameResult.None]);
    setActiveHandIndex(0); 
    
    setDealerMessage("Splitting. Two hands in play.");
    playMessageSound();
  };

  const stand = async (
      currentHandsState = playerHands, 
      currentResultsState = handResults,
      currentMetaState = handMetadata
  ) => {
    if (activeHandIndex < currentHandsState.length - 1) {
        const nextIndex = activeHandIndex + 1;
        setActiveHandIndex(nextIndex);
        setDealerMessage("Next hand.");
        return;
    }

    setGameState(GameState.DealerTurn);
    
    // DELAY 1: Dramatic pause before dealer even touches the card
    await new Promise(r => setTimeout(r, 800));

    // REVEAL HOLE CARD (Trigger the flip animation)
    let currentDealerHand = [...dealerHand];
    currentDealerHand[1].isHidden = false;
    setDealerHand([...currentDealerHand]);
    playCardSound(); // Sound effect for the flip start
    
    // DELAY 2: Dramatic pause while the flip animation (1200ms) completes and settles
    // Giving the player time to realize if they are screwed
    await new Promise(r => setTimeout(r, 1600));
    
    const allDone = currentResultsState.every(r => r === GameResult.Bust || r === GameResult.Surrender || r === GameResult.Blackjack);
    
    if (allDone) {
        handleGameOver(currentHandsState, currentDealerHand, currentResultsState, currentMetaState);
        return;
    }

    triggerDealerComment(GameState.DealerTurn, currentResultsState, currentHandsState, currentDealerHand);

    const playDealer = async () => {
      let dScore = calculateScore(currentDealerHand);
      let deckCopy = [...deck];

      // Another small delay before dealer hits if they need to
      if (dScore < 17) await new Promise(resolve => setTimeout(resolve, 800));

      while (dScore < 17) {
        playCardSound();
        const card = deckCopy.pop()!;
        currentDealerHand = [...currentDealerHand, card];
        setDealerHand([...currentDealerHand]);
        setDeck(deckCopy);
        dScore = calculateScore(currentDealerHand);
        // Realistic slow pace between dealer hits
        await new Promise(resolve => setTimeout(resolve, 1400));
      }

      const finalResults = currentHandsState.map((hand, idx) => {
          const res = currentResultsState[idx];
          if (res === GameResult.Bust || res === GameResult.Surrender || res === GameResult.Blackjack) return res;
          
          const pScore = calculateScore(hand);
          
          if (dScore > 21) return GameResult.PlayerWin;
          if (pScore > dScore) return GameResult.PlayerWin;
          if (dScore > pScore) return GameResult.DealerWin;
          return GameResult.Push;
      });

      handleGameOver(currentHandsState, currentDealerHand, finalResults, currentMetaState);
    };

    playDealer();
  };

  const handleGameOver = async (pHands: Card[][], dHand: Card[], results: GameResult[], metadata: HandMetadata[]) => {
    setGameState(GameState.GameOver);
    setIsGameOver(true);
    setHandResults(results);
    
    if (dHand.length > 1 && dHand[1].isHidden) {
        const revealedHand = [...dHand];
        revealedHand[1].isHidden = false;
        setDealerHand(revealedHand);
    }

    let totalPayout = 0;
    let anyWin = false;
    let anyBlackjack = false;

    results.forEach((res, index) => {
        const bet = metadata[index].bet;
        
        if (res === GameResult.PlayerWin) {
            totalPayout += (bet * 2);
            anyWin = true;
        }
        else if (res === GameResult.Blackjack) {
            totalPayout += (bet * 2.5);
            anyBlackjack = true;
        }
        else if (res === GameResult.Push) {
            totalPayout += bet;
        }
    });
    
    if (insuranceBet > 0) {
        const dScore = calculateScore(dHand);
        const dealerHasNatural = dScore === 21 && dHand.length === 2;
        if (dealerHasNatural) {
            totalPayout += (insuranceBet * 3);
        }
    }
    
    setBalance(prev => prev + totalPayout);

    if (anyBlackjack) playBlackjackSound();
    else if (anyWin) playWinSound();
    else if (results.every(r => r === GameResult.DealerWin || r === GameResult.Bust || r === GameResult.Surrender)) playLoseSound();

    triggerDealerComment(GameState.GameOver, results, pHands, dHand);
  };

  const resetGame = () => {
    playChipSound(100);
    setPlayerHands([]);
    setHandMetadata([]);
    setDealerHand([]);
    setCurrentBet(0);
    setPerfectPairsBet(0);
    setRummyBet(0);
    setInsuranceBet(0);
    setSideBetResults({});
    setGameState(GameState.Betting);
    setIsGameOver(false);
    setDealerMessage("Place your bets.");
  };

  const dealerScore = gameState === GameState.DealerTurn || gameState === GameState.GameOver 
    ? calculateScore(dealerHand) 
    : dealerHand.length > 0 ? calculateScore([dealerHand[0]]) : 0;

  const activeHand = playerHands[activeHandIndex];
  const activeMeta = handMetadata[activeHandIndex];
  
  const canSplit = gameState === GameState.Playing && 
                   playerHands.length === 1 && 
                   playerHands[0].length === 2 && 
                   playerHands[0][0].rank === playerHands[0][1].rank &&
                   balance >= activeMeta?.bet;

  const canDouble = gameState === GameState.Playing &&
                    activeHand?.length === 2 &&
                    balance >= activeMeta?.bet &&
                    !activeMeta.isDoubled;

  const canSurrender = gameState === GameState.Playing &&
                       activeHand?.length === 2 &&
                       playerHands.length === 1;

  const dominantResult = handResults.includes(GameResult.Blackjack) ? GameResult.Blackjack
    : handResults.includes(GameResult.PlayerWin) ? GameResult.PlayerWin
    : handResults.includes(GameResult.DealerWin) ? GameResult.DealerWin
    : handResults.includes(GameResult.Bust) ? GameResult.Bust
    : GameResult.None;

  // Drag/Drop simulators
  const [selectedChip, setSelectedChip] = useState<number>(CHIPS[1].value);

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-white selection:bg-gold-500 selection:text-black overflow-hidden flex flex-col font-inter relative">
      
      {/* 1. Global Ambient Background */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_#292524_0%,_#1c1917_40%,_#0c0a09_100%)] pointer-events-none"></div>
      
      {/* Noise Texture Overlay for entire app */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }}>
      </div>

      <ChatWidget />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-50 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 ml-12 lg:ml-0 shadow-xl">
          <div className="w-6 h-6 bg-gold-500 rounded flex items-center justify-center text-black font-bold text-xs shadow-inner">K</div>
          <h1 className="font-playfair text-lg tracking-wider text-gold-400 hidden sm:block drop-shadow-md">khel.fun</h1>
        </div>
        <div className="flex items-center gap-6 pointer-events-auto">
            <div className="flex items-center gap-2 bg-black/80 px-4 py-2 rounded-full border border-gold-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                <Coins className="text-gold-400 w-5 h-5" />
                <span className="font-mono text-xl text-white tracking-widest text-shadow">${balance}</span>
            </div>
        </div>
      </header>

      {/* Main Table Container - PERSPECTIVE FIX HERE */}
      <main className="flex-1 relative flex flex-col items-center w-full mx-auto overflow-hidden perspective-[1200px]">
        
        {/* 2. REALISTIC TABLE SURFACE */}
        {/* We use a large rounded element pushed down to simulate the semi-circular table */}
        <div className="absolute top-[18vh] w-[140vw] h-[100vw] rounded-[50%] left-1/2 -translate-x-1/2 z-0 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
            
            {/* A. Padded Leather Rail (The dark brown rim) */}
            <div className="absolute inset-0 rounded-[50%] bg-[#2a1d15] border-t border-white/5 shadow-[inset_0_10px_20px_rgba(0,0,0,0.8)] overflow-hidden">
                {/* Leather texture grain */}
                 <div className="absolute inset-0 opacity-20" 
                      style={{ 
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
                        filter: 'contrast(1.5)' 
                      }}>
                </div>
                {/* Specular highlight on the rail curve */}
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white/10 to-transparent rounded-t-[50%] blur-md"></div>
            </div>

            {/* B. Green Felt Surface (Inner Area) */}
            <div className="absolute top-[30px] left-[30px] right-[30px] bottom-[30px] rounded-[50%] bg-[#064e3b] shadow-[inset_0_5px_15px_rgba(0,0,0,0.5)] overflow-hidden border border-black/20">
                 
                 {/* 1. Felt Texture (Noise) */}
                 <div className="absolute inset-0 opacity-30 mix-blend-overlay"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }}>
                 </div>
                 
                 {/* 2. Table Lighting (Spotlight Vignette) */}
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(255,255,255,0.1)_0%,_rgba(0,0,0,0)_40%,_rgba(0,0,0,0.6)_100%)] pointer-events-none"></div>

                 {/* 3. Printed Markings on Table (Text) */}
                 <div className="absolute top-28 left-1/2 -translate-x-1/2 text-center opacity-40 transform" style={{ mixBlendMode: 'overlay' }}>
                    <h2 className="text-6xl font-playfair text-[#a7f3d0] font-black tracking-[0.2em] blur-[0.5px]">BLACKJACK</h2>
                    <div className="text-sm font-mono tracking-[0.5em] text-[#a7f3d0] mt-3 font-bold uppercase">
                        Dealer stands on 17 • Pays 3 to 2
                    </div>
                 </div>

                 {/* 4. Decorative Arch Line */}
                 <div className="absolute top-52 left-1/2 -translate-x-1/2 w-[70%] h-[400px] border-t-2 border-[#a7f3d0] rounded-[50%] opacity-20 blur-[1px]"></div>
            </div>
        </div>

        {/* Dealer Zone (Avatars & Cards) */}
        <div className="relative z-10 w-full flex flex-col items-center mt-6 md:mt-10 preserve-3d">
            
            <div className="absolute top-10 right-4 md:right-32 z-20 pointer-events-auto drop-shadow-2xl">
                <DeckPile cardCount={deck.length} />
            </div>

            <div className="relative z-0 mb-[-30px] md:mb-[-40px] transform scale-90 md:scale-100 transition-all duration-500">
                
                {/* Commentary Bubble */}
                <div className={`
                   absolute -right-32 top-0 md:-right-48 md:top-8 w-36 md:w-56 
                   bg-white/95 backdrop-blur-xl text-stone-900 p-4 rounded-2xl rounded-tl-none shadow-[0_10px_40px_rgba(0,0,0,0.3)] 
                   border border-white/40 z-50 transform transition-all duration-300 origin-bottom-left
                   ${isThinking ? 'scale-105 animate-pulse' : 'scale-100'}
                   ${!dealerMessage || !showComments ? 'opacity-0 pointer-events-none translate-y-4 scale-90' : 'opacity-100 translate-y-0'}
                `}>
                    <div className="font-bold text-[10px] text-stone-400 mb-1 uppercase tracking-wider flex justify-between items-center">
                        <span>Vic</span>
                        {isThinking && <span className="w-1.5 h-1.5 bg-gold-500 rounded-full animate-ping"></span>}
                    </div>
                    <p className="text-sm font-medium leading-tight font-sans italic">{dealerMessage}</p>
                    <div className="absolute -left-2 bottom-0 w-4 h-4 bg-white/95 transform rotate-45 skew-x-12 border-l border-b border-white/40"></div>
                </div>
                
                <VicAvatar 
                  className="w-40 h-40 md:w-56 md:h-56 filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" 
                  isThinking={isThinking} 
                  imageUrl={dealerImageUrl}
                  dominantResult={dominantResult}
                />
            </div>

            <div className="relative z-20 flex flex-col items-center min-h-[140px] preserve-3d">
                {/* Dealer Cards Container */}
                <div className="flex items-center justify-center transform drop-shadow-xl pl-4 preserve-3d">
                    {dealerHand.length > 0 ? (
                         dealerHand.map((card, i) => (
                            <CardComponent key={`dealer-${i}`} card={card} index={i} isDealer={true} />
                         ))
                    ) : (
                        <div className="w-24 h-36 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center text-white/10 text-xs shadow-inner">
                            House
                        </div>
                    )}
                </div>
                
                <div className="mt-4 flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md shadow-lg">
                    <Shield className="w-3 h-3 text-gold-400" />
                    <span className="text-xs font-bold text-gray-200 uppercase tracking-widest text-shadow-sm">
                        {gameState === GameState.Betting ? "House" : `Dealer ${dealerScore > 0 ? dealerScore : ''}`}
                    </span>
                </div>
            </div>
        </div>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Player Zone */}
        <div className="relative z-30 w-full max-w-4xl px-4 mb-8 flex flex-col items-center">
            
            {/* Betting Spots (Printed on Felt look) */}
            {(gameState === GameState.Betting || gameState === GameState.Dealing) && (
                <div className="flex items-center justify-center gap-4 md:gap-8 mb-8 scale-90 md:scale-100 animate-slide-up">
                     
                     {/* 1. Perfect Pairs Spot */}
                     <button 
                        onClick={() => addToBet(selectedChip, 'pp')}
                        disabled={balance < selectedChip || gameState === GameState.Dealing}
                        className={`
                           relative w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-300
                           ${perfectPairsBet > 0 ? 'border-yellow-400 bg-yellow-900/30 shadow-[0_0_20px_rgba(250,204,21,0.3)]' : 'border-white/10 hover:border-yellow-400/40 bg-white/5'}
                        `}
                     >
                        <span className="text-[9px] font-black text-yellow-500/80 uppercase tracking-widest mb-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>Pairs</span>
                        <Gem className="w-4 h-4 text-yellow-500/40" />
                        {perfectPairsBet > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center z-10 drop-shadow-lg">
                                <Chip chip={{ value: perfectPairsBet, color: 'bg-yellow-600', borderColor: '', label: '' }} disabled />
                            </div>
                        )}
                     </button>

                     {/* 2. Main Bet Spot */}
                     <button 
                        onClick={() => addToBet(selectedChip, 'main')}
                        disabled={balance < selectedChip || gameState === GameState.Dealing}
                        className={`
                           relative w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-300
                           ${currentBet > 0 ? 'border-gold-500 bg-gold-900/20 shadow-[0_0_30px_rgba(234,179,8,0.2)]' : 'border-white/20 hover:border-gold-400/60 bg-white/5'}
                        `}
                     >
                        <span className="text-xs font-black text-gold-400/80 uppercase tracking-widest mb-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>Place Bet</span>
                        <div className="w-20 h-0.5 bg-white/10 rounded-full mb-1"></div>
                        {currentBet > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center z-10 drop-shadow-2xl">
                                <Chip chip={{ value: currentBet, color: 'bg-gold-600', borderColor: '', label: '' }} disabled />
                            </div>
                        )}
                     </button>

                     {/* 3. 21+3 Spot */}
                     <button 
                        onClick={() => addToBet(selectedChip, 'rummy')}
                        disabled={balance < selectedChip || gameState === GameState.Dealing}
                        className={`
                           relative w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-300
                           ${rummyBet > 0 ? 'border-emerald-400 bg-emerald-900/30 shadow-[0_0_20px_rgba(52,211,153,0.3)]' : 'border-white/10 hover:border-emerald-400/40 bg-white/5'}
                        `}
                     >
                        <span className="text-[9px] font-black text-emerald-500/80 uppercase tracking-widest mb-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>21+3</span>
                        <Spade className="w-4 h-4 text-emerald-500/40" />
                         {rummyBet > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center z-10 drop-shadow-lg">
                                <Chip chip={{ value: rummyBet, color: 'bg-emerald-600', borderColor: '', label: '' }} disabled />
                            </div>
                        )}
                     </button>
                </div>
            )}

            <div className="flex items-end justify-center gap-8 min-h-[180px] preserve-3d">
                 {playerHands.length === 0 && gameState !== GameState.Betting && gameState !== GameState.Dealing && (
                    <div className="w-24 h-36 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center text-white/10 text-xs">
                        Empty
                    </div>
                )}

                {playerHands.map((hand, handIndex) => {
                    const isCurrent = handIndex === activeHandIndex && gameState === GameState.Playing;
                    const result = handResults[handIndex];
                    const meta = handMetadata[handIndex];
                    const score = calculateScore(hand);
                    
                    return (
                        <div 
                            key={`hand-${handIndex}`} 
                            className={`
                                relative flex flex-col items-center transition-all duration-500 preserve-3d
                                ${isCurrent ? 'scale-110 z-40 translate-y-[-10px]' : 'scale-95 opacity-80 z-30'}
                                ${result !== GameResult.None && !isGameOver ? 'opacity-60 blur-[1px]' : ''}
                            `}
                        >
                            {/* Indicators */}
                            {meta?.isDoubled && (
                                <div className="absolute -top-16 right-0 z-50 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full border border-white shadow-lg animate-bounce-in">
                                    DOUBLED
                                </div>
                            )}
                            
                            {/* Score Bubble */}
                            {gameState !== GameState.Betting && gameState !== GameState.Dealing && (
                                <div className={`
                                    absolute -top-14 z-50 px-3 py-1 rounded-full font-mono text-lg font-bold border shadow-xl
                                    ${isCurrent ? 'bg-gold-500 text-black border-white' : 'bg-black/80 text-white border-white/20'}
                                `}>
                                    {score}
                                </div>
                            )}

                            {/* Side Bet Wins */}
                            {handIndex === 0 && (sideBetResults.pp || sideBetResults.rummy) && (
                                <div className="absolute -left-32 top-0 flex flex-col gap-2 z-50 animate-bounce-in">
                                    {sideBetResults.pp && (
                                        <div className="bg-yellow-600 text-white text-xs font-bold px-3 py-1 rounded shadow-lg border border-yellow-300 whitespace-nowrap">
                                            {sideBetResults.pp}
                                        </div>
                                    )}
                                    {sideBetResults.rummy && (
                                        <div className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded shadow-lg border border-emerald-300 whitespace-nowrap">
                                            {sideBetResults.rummy}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center justify-center drop-shadow-2xl pl-4 preserve-3d">
                                {hand.map((card, cardIndex) => (
                                    <CardComponent key={`p-${handIndex}-${cardIndex}`} card={card} index={cardIndex} />
                                ))}
                            </div>
                            
                            {/* Result Text Overlay */}
                            {(result !== GameResult.None || (isGameOver && result !== GameResult.None)) && (
                                 <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 whitespace-nowrap pointer-events-none">
                                    <div className={`
                                        px-6 py-3 rounded-xl border-4 shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-md font-black text-2xl tracking-widest transform -rotate-6
                                        ${result === GameResult.PlayerWin || result === GameResult.Blackjack ? 'bg-green-600/90 border-green-400 text-white' : ''}
                                        ${result === GameResult.DealerWin || result === GameResult.Bust ? 'bg-red-600/90 border-red-400 text-white' : ''}
                                        ${result === GameResult.Push ? 'bg-gray-600/90 border-gray-400 text-white' : ''}
                                        ${result === GameResult.Surrender ? 'bg-purple-600/90 border-purple-400 text-white' : ''}
                                    `}>
                                        {result === GameResult.PlayerWin && "WINNER"}
                                        {result === GameResult.DealerWin && "DEALER WINS"}
                                        {result === GameResult.Blackjack && "BLACKJACK!"}
                                        {result === GameResult.Bust && "BUST"}
                                        {result === GameResult.Push && "PUSH"}
                                        {result === GameResult.Surrender && "SURRENDER"}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {/* Player Stats Bar */}
            {gameState !== GameState.Betting && gameState !== GameState.Dealing && (
                <div className="mt-4 flex items-center gap-4 text-white/70 text-sm font-mono bg-black/40 px-6 py-2 rounded-full border border-white/5 backdrop-blur-sm shadow-lg">
                    <div className="flex gap-2">
                        <span>BET:</span>
                        <span className="text-white font-bold">${handMetadata.reduce((acc, m) => acc + m.bet, 0)}</span>
                    </div>
                    {insuranceBet > 0 && (
                        <div className="flex gap-2 border-l border-white/20 pl-4">
                            <span className="text-yellow-500">INS:</span>
                            <span className="text-white">${insuranceBet}</span>
                        </div>
                    )}
                </div>
            )}

        </div>

      </main>

      {/* Control Panel / Footer */}
      <footer className="relative z-50 pb-6 px-4 pt-4 bg-gradient-to-t from-black via-stone-950/95 to-transparent">
        <div className="max-w-4xl mx-auto">
            
            {/* Insurance Prompt */}
            {gameState === GameState.Insurance && (
                <div className="absolute -top-32 left-1/2 transform -translate-x-1/2 flex flex-col items-center bg-stone-900/95 backdrop-blur-xl p-6 rounded-2xl border border-gold-500/50 shadow-2xl animate-bounce-in w-80">
                    <div className="flex items-center gap-2 text-gold-400 mb-2 font-bold uppercase tracking-widest text-sm">
                        <ShieldAlert className="w-5 h-5" />
                        Insurance?
                    </div>
                    <div className="text-xs text-center text-gray-400 mb-4 font-medium">
                        Cost: ${currentBet / 2} • Pays 2:1
                    </div>
                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={() => handleInsurance(true)}
                            className="flex-1 py-3 bg-gold-600 hover:bg-gold-500 text-black font-bold rounded-lg transition-colors"
                        >
                            YES
                        </button>
                        <button 
                            onClick={() => handleInsurance(false)}
                            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
                        >
                            NO
                        </button>
                    </div>
                </div>
            )}

            {/* Chip Selector (Betting Phase) */}
            {(gameState === GameState.Betting || gameState === GameState.Dealing) && (
                <div className="flex flex-col gap-4 items-center animate-slide-up">
                    <div className="flex gap-4 md:gap-8 overflow-x-auto py-2 px-4 w-full justify-center">
                        {CHIPS.map((chip) => (
                            <Chip 
                                key={chip.value} 
                                chip={chip} 
                                onClick={() => setSelectedChip(chip.value)}
                                disabled={balance < chip.value || gameState === GameState.Dealing}
                                count={selectedChip === chip.value ? 1 : 0} 
                            />
                        ))}
                    </div>
                    
                    {/* Action Bar */}
                    <div className="flex items-center gap-4 w-full max-w-md bg-stone-900/50 p-2 rounded-2xl border border-white/5 backdrop-blur-md">
                         <div className="flex-1 flex flex-col items-end pr-4 border-r border-white/10">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Total Bet</span>
                            <span className="text-2xl font-mono font-bold text-gold-500">${currentBet + perfectPairsBet + rummyBet}</span>
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                            <button 
                                onClick={dealGame}
                                disabled={currentBet === 0 || gameState === GameState.Dealing}
                                className="flex-1 py-3 bg-gold-600 hover:bg-gold-500 disabled:bg-stone-800 disabled:text-stone-600 text-black font-black text-lg rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.2)] transform transition hover:scale-105 active:scale-95 tracking-wide"
                            >
                                {gameState === GameState.Dealing ? "DEALING..." : "DEAL"}
                            </button>
                             {(currentBet > 0 || perfectPairsBet > 0 || rummyBet > 0) && gameState !== GameState.Dealing && (
                                <button onClick={clearBet} className="p-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-white/80 transition shadow-lg border border-white/5">
                                    <RefreshCw className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Playing Controls */}
            {gameState === GameState.Playing && (
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                    <button 
                        onClick={hit}
                        className="py-4 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl rounded-xl shadow-[0_5px_15px_rgba(16,185,129,0.3)] transform transition hover:-translate-y-1 active:translate-y-0 active:scale-95 border-b-4 border-emerald-800 active:border-b-0"
                    >
                        HIT
                    </button>
                    <button 
                        onClick={() => stand()}
                        className="py-4 px-4 bg-red-600 hover:bg-red-500 text-white font-black text-xl rounded-xl shadow-[0_5px_15px_rgba(220,38,38,0.3)] transform transition hover:-translate-y-1 active:translate-y-0 active:scale-95 border-b-4 border-red-800 active:border-b-0"
                    >
                        STAND
                    </button>
                    
                    <div className="col-span-2 grid grid-cols-3 gap-2">
                        <button 
                            onClick={doubleDown}
                            disabled={!canDouble}
                            className="flex flex-col items-center justify-center p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold rounded-xl shadow-lg transition border-b-4 border-blue-800 active:border-b-0 disabled:border-none"
                        >
                            <ArrowDownCircle className="w-5 h-5 mb-1" />
                            <span className="text-xs md:text-sm">DOUBLE</span>
                        </button>
                        
                        <button 
                            onClick={split}
                            disabled={!canSplit}
                            className="flex flex-col items-center justify-center p-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold rounded-xl shadow-lg transition border-b-4 border-purple-800 active:border-b-0 disabled:border-none"
                        >
                            <Split className="w-5 h-5 mb-1" />
                            <span className="text-xs md:text-sm">SPLIT</span>
                        </button>

                        <button 
                            onClick={surrender}
                            disabled={!canSurrender}
                            className="flex flex-col items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold rounded-xl shadow-lg transition border-b-4 border-gray-900 active:border-b-0 disabled:border-none"
                        >
                            <Flag className="w-5 h-5 mb-1" />
                            <span className="text-xs md:text-sm">FOLD</span>
                        </button>
                    </div>
                 </div>
            )}

             {/* Game Over Controls */}
             {gameState === GameState.GameOver && (
                 <div className="flex justify-center w-full animate-bounce-in">
                    <button 
                        onClick={resetGame}
                        className="flex items-center gap-3 px-10 py-4 bg-gold-600 hover:bg-gold-500 text-black font-black text-xl rounded-full shadow-[0_0_30px_rgba(234,179,8,0.4)] transform transition hover:scale-105 active:scale-95 tracking-wide"
                    >
                        <RefreshCw className="w-6 h-6" />
                        PLAY AGAIN
                    </button>
                 </div>
            )}
        </div>
      </footer>
    </div>
  );
};

export default App;