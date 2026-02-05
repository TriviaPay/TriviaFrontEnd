import { View, Text, TouchableOpacity, Animated, Dimensions, Image } from 'react-native';
import { useTooltipAnimations } from '../../../hooks/Trivia/useAnimations';
import { useTheme } from '../../../hooks/useReduxHooks';
import { useButtonAnimation } from '../../../hooks/Home/useButtonAnimation';
import { scaleSize } from '../../../utils/scaleSize';
import { typography } from '../../../theme/typography';
import SoundTouchableOpacity from '../../../core/components/SoundTouchableOpacity';

const { width } = Dimensions.get('window');

interface TooltipProps {
  isVisible: boolean;
  onClose: () => void;
  anchorPosition: { x: number; y: number };
}

const Tooltip = ({ isVisible, onClose, anchorPosition }: TooltipProps): JSX.Element | null => {
  const { isDarkMode, colors } = useTheme();
  const { scaleAnim } = useTooltipAnimations(isVisible); // Only use scaleAnim, ignore fadeAnim
  const closeButtonAnimation = useButtonAnimation();

  if (!isVisible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: anchorPosition.y + scaleSize(30),
        right: scaleSize(20),
        zIndex: 1000, // Higher than background overlay (999) to appear above it
        elevation: 1000, // Android elevation
      }}
    >
      <Animated.View
        style={{
          opacity: 1,
          transform: [{ scale: scaleAnim }],
          maxWidth: width * 0.9,
          minWidth: width * 0.7,
          backgroundColor: isDarkMode ? colors.cardBackground : 'white',
          borderRadius: scaleSize(16),
          padding: scaleSize(16),
          shadowColor: '#000',
          shadowOffset: { width: 0, height: scaleSize(2) },
          shadowOpacity: 0.1,
          shadowRadius: scaleSize(4),
          elevation: 3,
          borderWidth: scaleSize(2),
          borderColor: '#FFD700',
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {/* Tooltip Arrow */}
        <View
          style={{
            position: 'absolute',
            width: scaleSize(16),
            height: scaleSize(16),
            backgroundColor: isDarkMode ? colors.cardBackground : 'white',
            transform: [{ rotate: '45deg' }],
            top: scaleSize(-8),
            right: scaleSize(15),
            borderTopWidth: scaleSize(2),
            borderLeftWidth: scaleSize(2),
            borderColor: '#FFD700', // Gold border for arrow
          }}
        />

        {/* Tooltip Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: scaleSize(8),
          }}
        >
          <Text
            style={{
              fontSize: scaleSize(18),
              fontWeight: 'bold',
              color: isDarkMode ? colors.text : '#1f2937',
            }}
          >
            How It Works
          </Text>
          <Animated.View style={closeButtonAnimation.animatedStyle}>
            <SoundTouchableOpacity
              onPress={onClose}
              onPressIn={closeButtonAnimation.animatePress}
              onPressOut={closeButtonAnimation.animateRelease}
              activeOpacity={1}
              style={{
                padding: scaleSize(4),
              }}
            >
              <Image
                source={require('../../../../assets/closeIcon.png')}
                style={{
                  width: scaleSize(24),
                  height: scaleSize(24),
                }}
                resizeMode="contain"
              />
            </SoundTouchableOpacity>
          </Animated.View>
        </View>

        {/* Tooltip Content */}
        <View style={{ marginTop: scaleSize(4) }}>
          {[
            'One trivia question per day',
            'Correct answer enters prize pool',
            'One attempt per day',
            '50-50: Remove two incorrect answer options (50 gems)',
            'Hint: Get a hint for the current question (30 gems)',
            'Change: Change to a different question (10 gems, max 3 per day)',
            'Auto: Automatically submit the correct answer (300 gems)',
            'Extra Chance: Reset a question for a fresh attempt after wrong answer (150 gems)',
          ].map((item, index) => (
            <View key={index} style={{ flexDirection: 'row', marginBottom: scaleSize(6) }}>
              <Text
                style={[
                  typography.bodySmall,
                  {
                    color: isDarkMode ? colors.textSecondary : '#4b5563',
                    width: scaleSize(12),
                  },
                ]}
              >
                •
              </Text>
              <Text
                style={[
                  typography.bodySmall,
                  {
                    color: isDarkMode ? colors.textSecondary : '#4b5563',
                    flex: 1,
                    marginLeft: scaleSize(4),
                  },
                ]}
              >
                {item}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

export default Tooltip;
