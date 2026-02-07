/**
 * Username Requirements Component
 * Inline username requirements display
 *
 * @description Shows username requirements inline below username field
 * @author TriviaPay Team
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

interface UsernameRequirementsProps {
  username: string;
  style?: any;
}

const UsernameRequirements: React.FC<UsernameRequirementsProps> = ({ username, style }) => {
  const requirements = useMemo(() => {
    const isValidChar = /^[a-zA-Z0-9._]*$/.test(username);
    const hasMinLength = username.length >= 3;
    const hasMaxLength = username.length <= 12;
    const isWithinLimit = username.length > 0 && username.length <= 12;

    return [
      { text: '3-12 characters', met: hasMinLength && hasMaxLength && username.length > 0 },
      {
        text: 'Letters, numbers, . (period), and _ (underscore) only',
        met: isValidChar || username.length === 0,
      },
    ];
  }, [username]);

  const isValid = useMemo(() => {
    if (username.length === 0) return null;
    const isValidChar = /^[a-zA-Z0-9._]+$/.test(username);
    const hasValidLength = username.length >= 3 && username.length <= 12;
    return isValidChar && hasValidLength;
  }, [username]);

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Username Requirements:</Text>
      {requirements.map((req, index) => (
        <View key={index} style={styles.requirement}>
          <Icon
            name={req.met ? 'check-circle' : 'circle'}
            size={14}
            color={req.met ? '#FFD700' : 'rgba(255,255,255,0.4)'}
          />
          <Text style={[styles.requirementText, req.met && styles.metRequirement]}>{req.text}</Text>
        </View>
      ))}
      {username.length > 0 && (
        <Text style={styles.characterCount}>{username.length}/12 characters</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  characterCount: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
  container: {
    backgroundColor: 'rgba(108, 92, 231, 0.9)', // Light purple matching screen gradient
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  metRequirement: {
    color: '#FFD700',
    fontWeight: '600',
  },
  requirement: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 6,
  },
  requirementText: {
    color: '#ffffff',
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
});

export default UsernameRequirements;
