/**
 * Password Policy Component
 * Inline password requirements display
 *
 * @description Shows password requirements inline below password field
 * @author TriviaPay Team
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

interface PasswordPolicyProps {
  password: string;
  style?: any;
}

const PasswordPolicy: React.FC<PasswordPolicyProps> = ({ password, style }) => {
  const requirements = useMemo(
    () => [
      { text: 'At least 8 characters', met: password.length >= 8 },
      { text: 'One uppercase letter', met: /[A-Z]/.test(password) },
      { text: 'One lowercase letter', met: /[a-z]/.test(password) },
      { text: 'One number', met: /[0-9]/.test(password) },
      { text: 'One special character', met: /[^a-zA-Z0-9]/.test(password) },
    ],
    [password]
  );

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Password Requirements:</Text>
      {requirements.map((req, index) => (
        <View key={index} style={styles.requirement}>
          <Icon
            name={req.met ? 'check-circle' : 'circle'}
            size={14}
            color={req.met ? '#4ade80' : 'rgba(255,255,255,0.4)'}
          />
          <Text style={[styles.requirementText, req.met && styles.metRequirement]}>{req.text}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(108, 92, 231, 0.9)', // Light purple matching screen gradient
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 0, // Remove horizontal margin for full width
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
    color: '#4ade80',
    fontWeight: '600',
  },
  requirement: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 6,
  },
  requirementText: {
    color: '#ffffff',
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

export default PasswordPolicy;
