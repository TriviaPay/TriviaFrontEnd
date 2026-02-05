import React, { useMemo, memo } from 'react';
import { View, StyleSheet } from 'react-native';
import ShopItem from './ShopItem';
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';

interface ShopItemListProps {
  items: any[];
}

// Fixed: Memoize ShopItem to prevent unnecessary re-renders
const MemoizedShopItem = memo(ShopItem);

// Create styles function - must be defined before component to avoid hoisting issues
const createStyles = (
  screenWidth: number,
  isSmallDevice: boolean,
  parentPadding: number,
  gapBetweenCards: number,
  cardWidth: number,
  scaleSize: (size: number) => number
) =>
  StyleSheet.create({
    container: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      width: '100%',
    },
    itemLeft: {
      marginRight: gapBetweenCards, // Gap between left and right card
    },
    itemRight: {
      marginRight: 0, // No right margin for right card
    },
    itemWrapper: {
      width: cardWidth, // Fixed width for 2 columns - exactly half minus gap
      maxWidth: cardWidth,
      minWidth: cardWidth,
      marginBottom: isSmallDevice ? scaleSize(12) : scaleSize(14),
      flexShrink: 0,
      flexGrow: 0,
    },
  });

const ShopItemList: React.FC<ShopItemListProps> = ({ items }) => {
  const { width: screenWidth, isSmallDevice, scaleSize } = useStandardResponsive();

  // Validate screenWidth - ensure it's a valid number
  const validScreenWidth = React.useMemo(() => {
    if (
      typeof screenWidth === 'number' &&
      !isNaN(screenWidth) &&
      isFinite(screenWidth) &&
      screenWidth > 0
    ) {
      return screenWidth;
    }
    // Fallback to a reasonable default (iPhone standard width)
    return 375;
  }, [screenWidth]);

  // Calculate parent padding (ShopContent uses scaleSize(12) or scaleSize(16) for padding)
  const parentPadding = isSmallDevice ? scaleSize(12) : scaleSize(16);
  const gapBetweenCards = scaleSize(16); // Increased gap for better spacing

  // Calculate available width: screenWidth minus parent padding on both sides
  // Ensure availableWidth is never negative
  const availableWidth = Math.max(0, validScreenWidth - parentPadding * 2);

  // Calculate card width for 2 columns: (availableWidth - gap) / 2
  // This ensures exactly 2 cards fit per row
  // Ensure cardWidth is never negative or zero
  const cardWidth = Math.max(100, Math.floor((availableWidth - gapBetweenCards) / 2));

  // Create responsive styles
  const styles = useMemo(
    () =>
      createStyles(
        validScreenWidth,
        isSmallDevice,
        parentPadding,
        gapBetweenCards,
        cardWidth,
        scaleSize
      ),
    [validScreenWidth, isSmallDevice, parentPadding, gapBetweenCards, cardWidth, scaleSize]
  );

  // Filter and memoize valid items for performance - strict validation to prevent crashes
  const validItems = useMemo(() => {
    if (!items || !Array.isArray(items)) {
      return [];
    }
    // Strict filtering - only include items with all required fields
    return items.filter(item => {
      return (
        item &&
        typeof item === 'object' &&
        item.id &&
        typeof item.id === 'string' &&
        item.name &&
        typeof item.name === 'string'
      );
    });
  }, [items]);

  // Render items in a 2-column grid with optimized rendering
  // Wrap in error boundary to prevent crashes
  try {
    return (
      <View style={styles.container}>
        {validItems.map((item, index) => {
          // Additional safety check for each item
          if (!item || !item.id || typeof item.id !== 'string') {
            return null;
          }

          // Calculate if item should be on left or right
          const isLeft = index % 2 === 0;

          return (
            <View
              key={item.id}
              style={[styles.itemWrapper, isLeft ? styles.itemLeft : styles.itemRight]}
            >
              <MemoizedShopItem item={item} />
            </View>
          );
        })}
      </View>
    );
  } catch (error) {
    // Return empty view instead of crashing
    return <View style={styles.container} />;
  }
};

export default ShopItemList;
