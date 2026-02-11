/**
 * Stable Image Component
 * Prevents layout shifts when images load by reserving space
 */

import React, { useState, useCallback, useRef } from 'react';
import { Image, ImageProps, View, StyleSheet, Platform } from 'react-native';
import LottieView from 'lottie-react-native';

interface StableImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  aspectRatio?: number;
  placeholder?: React.ReactNode;
  showLoader?: boolean;
  containerStyle?: any;
}

/**
 * Stable Image Component
 * Reserves space to prevent layout shifts when image loads
 */
export const StableImage: React.FC<StableImageProps> = ({
  source,
  aspectRatio,
  placeholder,
  showLoader = true,
  containerStyle,
  style,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{
    width?: number;
    height?: number;
  } | null>(null);
  const containerRef = useRef<{ width: number } | null>(null);

  const handleContainerLayout = useCallback(
    (event: any) => {
      const { width } = event.nativeEvent.layout;
      containerRef.current = { width };

      if (aspectRatio && width > 0) {
        setImageDimensions({
          width,
          height: width / aspectRatio,
        });
      }
    },
    [aspectRatio]
  );

  const handleImageLoad = useCallback(
    (event: any) => {
      setIsLoading(false);

      // Calculate dimensions from loaded image if not set
      if (!imageDimensions && event?.nativeEvent?.source && containerRef.current) {
        const { width: imgWidth, height: imgHeight } = event.nativeEvent.source;
        if (imgWidth && imgHeight) {
          const containerWidth = containerRef.current.width;
          const calculatedHeight = (containerWidth / imgWidth) * imgHeight;
          setImageDimensions({
            width: containerWidth,
            height: calculatedHeight,
          });
        }
      }

      props.onLoad?.(event);
    },
    [imageDimensions, props]
  );

  const handleImageError = useCallback(
    (error: any) => {
      setIsLoading(false);
      setHasError(true);
      props.onError?.(error);
    },
    [props]
  );

  // Extract width and height from style if provided
  const styleWidth =
    style && typeof style === 'object' && !Array.isArray(style) ? (style as any).width : undefined;
  const styleHeight =
    style && typeof style === 'object' && !Array.isArray(style) ? (style as any).height : undefined;

  // Determine final dimensions
  const finalWidth = imageDimensions?.width || styleWidth || '100%';
  const finalHeight =
    imageDimensions?.height ||
    styleHeight ||
    (aspectRatio && styleWidth ? styleWidth / aspectRatio : undefined) ||
    'auto';

  return (
    <View
      style={[
        styles.container,
        containerStyle,
        {
          width: finalWidth,
          height: finalHeight !== 'auto' ? finalHeight : undefined,
          minHeight: finalHeight !== 'auto' ? finalHeight : aspectRatio ? 100 : undefined,
        },
      ]}
      onLayout={handleContainerLayout}
    >
      {isLoading && showLoader && (
        <View style={styles.loaderContainer}>
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
      {!hasError && (
        <Image
          {...props}
          source={source}
          style={[
            styles.image,
            style,
            imageDimensions && {
              width: imageDimensions.width,
              height: imageDimensions.height,
            },
          ]}
          onLoad={handleImageLoad}
          onError={handleImageError}
          fadeDuration={Platform.OS === 'ios' ? 0 : 200}
          progressiveRenderingEnabled={Platform.OS === 'android'}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  loaderContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});

export default StableImage;
