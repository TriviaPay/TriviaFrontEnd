import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme, useSound } from '../../../hooks/useReduxHooks';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface VolumeSliderProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  iconName: string;
  disabled?: boolean;
  type?: 'sound' | 'music';
}

export const VolumeSlider = ({
  label,
  value,
  onValueChange,
  iconName,
  disabled = false,
  type = 'sound',
}: VolumeSliderProps): JSX.Element => {
  const { colors } = useTheme();
  const { playSound, soundEnabled } = useSound();

  const handleVolumeChange = (increment: boolean): void => {
    const step = 0.1;
    let newValue = value + (increment ? step : -step);
    newValue = Math.max(0, Math.min(1, newValue));
    onValueChange(newValue);

    // CRITICAL: Wrap audio in try-catch to prevent crashes
    if (soundEnabled && type === 'sound' && playSound && typeof playSound === 'function') {
      try {
        setTimeout(() => {
          try {
            playSound('click');
          } catch (audioError) {
            // Silent fail - audio is optional
          }
        }, 100);
      } catch (error) {
        // Silent fail - audio is optional
      }
    }
  };

  const getVolumePercentage = (): number => Math.round(value * 100);

  return (
    <View style={{ backgroundColor: colors.cardBackground }} className="rounded-xl p-4 mb-3">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Icon
            name={iconName}
            size={20}
            color={disabled ? colors.textSecondary : colors.text}
            style={{ marginRight: 8 }}
          />
          <Text
            style={{ color: disabled ? colors.textSecondary : colors.text }}
            className="font-medium"
          >
            {label}
          </Text>
        </View>
        <Text style={{ color: colors.textSecondary }} className="text-sm">
          {getVolumePercentage()}%
        </Text>
      </View>

      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => handleVolumeChange(false)}
          disabled={disabled || value <= 0}
          className={`w-10 h-10 rounded-full items-center justify-center ${
            disabled || value <= 0 ? 'bg-gray-300' : 'bg-red-500'
          }`}
          activeOpacity={0.7}
        >
          <Icon name="minus" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View className="flex-1 mx-4">
          <View style={{ backgroundColor: colors.border }} className="h-2 rounded-full">
            <View
              className="h-2 rounded-full bg-blue-500"
              style={{ width: `${getVolumePercentage()}%` }}
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={() => handleVolumeChange(true)}
          disabled={disabled || value >= 1}
          className={`w-10 h-10 rounded-full items-center justify-center ${
            disabled || value >= 1 ? 'bg-gray-300' : 'bg-green-500'
          }`}
          activeOpacity={0.7}
        >
          <Icon name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
