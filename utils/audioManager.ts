
// Simple procedural audio generation using Web Audio API
// This avoids the need for external assets and allows for dynamic sound synthesis

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

export const initAudio = () => {
  if (!audioCtx) {
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    audioCtx = new AudioContextClass();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.3; // Global volume
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

const createOscillator = (type: OscillatorType, freq: number, duration: number, startTime: number, vol: number = 1) => {
  if (!audioCtx || !masterGain) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  
  osc.connect(gain);
  gain.connect(masterGain);
  
  osc.start(startTime);
  osc.stop(startTime + duration);
};

const createNoiseBuffer = () => {
  if (!audioCtx) return null;
  const bufferSize = audioCtx.sampleRate * 2; // 2 seconds of noise
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

let noiseBuffer: AudioBuffer | null = null;

export const playCardSound = () => {
  if (!audioCtx || !masterGain) initAudio();
  if (!audioCtx || !masterGain) return;

  if (!noiseBuffer) noiseBuffer = createNoiseBuffer();
  if (!noiseBuffer) return;

  const t = audioCtx.currentTime;
  const source = audioCtx.createBufferSource();
  source.buffer = noiseBuffer;
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1000, t);
  filter.Q.value = 0.5;

  const gain = audioCtx.createGain();
  // "Swish" envelope
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.4, t + 0.05);
  gain.gain.linearRampToValueAtTime(0, t + 0.15);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  source.start(t);
};

export const playChipSound = (value: number = 25) => {
  if (!audioCtx || !masterGain) initAudio();
  if (!audioCtx || !masterGain) return;

  const t = audioCtx.currentTime;

  // Realism Logic: 
  // Ceramic chips make a "clack" sound.
  // Smaller values = Higher pitch, sharper (lighter feel)
  // Larger values = Lower pitch, more resonance (heavier/thicker feel)
  
  let baseFreq = 2200;
  let decay = 0.08;
  let weight = 0.3; // Volume modifier

  if (value <= 5) { 
      baseFreq = 2800; // Sharp/Light
      decay = 0.05;
  } else if (value <= 25) { 
      baseFreq = 2400; // Standard
      decay = 0.07;
  } else if (value <= 100) { 
      baseFreq = 1600; // Deeper
      decay = 0.09;
      weight = 0.35;
  } else { 
      baseFreq = 1200; // Heavy/Thud
      decay = 0.12;
      weight = 0.4;
  }

  // Layer 1: The transient "Click" (Sine drop)
  // Simulates the initial impact of the hard material
  const osc1 = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(baseFreq, t);
  osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, t + 0.02); // Pitch drop adds percussiveness
  
  gain1.gain.setValueAtTime(0, t);
  gain1.gain.linearRampToValueAtTime(weight, t + 0.002); // Very fast attack
  gain1.gain.exponentialRampToValueAtTime(0.001, t + decay);

  // Layer 2: The "Body" (Triangle wave)
  // Simulates the ceramic resonance
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(baseFreq * 0.6, t); // Lower harmonic
  
  gain2.gain.setValueAtTime(0, t);
  gain2.gain.linearRampToValueAtTime(weight * 0.5, t + 0.005);
  gain2.gain.exponentialRampToValueAtTime(0.001, t + decay * 1.5); // Slightly longer ring

  // Layer 3: Texture (High-pass Noise)
  // Simulates surface friction/clatter
  if (!noiseBuffer) noiseBuffer = createNoiseBuffer();
  let noiseNode: AudioBufferSourceNode | null = null;
  let noiseGain: GainNode | null = null;
  
  if (noiseBuffer) {
      noiseNode = audioCtx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      const noiseFilter = audioCtx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 4000;
      
      noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(weight * 0.4, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03); // Very short burst

      noiseNode.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);
      noiseNode.start(t);
  }

  // Connect Oscillators
  osc1.connect(gain1);
  gain1.connect(masterGain);
  
  osc2.connect(gain2);
  gain2.connect(masterGain);

  osc1.start(t);
  osc1.stop(t + decay + 0.1);
  osc2.start(t);
  osc2.stop(t + decay + 0.2);
};

export const playWinSound = () => {
  if (!audioCtx || !masterGain) initAudio();
  if (!audioCtx) return;

  const t = audioCtx.currentTime;
  // Major chord arpeggio with "shine"
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    createOscillator('triangle', freq, 0.6, t + (i * 0.05), 0.2);
    createOscillator('sine', freq * 1.01, 0.6, t + (i * 0.05), 0.1); // Detuned layer
  });
};

export const playLoseSound = () => {
  if (!audioCtx || !masterGain) initAudio();
  if (!audioCtx) return;

  const t = audioCtx.currentTime;
  // Dissonant/Low chord
  createOscillator('sawtooth', 146.83, 0.6, t, 0.2); // D3
  createOscillator('triangle', 185.00, 0.6, t, 0.2); // F#3 (Diminished feel)
};

export const playBlackjackSound = () => {
  if (!audioCtx || !masterGain) initAudio();
  if (!audioCtx) return;

  const t = audioCtx.currentTime;
  // Fanfare
  const notes = [523.25, 783.99, 1046.50, 1567.98]; 
  notes.forEach((freq, i) => {
      createOscillator('square', freq, 0.4, t + (i * 0.08), 0.15);
  });
};

export const playMessageSound = () => {
  if (!audioCtx || !masterGain) initAudio();
  if (!audioCtx) return;

  const t = audioCtx.currentTime;
  // Subtle "pop" or notification sound
  createOscillator('sine', 880, 0.1, t, 0.1);
  createOscillator('sine', 1760, 0.05, t, 0.05);
};
