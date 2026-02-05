'use client';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../../hooks/useReduxHooks';

interface GlassContainerProps {
  children: React.ReactNode;
  style?: any;
  contentStyle?: any;
  backgroundColor?: string | null;
}

/**
 * A cross-platform glass effect container using pure JavaScript/CSS
 * This doesn't rely on native modules like BlurView
 *
 * @param props.children - Content to display inside the glass container
 * @param props.style - Additional styles for the container
 * @param props.contentStyle - Additional styles for the content container
 * @param props.backgroundColor - Background color for the glass effect
 */
const GlassContainer = ({
  children,
  style = {},
  contentStyle = {},
  backgroundColor = null,
}: GlassContainerProps): JSX.Element => {
  const { isDarkMode } = useTheme();

  // Default background colors if not provided
  const defaultBgColor =
    backgroundColor || (isDarkMode ? 'rgba(61, 42, 114, 0.7)' : 'rgba(255, 255, 255, 0.7)');

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.contentContainer, { backgroundColor: defaultBgColor }, contentStyle]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  contentContainer: {
    borderRadius: 20,
    padding: 16,
    // Add shadow for depth effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    // Add border for glass-like effect
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});

export default GlassContainer;
