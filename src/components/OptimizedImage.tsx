/**
 * Optimized Image Component
 * Uses regular Image component (FastImage requires native linking which may not be available)
 * This prevents crashes from unlinked native modules
 */

import React from 'react';
import { Image, ImageProps, StyleSheet, View } from 'react-native';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  placeholder?: React.ReactNode;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
  priority?: 'low' | 'normal' | 'high'; // Kept for API compatibility, but not used
  fallbackSource?: ImageProps['source']; // Fallback image source if main source fails
}

/**
 * Optimized Image Component
 * Always uses regular Image component to prevent crashes from unlinked native modules
 * FastImage requires proper native linking which may not be available
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  style,
  placeholder,
  resizeMode = 'cover',
  priority = 'normal', // Not used, but kept for API compatibility
  fallbackSource,
  ...props
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [currentSource, setCurrentSource] = React.useState(source);

  // Handle image load error - switch to fallback if available
  const handleError = () => {
    if (fallbackSource && !imageError) {
      setImageError(true);
      setCurrentSource(fallbackSource);
    } else if (props.onError) {
      props.onError({ nativeEvent: { error: 'Image load failed' } } as any);
    }
  };

  // Always use regular Image component to prevent crashes
  // FastImage requires native module linking which may not be properly configured
  // Handle styles safely - ensure they're valid
  const safeStyle = style || {};
  const containerStyle = Array.isArray(safeStyle) ? safeStyle : [safeStyle];
  const imageStyle = Array.isArray(safeStyle) ? safeStyle : [safeStyle];

  // Ensure source is valid
  if (!currentSource) {
    return <View style={[styles.container, ...containerStyle]}>{placeholder}</View>;
  }

  return (
    <View style={[styles.container, ...containerStyle]}>
      {placeholder}
      <Image
        source={currentSource}
        style={imageStyle}
        resizeMode={resizeMode}
        onError={handleError}
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

export default React.memo(OptimizedImage);
