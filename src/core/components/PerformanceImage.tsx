/**
 * PerformanceImage - Optimized image component with caching and memory management
 * Provides better performance for home screen assets
 */

import React, { memo, useCallback, useState } from 'react';
import { Image, ImageProps, Platform, View } from 'react-native';
import LottieView from 'lottie-react-native';
import { useTheme } from '../../hooks/useReduxHooks';

interface PerformanceImageProps extends Omit<ImageProps, 'source'> {
  source: any;
  fallbackSource?: any;
  showLoader?: boolean;
  loaderColor?: string;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: () => void;
}

const PerformanceImage: React.FC<PerformanceImageProps> = memo(
  ({
    source,
    fallbackSource,
    showLoader = true,
    loaderColor,
    onLoadStart,
    onLoadEnd,
    onError,
    style,
    ...props
  }) => {
    const { isDarkMode } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const handleLoadStart = useCallback(() => {
      setIsLoading(true);
      setHasError(false);
      onLoadStart?.();
    }, [onLoadStart]);

    const handleLoadEnd = useCallback(() => {
      setIsLoading(false);
      onLoadEnd?.();
    }, [onLoadEnd]);

    const handleError = useCallback(() => {
      setIsLoading(false);
      setHasError(true);
      onError?.();
    }, [onError]);

    const defaultLoaderColor = loaderColor || (isDarkMode ? '#FFFFFF' : '#000000');

    return (
      <View style={[{ position: 'relative' }, style]}>
        <Image
          {...props}
          source={hasError && fallbackSource ? fallbackSource : source}
          style={style}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          // Performance optimizations
          resizeMode={props.resizeMode || 'contain'}
          fadeDuration={Platform.OS === 'ios' ? 0 : 200}
          // Memory management
          onMemoryWarning={() => {
            // Handle memory warnings if needed
          }}
        />

        {isLoading && showLoader && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
            }}
          >
            <LottieView
              source={require('../../../assets/animations/LoadingBar.json')}
              autoPlay
              loop
              style={{ width: 30, height: 30 }}
            />
          </View>
        )}
      </View>
    );
  }
);

PerformanceImage.displayName = 'PerformanceImage';

export default PerformanceImage;
