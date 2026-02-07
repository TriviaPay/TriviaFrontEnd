/**
 * useMeasurements Hook - TypeScript Implementation
 * Professional measurements hook with comprehensive features
 */

import { useRef, useState, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

interface CardPositions {
  [day: string]: Position;
}

interface UseMeasurementsReturn {
  cardRefs: React.MutableRefObject<{ [day: string]: any }>;
  gemsCountRef: React.MutableRefObject<any>;
  gemIconRef: React.MutableRefObject<any>;
  cardPositions: CardPositions;
  gemsCountPosition: Position;
  gemIconPosition: Position;
  measureAllCards: () => void;
  measureGemsCount: () => void;
  measureGemIcon: () => void;
  onCardLayout: (day: string) => void;
  cleanup: () => void;
}

export const useMeasurements = (): UseMeasurementsReturn => {
  const cardRefs = useRef<{ [day: string]: any }>({});
  const gemsCountRef = useRef<any>(null);
  const gemIconRef = useRef<any>(null);
  const measurementTimeouts = useRef(new Set<NodeJS.Timeout>());
  const isMeasuring = useRef<boolean>(false);

  const [cardPositions, setCardPositions] = useState<CardPositions>({});
  const [gemsCountPosition, setGemsCountPosition] = useState<Position>({ x: 0, y: 0 });
  const [gemIconPosition, setGemIconPosition] = useState<Position>({ x: 0, y: 0 });

  const cleanup = useCallback((): void => {
    measurementTimeouts.current.forEach(timeout => clearTimeout(timeout));
    measurementTimeouts.current.clear();
    isMeasuring.current = false;
  }, []);

  const measureAllCards = useCallback((): void => {
    if (isMeasuring.current) return;
    isMeasuring.current = true;

    const timeout = setTimeout(() => {
      const newPositions: CardPositions = {};
      const cardKeys = Object.keys(cardRefs.current);

      if (cardKeys.length === 0) {
        isMeasuring.current = false;
        return;
      }

      let measured = 0;
      const totalCards = cardKeys.length;

      cardKeys.forEach(day => {
        if (cardRefs.current[day]) {
          try {
            cardRefs.current[day].measure(
              (fx: number, fy: number, width: number, height: number, px: number, py: number) => {
                newPositions[day] = { x: px + width / 2, y: py + height / 2 };
                measured++;

                if (measured === totalCards) {
                  setCardPositions(newPositions);
                  isMeasuring.current = false;
                }
              }
            );
          } catch (error) {
            measured++;
            if (measured === totalCards) {
              setCardPositions(newPositions);
              isMeasuring.current = false;
            }
          }
        } else {
          measured++;
          if (measured === totalCards) {
            setCardPositions(newPositions);
            isMeasuring.current = false;
          }
        }
      });

      const fallbackTimeout = setTimeout(() => {
        if (Object.keys(newPositions).length > 0) {
          setCardPositions(newPositions);
        }
        isMeasuring.current = false;
      }, 1000);

      measurementTimeouts.current.add(fallbackTimeout);
    }, 100);

    measurementTimeouts.current.add(timeout);
  }, []);

  const measureGemsCount = useCallback((): void => {
    if (gemsCountRef.current) {
      try {
        gemsCountRef.current.measure(
          (fx: number, fy: number, width: number, height: number, px: number, py: number) => {
            // Measure the center of the gem count container (which includes icon and text)
            const position = { x: px + width / 2, y: py + height / 2 };
            setGemsCountPosition(position);
          }
        );
      } catch (error) {}
    }
  }, []);

  const measureGemIcon = useCallback((): void => {
    if (gemIconRef.current) {
      try {
        gemIconRef.current.measure(
          (fx: number, fy: number, width: number, height: number, px: number, py: number) => {
            const position = { x: px + width / 2, y: py + height / 2 };
            setGemIconPosition(position);
          }
        );
      } catch (error) {}
    }
  }, []);

  const onCardLayout = useCallback(
    (day: string): void => {
      if (!cardPositions[day]) {
        const timeout = setTimeout(() => {
          if (cardRefs.current[day]) {
            try {
              cardRefs.current[day].measure(
                (fx: number, fy: number, width: number, height: number, px: number, py: number) => {
                  const position = { x: px + width / 2, y: py + height / 2 };
                  setCardPositions(prev => ({
                    ...prev,
                    [day]: position,
                  }));
                }
              );
            } catch (error) {}
          }
        }, 50);

        measurementTimeouts.current.add(timeout);
      }
    },
    [cardPositions]
  );

  return {
    cardRefs,
    gemsCountRef,
    gemIconRef,
    cardPositions,
    gemsCountPosition,
    gemIconPosition,
    measureAllCards,
    measureGemsCount,
    measureGemIcon,
    onCardLayout,
    cleanup,
  };
};
