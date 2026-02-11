/**
 * Image Optimization Utilities
 * Provides optimized image loading with caching, lazy loading, and placeholders
 */

import React from 'react';
import {
  Image,
  ImageProps,
  ImageStyle,
  StyleProp,
  View,
  Platform,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { logger } from '../lib/utils/logger';

// Image cache configuration
const IMAGE_CACHE_CONFIG = {
  maxCacheSize: 50 * 1024 * 1024, // 50MB
  cacheTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Optimized Image Component with caching and lazy loading
 */
interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  placeholder?: React.ReactNode;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center' | 'repeat';
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: any) => void;
  lazy?: boolean;
  cache?: 'default' | 'reload' | 'force-cache' | 'only-if-cached';
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  placeholder,
  style,
  resizeMode = 'cover',
  onLoadStart,
  onLoadEnd,
  onError,
  lazy = true,
  cache = 'default',
  ...props
}) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);
  const [shouldLoad, setShouldLoad] = React.useState(!lazy);

  React.useEffect(() => {
    if (lazy) {
      // Lazy load: wait for component to be visible
      const timer = setTimeout(() => {
        setShouldLoad(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [lazy]);

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
    onLoadStart?.();
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
    onLoadEnd?.();
  };

  const handleError = (error: any) => {
    setIsLoading(false);
    setHasError(true);
    logger.error('Image load error', 'IMAGE', error);
    onError?.(error);
  };

  if (!shouldLoad) {
    return placeholder ? <>{placeholder}</> : <View style={style} />;
  }

  const imageSource = typeof source === 'number' ? source : { ...source, cache };

  return (
    <View style={style}>
      <Image
        {...props}
        source={imageSource}
        style={[{ width: '100%', height: '100%' }, style]}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        // Performance optimizations
        fadeDuration={Platform.OS === 'ios' ? 0 : 200}
        progressiveRenderingEnabled={Platform.OS === 'android'}
      />
      {isLoading && !hasError && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {placeholder || (
            <LottieView
              source={require('../../assets/animations/LoadingBar.json')}
              autoPlay
              loop
              style={{ width: 30, height: 30 }}
            />
          )}
        </View>
      )}
    </View>
  );
};

/**
 * Preload images for better performance
 */
export const preloadImages = async (uris: string[]): Promise<void> => {
  try {
    // Use React Native's built-in Image.prefetch
    await Promise.all(
      uris.map(uri =>
        Image.prefetch(uri).catch(err => {
          logger.warn(`Failed to preload image: ${uri}`, 'IMAGE', err);
        })
      )
    );
  } catch (error) {
    logger.error('Error preloading images', 'IMAGE', error);
  }
};

/**
 * Get optimized image source with cache headers
 */
export const getOptimizedImageSource = (
  uri: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
  }
): { uri: string } => {
  if (!uri || typeof uri !== 'string') {
    return { uri: '' };
  }

  // If it's a local asset, return as is
  if (uri.startsWith('file://') || uri.startsWith('/')) {
    return { uri };
  }

  // Add cache headers for remote images
  const params = new URLSearchParams();
  if (options?.width) params.append('w', options.width.toString());
  if (options?.height) params.append('h', options.height.toString());
  if (options?.quality) params.append('q', options.quality.toString());

  const separator = uri.includes('?') ? '&' : '?';
  return { uri: `${uri}${separator}${params.toString()}` };
};

/**
 * Compress image before upload
 */
export const compressImage = async (
  uri: string,
  maxWidth: number = 1024,
  maxHeight: number = 1024,
  quality: number = 0.8
): Promise<string> => {
  // This would typically use a library like react-native-image-resizer
  // For now, return original URI
  logger.debug('Image compression requested', 'IMAGE', { uri, maxWidth, maxHeight, quality });
  return uri;
};

export default OptimizedImage;
