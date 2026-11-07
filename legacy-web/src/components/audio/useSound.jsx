import { useCallback, useRef } from 'react';

const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;

const playTone = (freq, duration, startTime, gain = 0.1, waveform = 'sine') => {
  if (!audioContext) return;
  const osc = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  osc.type = waveform;
  osc.frequency.setValueAtTime(freq, startTime);
  osc.connect(gainNode);
  gainNode.connect(audioContext.destination);
  gainNode.gain.setValueAtTime(gain, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
  
  osc.start(startTime);
  osc.stop(startTime + duration);
  return { osc, gainNode };
};

const createSound = (type, duration = 0.2) => {
  if (!audioContext) return null;
  const now = audioContext.currentTime;

  switch (type) {
    case 'flick': {
      // Upward whoosh with harmonics
      playTone(600, 0.15, now, 0.12, 'triangle');
      playTone(900, 0.1, now + 0.05, 0.08, 'sine');
      break;
    }
    case 'land': {
      // Deep impact with resonance
      playTone(300, 0.15, now, 0.15, 'sine');
      playTone(450, 0.2, now + 0.02, 0.08, 'triangle');
      break;
    }
    case 'return': {
      // Rising chime
      playTone(500, 0.1, now, 0.1, 'sine');
      playTone(750, 0.15, now + 0.05, 0.1, 'sine');
      playTone(1000, 0.12, now + 0.08, 0.08, 'sine');
      break;
    }
    case 'pickup': {
      // Bright ascending chord
      playTone(800, 0.2, now, 0.12, 'triangle');
      playTone(1000, 0.18, now + 0.03, 0.1, 'sine');
      playTone(1200, 0.15, now + 0.06, 0.08, 'sine');
      break;
    }
    case 'notification': {
      // Double beep
      playTone(700, 0.08, now, 0.1, 'sine');
      playTone(700, 0.08, now + 0.12, 0.1, 'sine');
      break;
    }
    case 'success': {
      // Rising triumphant notes
      playTone(523, 0.12, now, 0.12, 'sine'); // C
      playTone(659, 0.12, now + 0.08, 0.12, 'sine'); // E
      playTone(784, 0.15, now + 0.16, 0.12, 'sine'); // G
      break;
    }
    case 'click': {
      // Short percussive click
      playTone(600, 0.05, now, 0.08, 'square');
      playTone(400, 0.04, now + 0.02, 0.06, 'sine');
      break;
    }
    case 'unlock': {
      // Magical ascending scale
      playTone(400, 0.08, now, 0.1, 'sine');
      playTone(500, 0.08, now + 0.07, 0.1, 'sine');
      playTone(600, 0.08, now + 0.14, 0.1, 'sine');
      playTone(800, 0.12, now + 0.21, 0.1, 'sine');
      break;
    }
    case 'milestone': {
      // Fanfare-like chord progression
      playTone(330, 0.1, now, 0.12, 'sine'); // E
      playTone(494, 0.1, now + 0.05, 0.12, 'sine'); // B
      playTone(659, 0.15, now + 0.1, 0.12, 'sine'); // E high
      playTone(988, 0.12, now + 0.15, 0.1, 'sine'); // B high
      break;
    }
    default:
      break;
  }
};

export const useSound = () => {
  const soundEnabledRef = useRef(true);

  const play = useCallback((type) => {
    if (!soundEnabledRef.current || !audioContext) return;
    try {
      createSound(type);
    } catch (error) {
      console.error('Sound play error:', error);
    }
  }, []);

  const toggleSound = useCallback(() => {
    soundEnabledRef.current = !soundEnabledRef.current;
    return soundEnabledRef.current;
  }, []);

  return { play, toggleSound, soundEnabled: soundEnabledRef.current };
};