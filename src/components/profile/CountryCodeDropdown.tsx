/**
 * CountryCodeDropdown - TypeScript Implementation
 * Country code dropdown component for mobile number selection
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

// Country codes with flags
const countryCodes = [
  { code: '+1', country: 'US', flag: '🇺🇸' },
  { code: '+44', country: 'GB', flag: '🇬🇧' },
  { code: '+91', country: 'IN', flag: '🇮🇳' },
  { code: '+61', country: 'AU', flag: '🇦🇺' },
  { code: '+86', country: 'CN', flag: '🇨🇳' },
  { code: '+49', country: 'DE', flag: '🇩🇪' },
  { code: '+33', country: 'FR', flag: '🇫🇷' },
  { code: '+81', country: 'JP', flag: '🇯🇵' },
  { code: '+7', country: 'RU', flag: '🇷🇺' },
  { code: '+55', country: 'BR', flag: '🇧🇷' },
];

interface CountryCodeDropdownProps {
  countryCode: string;
  showDropdown: boolean;
  toggleDropdown: () => void;
  onSelect: (code: string) => void;
}

const CountryCodeDropdown: React.FC<CountryCodeDropdownProps> = ({
  countryCode,
  showDropdown,
  toggleDropdown,
  onSelect,
}) => {
  return (
    <>
      <TouchableOpacity
        style={{
          borderWidth: 1,
          borderTopLeftRadius: 8,
          borderBottomLeftRadius: 8,
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          width: 112,
          zIndex: 10,
          borderColor: '#e5e7eb',
          backgroundColor: '#f9fafb',
        }}
        onPress={toggleDropdown}
      >
        <Text
          style={{
            fontSize: 16,
            color: '#1f2937',
          }}
        >
          {countryCode}
        </Text>
        <Text style={{ fontSize: 16 }}>
          {countryCodes.find(c => c.code === countryCode)?.flag || '🌍'}
        </Text>
      </TouchableOpacity>

      {showDropdown && (
        <View
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            borderWidth: 1,
            borderRadius: 8,
            zIndex: 50,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
            backgroundColor: 'white',
            borderColor: '#e5e7eb',
          }}
        >
          <ScrollView
            style={{ maxHeight: 200 }}
            nestedScrollEnabled={true}
            contentContainerStyle={{ paddingVertical: 4 }}
          >
            {countryCodes.map(item => (
              <TouchableOpacity
                key={item.code}
                style={{
                  padding: 8,
                  borderBottomWidth: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  width: 104,
                  borderBottomColor: '#f3f4f6',
                }}
                onPress={() => {
                  onSelect(item.code);
                  toggleDropdown();
                }}
              >
                <Text style={{ fontSize: 18, marginRight: 4 }}>{item.flag}</Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: '#1f2937',
                  }}
                >
                  {item.country} ({item.code})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );
};

export default CountryCodeDropdown;
