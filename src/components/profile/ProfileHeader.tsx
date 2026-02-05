/**
 * ProfileHeader - TypeScript Implementation
 * Header component for profile screen with edit/logout functionality
 */

import React from 'react';
import { View, Text, Image, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SoundTouchableOpacity from '../../core/components/SoundTouchableOpacity';
import { scaleSize } from '../../utils/scaleSize';
import { typography } from '../../theme/typography';

interface ProfileHeaderProps {
  isEditing: boolean;
  // isLoading: boolean; // Removed to decouple header from loading state
  goBack: () => void;
  toggleEdit: () => void;
  cancelEdit: () => void;
  handleLogout: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  isEditing,
  // isLoading,
  goBack,
  toggleEdit,
  cancelEdit,
  handleLogout,
}) => {
  const navigation = useNavigation();

  const handleSettingsPress = () => {
    try {
      // Navigate to Settings screen
      (navigation as any).navigate('Settings');
    } catch (error) {
      // Handle navigation error silently
      console.warn('Failed to navigate to Settings:', error);
    }
  };



  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 10, // Top padding handled by SafeScreenWrapper
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.2)',
        backgroundColor: 'transparent',
        zIndex: 10,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      }}
    >
      <SoundTouchableOpacity
        onPress={goBack}
        soundType="button"
        style={{
          padding: 4,
        }}
        activeOpacity={0.7}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <Image
          source={require('../../../assets/backIcon.png')}
          style={{ width: 36, height: 36 }}
          resizeMode="contain"
        />
      </SoundTouchableOpacity>

      <View style={{ flex: 1, alignItems: 'center', marginLeft: 40 }}>
        <View style={{ position: 'relative', alignItems: 'center' }}>
          {/* Blue border text - rendered 8 times around the white text */}
          {(() => {
            const strokeWidth = scaleSize(2);
            const fontSize = scaleSize(28);
            return [
              { x: -strokeWidth, y: -strokeWidth },
              { x: 0, y: -strokeWidth },
              { x: strokeWidth, y: -strokeWidth },
              { x: -strokeWidth, y: 0 },
              { x: strokeWidth, y: 0 },
              { x: -strokeWidth, y: strokeWidth },
              { x: 0, y: strokeWidth },
              { x: strokeWidth, y: strokeWidth },
            ].map((offset, index) => (
              <Text
                key={index}
                style={[
                  typography.h2,
                  {
                    position: 'absolute',
                    color: '#1E3A8A',
                    fontSize,
                    fontWeight: 'normal',
                    fontFamily:
                      Platform.OS === 'ios' ? 'LuckiestGuy-Regular' : 'LuckiestGuy-Regular',
                    textAlign: 'center',
                    left: offset.x,
                    top: offset.y,
                    includeFontPadding: false,
                  },
                ]}
              >
                PROFILE
              </Text>
            ));
          })()}
          {/* White text on top */}
          <Text
            style={[
              typography.h2,
              {
                fontSize: scaleSize(28),
                color: '#FFFFFF',
                fontWeight: 'normal',
                fontFamily: Platform.OS === 'ios' ? 'LuckiestGuy-Regular' : 'LuckiestGuy-Regular',
                textAlign: 'center',
                includeFontPadding: false,
                textShadowColor: '#000000',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 4,

              },
            ]}
          >
            PROFILE
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <SoundTouchableOpacity
          onPress={handleSettingsPress}
          soundType="button"
          // disabled={isLoading} // Always interactive
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
          }}
        >
          <Icon name="cog" size={18} color="#ffffff" />
        </SoundTouchableOpacity>
        <SoundTouchableOpacity
          onPress={handleLogout}
          soundType="button"
          // disabled={isLoading} // Always interactive
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
          }}
        >
          <Icon name="logout" size={18} color="#ffffff" />
        </SoundTouchableOpacity>
      </View>
    </View>
  );
};

export default ProfileHeader;
