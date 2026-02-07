/**
 * PersonalDetails - TypeScript Implementation
 * Personal details component for profile screen
 */

import React from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SoundTouchableOpacity from '../../core/components/SoundTouchableOpacity';

// Gender options
const genderOptions = ['Male', 'Female', 'Prefer not to say'];

interface Address {
  street1: string;
  street2: string;
  aptNumber: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

interface PersonalDetailsProps {
  isEditing: boolean;
  dob: string;
  gender: string;
  address: Address;
  showGenderDropdown: boolean;
  toggleGenderDropdown: () => void;
  toggleCountryListDropdown: () => void;
  handleDateSelect: () => void;
  handleGenderSelect: (gender: string) => void;
  handleAddressChange: (field: keyof Address, value: string) => void;
  onInputFocus?: () => void;
}

const PersonalDetails: React.FC<PersonalDetailsProps> = ({
  isEditing,
  dob,
  gender,
  address,
  showGenderDropdown,
  toggleGenderDropdown,
  toggleCountryListDropdown,
  handleDateSelect,
  handleGenderSelect,
  handleAddressChange,
  onInputFocus,
}) => {

  return (
    <View
      style={{
        paddingHorizontal: 16,
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        backgroundColor: '#ffffff',
        borderWidth: 2,
        borderColor: '#FFD700',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 25,
        elevation: 15,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <View
          style={{
            width: 4,
            height: 24,
            borderRadius: 2,
            marginRight: 12,
            backgroundColor: '#8B5CF6',
          }}
        />
        <Text
          style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: '#7C3AED',
          }}
        >
          Personal Details
        </Text>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 20, gap: 12, alignItems: 'stretch' }}>
        {/* Date of Birth */}
        <View
          style={{
            flex: 1.5,
            backgroundColor: 'rgba(59, 130, 246, 0.08)', // Light bluish
            padding: 12,
            borderRadius: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Icon name="calendar" size={18} color="#8B5CF6" />
            <Text
              style={{
                fontSize: 16,
                fontWeight: 'bold',
                marginLeft: 8,
                color: '#1f2937',
              }}
            >
              Date of Birth
            </Text>
          </View>

          {isEditing ? (
            <SoundTouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderWidth: 1,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 14,
                borderColor: '#e5e7eb',
                backgroundColor: 'white',
                minHeight: 48,
                width: '100%',
                marginLeft: 0,
              }}
              onPress={handleDateSelect}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: '#4b5563',
                  flex: 1,
                }}
              >
                {dob}
              </Text>
              <Icon
                name="calendar"
                size={18}
                color="#8B5CF6"
                style={{ marginLeft: 4, flexShrink: 0 }}
              />
            </SoundTouchableOpacity>
          ) : (
            <Text
              style={{
                fontSize: 16,
                marginLeft: 0,
                color: '#4b5563',
              }}
            >
              {dob}
            </Text>
          )}
        </View>

        {/* Gender */}
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(59, 130, 246, 0.08)', // Light bluish
            padding: 12,
            borderRadius: 8,
            zIndex: showGenderDropdown ? 10000 : 1000,
            elevation: showGenderDropdown ? 10000 : 1000,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Icon name="account" size={18} color="#8B5CF6" />
            <Text
              style={{
                fontSize: 16,
                fontWeight: 'bold',
                marginLeft: 8,
                color: '#1f2937',
              }}
            >
              Gender
            </Text>
          </View>

          {isEditing ? (
            <View
              style={{
                marginLeft: 0,
                position: 'relative',
                width: '100%',
                zIndex: showGenderDropdown ? 10001 : 1,
              }}
            >
              <SoundTouchableOpacity
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 14,
                  borderColor: '#e5e7eb',
                  backgroundColor: 'white',
                  minHeight: 48,
                  width: '100%',
                }}
                onPress={toggleGenderDropdown}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: gender ? '#4b5563' : '#9CA3AF',
                    flex: 1,
                  }}
                >
                  {gender || 'Select'}
                </Text>
                <Icon
                  name="chevron-down"
                  size={18}
                  color="#8B5CF6"
                  style={{ marginLeft: 4, flexShrink: 0 }}
                />
              </SoundTouchableOpacity>

              {showGenderDropdown && (
                <View
                  collapsable={false}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    backgroundColor: 'white',
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    borderRadius: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 10000,
                    zIndex: 99999,
                    overflow: 'hidden',
                  }}
                  pointerEvents="box-none"
                >
                  {genderOptions.map((item, index) => (
                    <SoundTouchableOpacity
                      key={item}
                      activeOpacity={0.7}
                      style={{
                        paddingVertical: 14,
                        paddingHorizontal: 12,
                        minHeight: 44,
                        borderBottomWidth: index === genderOptions.length - 1 ? 0 : 1,
                        borderBottomColor: '#f3f4f6',
                        backgroundColor: gender === item ? '#ede9fe' : 'transparent',
                      }}
                      onPress={() => {
                        handleGenderSelect(item);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          color: '#1f2937',
                          fontWeight: gender === item ? '600' : 'normal',
                        }}
                      >
                        {item}
                      </Text>
                    </SoundTouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <Text
              style={{
                fontSize: 16,
                marginLeft: 0,
                color: gender ? '#4b5563' : '#9CA3AF',
              }}
            >
              {gender || 'Not specified'}
            </Text>
          )}
        </View>
      </View>

      {/* Address */}
      <View
        style={{
          marginBottom: 8,
          backgroundColor: 'rgba(59, 130, 246, 0.08)',
          padding: 12,
          borderRadius: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Icon name="map-marker" size={18} color="#8B5CF6" />
          <Text
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              marginLeft: 8,
              color: '#1f2937',
            }}
          >
            Address
          </Text>
        </View>

        {isEditing ? (
          <View style={{ marginLeft: 0, gap: 12 }}>
            {/* Street 1 */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ width: 80, fontSize: 14, color: '#6b7280', fontWeight: '600', marginRight: 6 }}>Street 1</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 15,
                  borderColor: '#e5e7eb',
                  backgroundColor: 'white',
                  color: '#1f2937',
                  flex: 1,
                }}
                value={address.street1}
                onChangeText={text => handleAddressChange('street1', text)}
                placeholder="e.g. 123 Main St"
                placeholderTextColor="#9CA3AF"
                onFocus={onInputFocus}
                editable={isEditing}
                selectTextOnFocus={false}
              />
            </View>

            {/* Street 2 */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ width: 80, fontSize: 14, color: '#6b7280', fontWeight: '600', marginRight: 6 }}>Street 2</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 15,
                  borderColor: '#e5e7eb',
                  backgroundColor: 'white',
                  color: '#1f2937',
                  flex: 1,
                }}
                value={address.street2}
                onChangeText={text => handleAddressChange('street2', text)}
                placeholder="e.g. Apt 4B"
                placeholderTextColor="#9CA3AF"
                onFocus={onInputFocus}
                editable={isEditing}
                selectTextOnFocus={false}
              />
            </View>

            {/* Apt Number */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ width: 80, fontSize: 14, color: '#6b7280', fontWeight: '600', marginRight: 6 }}>Apt/Suite</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 15,
                  borderColor: '#e5e7eb',
                  backgroundColor: 'white',
                  color: '#1f2937',
                  flex: 1,
                }}
                value={address.aptNumber}
                onChangeText={text => handleAddressChange('aptNumber', text)}
                placeholder="e.g. Suite 500"
                placeholderTextColor="#9CA3AF"
                onFocus={onInputFocus}
                editable={isEditing}
                selectTextOnFocus={false}
              />
            </View>

            {/* City */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ width: 80, fontSize: 14, color: '#6b7280', fontWeight: '600', marginRight: 6 }}>City</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 15,
                  borderColor: '#e5e7eb',
                  backgroundColor: 'white',
                  color: '#1f2937',
                  flex: 1,
                }}
                value={address.city}
                onChangeText={text => handleAddressChange('city', text)}
                placeholder="e.g. New York"
                placeholderTextColor="#9CA3AF"
                onFocus={onInputFocus}
                editable={isEditing}
                selectTextOnFocus={false}
              />
            </View>

            {/* State */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ width: 80, fontSize: 14, color: '#6b7280', fontWeight: '600', marginRight: 6 }}>State</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 15,
                  borderColor: '#e5e7eb',
                  backgroundColor: 'white',
                  color: '#1f2937',
                  flex: 1,
                }}
                value={address.state}
                onChangeText={text => handleAddressChange('state', text)}
                placeholder="e.g. NY"
                placeholderTextColor="#9CA3AF"
                onFocus={onInputFocus}
                editable={isEditing}
                selectTextOnFocus={false}
              />
            </View>

            {/* Country */}
            <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 2000 }}>
              <Text style={{ width: 80, fontSize: 14, color: '#6b7280', fontWeight: '600', marginRight: 6 }}>Country</Text>
              <View style={{ flex: 1, position: 'relative' }}>
                <SoundTouchableOpacity
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 14,
                    borderColor: '#e5e7eb',
                    backgroundColor: 'white',
                    minHeight: 48,
                    width: '100%',
                  }}
                  onPress={toggleCountryListDropdown}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      color: address.country ? '#1f2937' : '#9CA3AF',
                      flex: 1,
                    }}
                  >
                    {address.country || 'Select Country'}
                  </Text>
                  <Icon
                    name="chevron-down"
                    size={18}
                    color="#8B5CF6"
                    style={{ marginLeft: 4, flexShrink: 0 }}
                  />
                </SoundTouchableOpacity>
              </View>
            </View>

            {/* Zip code */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ width: 80, fontSize: 14, color: '#6b7280', fontWeight: '600', marginRight: 6 }}>Zip Code</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 15,
                  borderColor: '#e5e7eb',
                  backgroundColor: 'white',
                  color: '#1f2937',
                  flex: 1,
                }}
                value={address.zipCode}
                onChangeText={text => handleAddressChange('zipCode', text)}
                placeholder="e.g. 10001"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                onFocus={onInputFocus}
                editable={isEditing}
                selectTextOnFocus={false}
              />
            </View>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {[
              { label: 'Street 1', value: address.street1 },
              { label: 'Street 2', value: address.street2 },
              { label: 'Apt/Suite', value: address.aptNumber },
              { label: 'City', value: address.city },
              { label: 'State', value: address.state },
              { label: 'Country', value: address.country },
              { label: 'Zip Code', value: address.zipCode },
            ].map((field, idx) => (
              field.value ? (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Text style={{ width: 80, fontSize: 13, color: '#9CA3AF', fontWeight: '500', marginRight: 6 }}>{field.label}</Text>
                  <Text style={{ flex: 1, fontSize: 15, color: '#4b5563', fontWeight: '500' }}>{field.value}</Text>
                </View>
              ) : null
            ))}
            {!address.street1 && !address.street2 && !address.aptNumber && !address.city &&
              !address.state && !address.country && !address.zipCode && (
                <Text style={{ fontStyle: 'italic', color: '#9CA3AF', fontSize: 14 }}>No address provided</Text>
              )}
          </View>
        )}
      </View>
    </View>
  );
};

export default PersonalDetails;
