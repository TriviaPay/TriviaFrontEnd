import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../hooks/useReduxHooks';

const ShopAdvertisement: React.FC = () => {
  const { colors, isDarkMode } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode ? '#222' : '#f0f0f0',
        },
      ]}
    >
      <TouchableOpacity
        style={styles.adButton}
        onPress={() => {
          // Handle ad button press
        }}
      >
        <View style={styles.adContent}>
          <Text style={[styles.adTitle, { color: colors.text }]}>Special Offer!</Text>
          <Text style={[styles.adDescription, { color: colors.textSecondary }]}>
            Get 50% extra coins on your first purchase
          </Text>
        </View>
        <Text style={styles.adIcon}>🎁</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  adButton: {
    alignItems: 'center',
    flexDirection: 'row',
    height: '100%',
    justifyContent: 'space-between',
  },
  adContent: {
    flex: 1,
  },
  adDescription: {
    fontSize: 14,
  },
  adIcon: {
    fontSize: 32,
  },
  adTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  container: {
    borderTopColor: '#ddd',
    borderTopWidth: 1,
    height: 90,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%', // Approximately one inch
  },
});

export default ShopAdvertisement;
