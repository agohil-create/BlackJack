import React, { useState, useEffect, useRef } from 'react';
import { Card, GameState, GameResult, ChipValue, HandMetadata, Suit } from './types';
import { createDeck, calculateScore, evaluatePerfectPairs, evaluate21Plus3 } from './utils/blackjackUtils';
import { CardComponent } from './components/CardComponent';
import { Chip } from './components/Chip';
import { VicAvatar } from './components/VicAvatar';
import { DeckPile } from './components/DeckPile';
import { ChatWidget } from './components/ChatWidget';
import { BrandLogo } from './components/BrandLogo';
import { getDealerComment, generateDealerAvatar } from './services/geminiService';
import { Coins, RefreshCw, Shield, Split, ShieldAlert, ArrowDownCircle, Flag, Gem, Spade } from 'lucide-react';
import { 
  initAudio, 
  playCardSound, 
  playChipSound, 
  playWinSound, 
  playLoseSound, 
  playBlackjackSound,
  playMessageSound 
} from './utils/audioManager';

// Procedural Textures (SVG Data URIs) - REFINED FOR REALISM
const LEATHER_TEXTURE = `data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='5' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E`;

// Complex Woven Fabric Filter: Turbulence -> Bump Map Lighting
const FELT_TEXTURE = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='feltFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='4' result='noise'/%3E%3CfeDiffuseLighting in='noise' lighting-color='%23ffffff' surfaceScale='1.5'%3E%3CfeDistantLight azimuth='45' elevation='60'/%3E%3C/feDiffuseLighting%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23feltFilter)' opacity='0.5'/%3E%3C/svg%3E`;

const CHIPS: ChipValue[] = [
  { value: 5, color: 'bg-khel-red', borderColor: 'border-white', label: '5' },
  { value: 25, color: 'bg-khel-orange', borderColor: 'border-white', label: '25' },
  { value: 100, color: 'bg-black', borderColor: 'border-khel-cyan', label: '100' },
  { value: 500, color: 'bg-purple-700', borderColor: 'border-khel-yellow', label: '500' },
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
  const [dealerMessage, setDealerMessage] = useState("Let's play.");
  const [showComments, setShowComments] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [dealerImageUrl, setDealerImageUrl] = useState<string | null>(null);
  
  const lastCommentRequestTime = useRef<number>(0);
  const [selectedChip, setSelectedChip] = useState<number>(CHIPS[1].value);

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
      setDealerMessage("Shuffling...");
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
        setDealerMessage(sideBetWinnings > 0 ? "Nice side wins! Insurance?" : "Insurance?");
        triggerDealerComment(GameState.Insurance, [], [pHand], dHand, 'insurance');
    } else if (upCardValue === 10) {
        checkForDealerBlackjack(dHand, currentDeck, [pHand], [{ bet: currentBet, isDoubled: false, isSurrendered: false }]);
    } else {
        setGameState(GameState.Playing);
        
        const pScore = calculateScore(pHand);
        if (pScore === 21) {
             handleGameOver([pHand], dHand, [GameResult.Blackjack], [{ bet: currentBet, isDoubled: false, isSurrendered: false }]);
        } else {
             if (sideBetWinnings > 0) setDealerMessage("Side bets paid.");
             else setDealerMessage("Your move.");
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
            setDealerMessage("Insufficient funds.");
            return;
        }
     } else {
         setDealerMessage("No insurance.");
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
          setDealerMessage("Insufficient funds.");
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
        setDealerMessage("Insufficient funds.");
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
    
    setDealerMessage("Splitting. Double trouble.");
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
    
    // DELAY 1
    await new Promise(r => setTimeout(r, 800));

    // REVEAL HOLE CARD 
    let currentDealerHand = [...dealerHand];
    currentDealerHand[1].isHidden = false;
    setDealerHand([...currentDealerHand]);
    playCardSound(); 
    
    // DELAY 2
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

      if (dScore < 17) await new Promise(resolve => setTimeout(resolve, 800));

      while (dScore < 17) {
        playCardSound();
        const card = deckCopy.pop()!;
        currentDealerHand = [...currentDealerHand, card];
        setDealerHand([...currentDealerHand]);
        setDeck(deckCopy);
        dScore = calculateScore(currentDealerHand);
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

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white selection:bg-khel-cyan selection:text-black overflow-hidden flex flex-col font-sans relative">
      
      <ChatWidget />

      {/* --- BACKGROUND: CASINO AMBIENCE --- */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[#0a0514] overflow-hidden">
          {/* Bokeh Lights */}
          <div className="absolute top-0 left-[20%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[100px] animate-pulse-fast" style={{animationDuration: '8s'}}></div>
          <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-blue-900/10 rounded-full blur-[80px] animate-pulse-fast" style={{animationDuration: '10s'}}></div>
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black via-[#0a0a0a] to-transparent"></div>
      </div>

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-[60] pointer-events-none">
        {/* Official Brand Logo - Top Left */}
        <div className="flex items-center pointer-events-auto ml-16 lg:ml-4 group hover:scale-105 transition-transform duration-300">
           <BrandLogo className="w-56 h-auto drop-shadow-lg" />
        </div>
        
        <div className="flex items-center gap-6 pointer-events-auto mt-2">
            <div className="flex items-center gap-2 bg-[#1a1a1a] px-4 py-2 rounded-lg border border-white/10 shadow-lg">
                <Coins className="text-khel-yellow w-5 h-5" />
                <span className="font-anton text-2xl text-white tracking-wider">${balance}</span>
            </div>
        </div>
      </header>

      {/* Main Game Container */}
      <main className="flex-1 relative flex flex-col items-center justify-center w-full mx-auto perspective-1000 z-10">
        
        {/* --- THE TABLE (3D Perspective) --- */}
        {/* Moved closer to bottom and widened to fix perspective from "Oval" to "Player View Arc" */}
        <div className="absolute top-[32vh] w-[180vw] h-[180vw] rounded-[50%] left-1/2 -translate-x-1/2 z-0 transform shadow-[0_-50px_100px_rgba(0,0,0,0.5)]">
            
            {/* 1. Rail Construction (Outer) */}
            <div className="absolute inset-0 rounded-[50%] bg-[#222] shadow-2xl overflow-hidden">
                
                {/* Leather Texture */}
                <div className="absolute inset-0 opacity-80 mix-blend-overlay" style={{ backgroundImage: `url("${LEATHER_TEXTURE}")` }}></div>
                
                {/* 3D Volume Gradient (Highlight -> Shadow) */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#555] via-[#222] to-[#000] opacity-90"></div>
                
                {/* Rim Light (Sharp Top Edge) */}
                <div className="absolute inset-x-0 top-0 h-[2px] bg-white/30 blur-[1px]"></div>
                
                {/* Padding Shadow (Inner) */}
                <div className="absolute inset-0 shadow-[inset_0_10px_20px_rgba(0,0,0,0.8)] rounded-[50%]"></div>
            </div>

            {/* 2. Wood Trim Separator */}
            <div className="absolute top-[35px] left-[35px] right-[35px] bottom-[35px] rounded-[50%] bg-[#3d2b1f] border-t border-white/10 shadow-inner"></div>

            {/* 3. Felt Surface (Inner) */}
            <div className="absolute top-[45px] left-[45px] right-[45px] bottom-[45px] rounded-[50%] bg-[#0a2647] shadow-[inset_0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden relative">
                 
                 {/* Felt Texture (Procedural Woven Noise) */}
                 <div className="absolute inset-0 opacity-50 mix-blend-overlay" style={{ backgroundImage: `url("${FELT_TEXTURE}")` }}></div>

                 {/* Lighting: Overhead Lamp Spotlight (Conical) */}
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,_rgba(255,255,255,0.15)_0%,_transparent_60%)] mix-blend-overlay"></div>
                 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(0,0,0,0.6)_100%)]"></div>

                 {/* Khel.fun Watermark - Burnt into Felt */}
                 <div className="absolute inset-0 flex items-center justify-center opacity-[0.07] pointer-events-none mix-blend-overlay transform -translate-y-32 scale-125">
                    <BrandLogo className="w-96 h-auto text-white" variant="monochrome" />
                 </div>
                 
                 {/* Regulatory Text */}
                 <div className="absolute top-48 left-1/2 -translate-x-1/2 text-center opacity-40 transform">
                    <h2 className="text-4xl font-anton text-[#8ba4c0] tracking-widest text-shadow-sm drop-shadow-md">BLACKJACK</h2>
                    <div className="text-[10px] font-mono tracking-[0.4em] text-[#8ba4c0] mt-2 font-bold uppercase border-t border-b border-[#8ba4c0]/30 py-1">
                        Pays 3 to 2 • Dealer stands on 17
                    </div>
                 </div>
                 
                 {/* Ghost Betting Circles */}
                 <div className="absolute bottom-[28vh] left-1/2 -translate-x-1/2 flex gap-12 opacity-10 pointer-events-none">
                     <div className="w-20 h-20 rounded-full border-2 border-dashed border-white"></div>
                     <div className="w-32 h-32 rounded-full border-4 border-white"></div>
                     <div className="w-20 h-20 rounded-full border-2 border-dashed border-white"></div>
                 </div>
            </div>
        </div>

        {/* --- GAMEPLAY LAYER (Sits on top of table visually) --- */}
        
        {/* Dealer Area */}
        <div className="relative z-20 w-full flex flex-col items-center -mt-24 mb-10">
            
            {/* Dealer Avatar & Bubble */}
            <div className="relative mb-[-40px] z-10">
                 {/* Commentary Bubble */}
                <div className={`
                   absolute -right-36 top-8 w-48
                   bg-[#111] text-white p-4 rounded-xl border-l-4 border-khel-cyan
                   shadow-2xl z-50 transform transition-all duration-300 origin-bottom-left
                   ${isThinking ? 'scale-105' : 'scale-100'}
                   ${!dealerMessage || !showComments ? 'opacity-0 pointer-events-none translate-y-4 scale-90' : 'opacity-100 translate-y-0'}
                `}>
                    <div className="font-anton text-xs text-khel-cyan mb-1 uppercase tracking-wider flex justify-between items-center">
                        <span>VIC</span>
                        {isThinking && <span className="w-1.5 h-1.5 bg-khel-cyan rounded-full animate-ping"></span>}
                    </div>
                    <p className="text-sm font-sans text-gray-200 leading-snug">{dealerMessage}</p>
                </div>

                <VicAvatar 
                  className="w-48 h-48 drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)]" 
                  isThinking={isThinking} 
                  imageUrl={dealerImageUrl}
                  dominantResult={dominantResult}
                />
            </div>

            {/* Dealer Cards */}
            <div className="relative z-20 flex flex-col items-center min-h-[140px]">
                <div className="flex items-center justify-center transform pl-4">
                    {dealerHand.length > 0 ? (
                         dealerHand.map((card, i) => (
                            <CardComponent key={`dealer-${i}`} card={card} index={i} isDealer={true} />
                         ))
                    ) : (
                        <div className="w-24 h-36 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center text-white/10 text-xs font-anton uppercase tracking-widest bg-black/20">
                            House
                        </div>
                    )}
                </div>
                
                {/* Dealer Tag */}
                <div className="mt-4 flex items-center gap-2 px-4 py-1.5 rounded bg-[#111] border border-white/10 shadow-lg">
                    <Shield className="w-3 h-3 text-khel-red" />
                    <span className="text-xs font-anton text-white uppercase tracking-widest">
                        {gameState === GameState.Betting ? "House" : `Dealer ${dealerScore > 0 ? dealerScore : ''}`}
                    </span>
                </div>
            </div>
            
            {/* Deck Pile Positioned on Table */}
            <div className="absolute top-20 right-[15%] hidden md:block z-10 opacity-90 transform rotate-[-5deg]">
                 <DeckPile cardCount={deck.length} />
            </div>
        </div>

        {/* Player Area */}
        <div className="relative z-30 w-full max-w-4xl px-4 flex flex-col items-center min-h-[300px] justify-end pb-8">
            
            {/* Betting Spots (Interactive) */}
            {(gameState === GameState.Betting || gameState === GameState.Dealing) && (
                <div className="flex items-center justify-center gap-4 md:gap-8 mb-8 animate-slide-up relative z-40">
                     
                     {/* 1. Perfect Pairs Spot */}
                     <button 
                        onClick={() => addToBet(selectedChip, 'pp')}
                        disabled={balance < selectedChip || gameState === GameState.Dealing}
                        className={`
                           relative w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-200
                           ${perfectPairsBet > 0 ? 'border-khel-yellow bg-khel-yellow/20 shadow-[0_0_20px_rgba(255,255,51,0.3)]' : 'border-white/10 hover:border-khel-yellow/50 bg-black/40'}
                        `}
                     >
                        <span className="text-[10px] font-anton text-khel-yellow uppercase tracking-widest mb-1 opacity-80">Pairs</span>
                        <Gem className="w-4 h-4 text-khel-yellow/50" />
                        {perfectPairsBet > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                <Chip chip={{ value: perfectPairsBet, color: 'bg-khel-yellow', borderColor: '', label: '' }} disabled />
                            </div>
                        )}
                     </button>

                     {/* 2. Main Bet Spot */}
                     <button 
                        onClick={() => addToBet(selectedChip, 'main')}
                        disabled={balance < selectedChip || gameState === GameState.Dealing}
                        className={`
                           relative w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-200
                           ${currentBet > 0 ? 'border-khel-red bg-khel-red/20 shadow-[0_0_30px_rgba(206,32,41,0.4)]' : 'border-white/20 hover:border-khel-red/50 bg-black/40'}
                        `}
                     >
                        <span className="text-sm font-anton text-khel-red uppercase tracking-widest mb-1 opacity-80">Place Bet</span>
                        {currentBet > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                <Chip chip={{ value: currentBet, color: 'bg-khel-red', borderColor: '', label: '' }} disabled />
                            </div>
                        )}
                     </button>

                     {/* 3. 21+3 Spot */}
                     <button 
                        onClick={() => addToBet(selectedChip, 'rummy')}
                        disabled={balance < selectedChip || gameState === GameState.Dealing}
                        className={`
                           relative w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-200
                           ${rummyBet > 0 ? 'border-khel-cyan bg-khel-cyan/20 shadow-[0_0_20px_rgba(0,255,255,0.3)]' : 'border-white/10 hover:border-khel-cyan/50 bg-black/40'}
                        `}
                     >
                        <span className="text-[10px] font-anton text-khel-cyan uppercase tracking-widest mb-1 opacity-80">21+3</span>
                        <Spade className="w-4 h-4 text-khel-cyan/50" />
                         {rummyBet > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                <Chip chip={{ value: rummyBet, color: 'bg-khel-cyan', borderColor: '', label: '' }} disabled />
                            </div>
                        )}
                     </button>
                </div>
            )}

            {/* Player Hands */}
            <div className="flex items-end justify-center gap-8 min-h-[180px]">
                 {playerHands.length === 0 && gameState !== GameState.Betting && gameState !== GameState.Dealing && (
                    <div className="w-24 h-36 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center text-white/10 text-xs font-anton uppercase">
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
                                relative flex flex-col items-center transition-all duration-500
                                ${isCurrent ? 'scale-105 z-50 -translate-y-4' : 'scale-95 opacity-80 z-30'}
                            `}
                        >
                            {/* Indicators */}
                            {meta?.isDoubled && (
                                <div className="absolute -top-16 right-0 z-50 bg-khel-red text-white text-[10px] font-anton px-2 py-1 rounded shadow-lg animate-bounce-in">
                                    DOUBLED
                                </div>
                            )}
                            
                            {/* Score Bubble */}
                            {gameState !== GameState.Betting && gameState !== GameState.Dealing && (
                                <div className={`
                                    absolute -top-12 z-50 px-3 py-1 rounded font-anton text-lg shadow-xl border
                                    ${isCurrent ? 'bg-khel-yellow text-black border-white' : 'bg-[#222] text-white border-white/20'}
                                `}>
                                    {score}
                                </div>
                            )}

                            {/* Side Bet Wins */}
                            {handIndex === 0 && (sideBetResults.pp || sideBetResults.rummy) && (
                                <div className="absolute -left-32 top-0 flex flex-col gap-2 z-50 animate-bounce-in">
                                    {sideBetResults.pp && (
                                        <div className="bg-khel-yellow text-black text-xs font-bold px-3 py-1 rounded shadow-md border border-white whitespace-nowrap font-anton">
                                            {sideBetResults.pp}
                                        </div>
                                    )}
                                    {sideBetResults.rummy && (
                                        <div className="bg-khel-cyan text-black text-xs font-bold px-3 py-1 rounded shadow-md border border-white whitespace-nowrap font-anton">
                                            {sideBetResults.rummy}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center justify-center drop-shadow-2xl pl-6">
                                {hand.map((card, cardIndex) => (
                                    <CardComponent key={`p-${handIndex}-${cardIndex}`} card={card} index={cardIndex} />
                                ))}
                            </div>
                            
                            {/* Result Text Overlay */}
                            {(result !== GameResult.None || (isGameOver && result !== GameResult.None)) && (
                                 <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 whitespace-nowrap pointer-events-none">
                                    <div className={`
                                        px-4 py-2 border-2 shadow-2xl font-anton text-2xl tracking-widest transform -rotate-3
                                        ${result === GameResult.PlayerWin || result === GameResult.Blackjack ? 'bg-khel-cyan text-black border-white' : ''}
                                        ${result === GameResult.DealerWin || result === GameResult.Bust ? 'bg-khel-red text-white border-white' : ''}
                                        ${result === GameResult.Push ? 'bg-gray-600 text-white border-gray-400' : ''}
                                        ${result === GameResult.Surrender ? 'bg-purple-600 text-white border-purple-400' : ''}
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
                <div className="mt-6 flex items-center gap-4 text-white/90 text-sm font-sans font-bold bg-[#1a1a1a] px-6 py-2 rounded-full border border-white/10 shadow-lg z-40">
                    <div className="flex gap-2">
                        <span className="text-khel-cyan">BET:</span>
                        <span className="text-white">${handMetadata.reduce((acc, m) => acc + m.bet, 0)}</span>
                    </div>
                    {insuranceBet > 0 && (
                        <div className="flex gap-2 border-l border-white/20 pl-4">
                            <span className="text-khel-orange">INS:</span>
                            <span className="text-white">${insuranceBet}</span>
                        </div>
                    )}
                </div>
            )}

        </div>

      </main>

      {/* Control Panel / Footer */}
      <footer className="relative z-[60] pb-6 px-4 pt-4 bg-[#111] border-t border-white/5 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-4xl mx-auto">
            
            {/* Insurance Prompt */}
            {gameState === GameState.Insurance && (
                <div className="absolute -top-32 left-1/2 transform -translate-x-1/2 flex flex-col items-center bg-[#222] p-6 rounded-xl border-2 border-khel-red shadow-2xl animate-bounce-in w-80 z-[70]">
                    <div className="flex items-center gap-2 text-khel-red mb-2 font-anton uppercase tracking-widest text-lg">
                        <ShieldAlert className="w-5 h-5" />
                        Insurance?
                    </div>
                    <div className="text-xs text-center text-gray-400 mb-4 font-bold">
                        Cost: ${currentBet / 2} • Pays 2:1
                    </div>
                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={() => handleInsurance(true)}
                            className="flex-1 py-3 bg-khel-red hover:bg-red-700 text-white font-anton tracking-wider rounded transition-colors"
                        >
                            YES
                        </button>
                        <button 
                            onClick={() => handleInsurance(false)}
                            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-anton tracking-wider rounded transition-colors"
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
                    <div className="flex items-center gap-4 w-full max-w-md bg-[#1a1a1a] p-3 rounded-xl border border-white/5 shadow-lg">
                         <div className="flex-1 flex flex-col items-end pr-4 border-r border-white/10">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Total Bet</span>
                            <span className="text-2xl font-anton text-khel-cyan">${currentBet + perfectPairsBet + rummyBet}</span>
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                            <button 
                                onClick={dealGame}
                                disabled={currentBet === 0 || gameState === GameState.Dealing}
                                className="flex-1 py-3 bg-khel-red hover:bg-red-700 disabled:bg-stone-800 disabled:text-stone-600 text-white font-anton text-xl rounded shadow-sm active:translate-y-1 transform transition tracking-widest"
                            >
                                {gameState === GameState.Dealing ? "DEALING..." : "DEAL"}
                            </button>
                             {(currentBet > 0 || perfectPairsBet > 0 || rummyBet > 0) && gameState !== GameState.Dealing && (
                                <button onClick={clearBet} className="p-3 rounded bg-stone-800 hover:bg-stone-700 text-white/80 transition shadow-sm border border-white/5">
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
                        className="py-4 px-4 bg-khel-cyan hover:bg-cyan-400 text-black font-anton text-2xl rounded shadow-sm active:translate-y-1 transform transition"
                    >
                        HIT
                    </button>
                    <button 
                        onClick={() => stand()}
                        className="py-4 px-4 bg-khel-red hover:bg-red-600 text-white font-anton text-2xl rounded shadow-sm active:translate-y-1 transform transition"
                    >
                        STAND
                    </button>
                    
                    <div className="col-span-2 grid grid-cols-3 gap-2">
                        <button 
                            onClick={doubleDown}
                            disabled={!canDouble}
                            className="flex flex-col items-center justify-center p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-anton rounded shadow-sm active:translate-y-1 transition disabled:shadow-none"
                        >
                            <ArrowDownCircle className="w-5 h-5 mb-1" />
                            <span className="text-xs md:text-sm tracking-wide">DOUBLE</span>
                        </button>
                        
                        <button 
                            onClick={split}
                            disabled={!canSplit}
                            className="flex flex-col items-center justify-center p-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-anton rounded shadow-sm active:translate-y-1 transition disabled:shadow-none"
                        >
                            <Split className="w-5 h-5 mb-1" />
                            <span className="text-xs md:text-sm tracking-wide">SPLIT</span>
                        </button>

                        <button 
                            onClick={surrender}
                            disabled={!canSurrender}
                            className="flex flex-col items-center justify-center p-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-anton rounded shadow-sm active:translate-y-1 transition disabled:shadow-none"
                        >
                            <Flag className="w-5 h-5 mb-1" />
                            <span className="text-xs md:text-sm tracking-wide">FOLD</span>
                        </button>
                    </div>
                 </div>
            )}

             {/* Game Over Controls */}
             {gameState === GameState.GameOver && (
                 <div className="flex justify-center w-full animate-bounce-in">
                    <button 
                        onClick={resetGame}
                        className="flex items-center gap-3 px-12 py-5 bg-khel-yellow hover:bg-yellow-300 text-black font-anton text-2xl rounded shadow-md transform transition hover:scale-105 active:scale-95 tracking-widest"
                    >
                        <RefreshCw className="w-6 h-6" />
                        <span>PLAY AGAIN</span>
                    </button>
                 </div>
            )}
        </div>
      </footer>
    </div>
  );
};

export default App;