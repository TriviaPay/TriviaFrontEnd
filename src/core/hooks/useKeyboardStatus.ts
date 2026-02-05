import { useState, useEffect } from 'react';
import { Keyboard, Platform } from 'react-native';

interface KeyboardStatus {
  keyboardShown: boolean;
  keyboardHeight: number;
}

const useKeyboardStatus = (): KeyboardStatus => {
  const [keyboardShown, setKeyboardShown] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', event => {
      setKeyboardShown(true);
      setKeyboardHeight(event.endCoordinates.height);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardShown(false);
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  return {
    keyboardShown,
    keyboardHeight,
  };
};

export default useKeyboardStatus;
