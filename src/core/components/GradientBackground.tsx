import React from 'react';
import { View, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface GradientBackgroundProps {
  children: React.ReactNode;
  colors?: string[];
}

const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  colors = ['#6c5ce7', '#8e44ad'],
}) => {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default GradientBackground;
