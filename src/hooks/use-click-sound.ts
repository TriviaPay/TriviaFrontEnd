/**
 * useClickSound Hook - TypeScript Implementation
 * Professional click sound hook with comprehensive features
 */

import { useEffect } from 'react';
import { useSound } from './useReduxHooks';

interface ClickSoundReturn {
  playClick: () => void;
}

export const useClickSound = (): ClickSoundReturn => {
  const { playSound, soundEnabled } = useSound();

  const playClick = (): void => {
    if (soundEnabled) {
      playSound('click');
    }
  };

  useEffect(() => {
    playClick();
  }, []);

  return { playClick };
};

export default useClickSound;
