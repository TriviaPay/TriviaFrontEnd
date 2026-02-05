import { scaleSize } from '../utils/scaleSize';
import { Dimensions } from 'react-native';

// Get current screen dimensions (static - for module-level initialization)
// For components that need responsive updates, use useDimensions hook
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Device type detection
export const getDeviceType = () => {
  if (screenWidth >= 768) return 'tablet';
  if (screenWidth < 375) return 'small';
  if (screenWidth < 414) return 'medium';
  return 'large';
};

// Responsive scaling functions - All use scaleSize for consistent scaling
// This maintains the same visual alignment across all screen sizes
export const responsiveScale = {
  // Horizontal scaling
  width: (size: number) => scaleSize(size),

  // Vertical scaling
  height: (size: number) => scaleSize(size),

  // Font scaling
  font: (size: number) => scaleSize(size),

  // General scaling (for borders, icons, etc.)
  size: (size: number) => scaleSize(size),

  // Padding scaling
  padding: (size: number) => scaleSize(size),
  paddingVertical: (size: number) => scaleSize(size),

  // Margin scaling
  margin: (size: number) => scaleSize(size),
  marginVertical: (size: number) => scaleSize(size),

  // Border radius scaling
  radius: (size: number) => scaleSize(size),
};

// Responsive breakpoints
export const breakpoints = {
  small: 375,
  medium: 414,
  large: 768,
  tablet: 1024,
};

// Responsive values based on device type - All use scaleSize for consistency
export const responsiveValues = {
  small: {
    padding: scaleSize(8),
    margin: scaleSize(8),
    fontSize: scaleSize(14),
    iconSize: scaleSize(20),
    buttonHeight: scaleSize(44),
    inputHeight: scaleSize(48),
  },
  medium: {
    padding: scaleSize(12),
    margin: scaleSize(12),
    fontSize: scaleSize(16),
    iconSize: scaleSize(24),
    buttonHeight: scaleSize(48),
    inputHeight: scaleSize(52),
  },
  large: {
    padding: scaleSize(16),
    margin: scaleSize(16),
    fontSize: scaleSize(18),
    iconSize: scaleSize(28),
    buttonHeight: scaleSize(52),
    inputHeight: scaleSize(56),
  },
  tablet: {
    padding: scaleSize(20),
    margin: scaleSize(20),
    fontSize: scaleSize(20),
    iconSize: scaleSize(32),
    buttonHeight: scaleSize(56),
    inputHeight: scaleSize(60),
  },
};

// Get responsive value based on device type
export const getResponsiveValue = (key: keyof typeof responsiveValues.small) => {
  const deviceType = getDeviceType();
  return responsiveValues[deviceType][key];
};

// Responsive container styles - All use scaleSize via responsiveScale
export const responsiveStyles = {
  container: {
    flex: 1,
    paddingHorizontal: responsiveScale.padding(16),
  },
  screen: {
    flex: 1,
    paddingHorizontal: responsiveScale.padding(16),
    paddingVertical: responsiveScale.paddingVertical(16),
  },
  card: {
    padding: responsiveScale.padding(16),
    borderRadius: responsiveScale.radius(12),
  },
  button: {
    height: getResponsiveValue('buttonHeight'),
    paddingHorizontal: responsiveScale.padding(16),
    borderRadius: responsiveScale.radius(8),
  },
  input: {
    height: getResponsiveValue('inputHeight'),
    paddingHorizontal: responsiveScale.padding(12),
    borderRadius: responsiveScale.radius(8),
    fontSize: getResponsiveValue('fontSize'),
  },
};

// Responsive image styles
export const responsiveImageStyles = {
  small: {
    width: '100%',
    aspectRatio: 1,
    resizeMode: 'contain' as const,
  },
  medium: {
    width: '100%',
    aspectRatio: 1.2,
    resizeMode: 'contain' as const,
  },
  large: {
    width: '100%',
    aspectRatio: 1.5,
    resizeMode: 'contain' as const,
  },
  tablet: {
    width: '100%',
    aspectRatio: 2,
    resizeMode: 'contain' as const,
  },
};

// Get responsive image style
export const getResponsiveImageStyle = () => {
  const deviceType = getDeviceType();
  return responsiveImageStyles[deviceType];
};

// Responsive text styles - All use scaleSize via responsiveScale
export const responsiveTextStyles = {
  title: {
    fontSize: responsiveScale.font(24),
    fontWeight: 'bold' as const,
    lineHeight: responsiveScale.font(32),
    allowFontScaling: true,
  },
  subtitle: {
    fontSize: responsiveScale.font(18),
    fontWeight: '600' as const,
    lineHeight: responsiveScale.font(24),
    allowFontScaling: true,
  },
  body: {
    fontSize: responsiveScale.font(16),
    fontWeight: 'normal' as const,
    lineHeight: responsiveScale.font(22),
    allowFontScaling: true,
  },
  caption: {
    fontSize: responsiveScale.font(14),
    fontWeight: 'normal' as const,
    lineHeight: responsiveScale.font(18),
    allowFontScaling: true,
  },
  small: {
    fontSize: responsiveScale.font(12),
    fontWeight: 'normal' as const,
    lineHeight: responsiveScale.font(16),
    allowFontScaling: true,
  },
};

// Safe area responsive styles - All use scaleSize via responsiveScale
export const safeAreaStyles = {
  container: {
    flex: 1,
    paddingTop: scaleSize(44), // Status bar height
    paddingBottom: scaleSize(34), // Home indicator height
  },
  content: {
    flex: 1,
    paddingHorizontal: responsiveScale.padding(16),
  },
};

// Keyboard responsive styles - All use scaleSize via responsiveScale
export const keyboardResponsiveStyles = {
  container: {
    flex: 1,
    paddingBottom: scaleSize(20),
  },
  scrollView: {
    flex: 1,
    paddingBottom: scaleSize(100),
  },
  form: {
    paddingHorizontal: responsiveScale.padding(16),
    paddingVertical: responsiveScale.paddingVertical(20),
  },
};

export default responsiveScale;

// Dynamic Hook for Responsive Values
import { useScaleSize } from '../utils/scaleSize';
import { useMemo } from 'react';

export const useResponsive = () => {
  const { scale, width, height, isLandscape } = useScaleSize();

  const deviceType = useMemo(() => {
    if (width >= breakpoints.tablet) return 'tablet';
    if (width < breakpoints.small) return 'small';
    if (width < breakpoints.medium) return 'medium';
    return 'large';
  }, [width]);

  const responsive = useMemo(() => ({
    // Scaling functions
    scale,
    width,
    height,
    isLandscape,
    deviceType,

    // Helpers mirroring the static ones but dynamic
    width: (size: number) => scale(size),
    height: (size: number) => scale(size),
    font: (size: number) => scale(size),
    padding: (size: number) => scale(size),
    margin: (size: number) => scale(size),
    radius: (size: number) => scale(size),

    // Values
    isSmallDevice: width < breakpoints.medium,
    isTablet: width >= breakpoints.tablet,

    // Get value for current device type
    getValue: (key: keyof typeof responsiveValues.small) => responsiveValues[deviceType][key],
  }), [scale, width, height, isLandscape, deviceType]);

  return responsive;
};
