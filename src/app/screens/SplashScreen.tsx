import React, { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text } from '@ui/components';
import { colors } from '@ui/tokens';
import BootSplash from 'react-native-bootsplash';

export const SplashScreen: React.FC = () => {
  useEffect(() => {
    const init = async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await BootSplash.hide({ fade: true });
    };
    init();
  }, []);

  return (
    <View style={styles.container}>
      <Image source={require('@assets/logo.png')} style={styles.logo} />
      <Text variant="h2" color={colors.primary[500]}>
        TriviaCoin
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.white,
    flex: 1,
    justifyContent: 'center',
  },
  logo: { height: 150, marginBottom: 20, width: 150 },
});
