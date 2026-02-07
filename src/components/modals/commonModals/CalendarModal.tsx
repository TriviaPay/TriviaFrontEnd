/**
 * CalendarModal - TypeScript Implementation
 * Modal for selecting date with calendar interface
 */

import React, { useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../hooks/useReduxHooks';

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  initialDate?: string;
}

const CalendarModal: React.FC<CalendarModalProps> = ({
  visible,
  onClose,
  onSelectDate,
  initialDate,
}) => {
  const { isDarkMode, colors } = useTheme();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (initialDate) {
      // Parse MM/DD/YYYY format
      const parts = initialDate.split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
      }
    }
    return new Date();
  });

  const handleDateSelect = () => {
    onSelectDate(selectedDate);
    onClose();
  };

  const formatDate = (date: Date): string => {
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  // Simple date picker implementation
  const generateDays = () => {
    const days = [];
    const today = new Date();
    const startDate = new Date(today.getFullYear() - 100, 0, 1); // 100 years ago
    const endDate = new Date(today.getFullYear() + 1, 11, 31); // Next year

    // For simplicity, we'll just show a basic date picker
    // In a real app, you'd use a proper calendar library
    return days;
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            marginHorizontal: 16,
            padding: 20,
            borderRadius: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
            backgroundColor: isDarkMode ? colors.cardBackground : 'white',
            maxHeight: '80%', // Ensure modal doesn't exceed screen height
            width: '90%', // Ensure modal has proper width
          }}
          onPress={e => e.stopPropagation()}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: 'bold',
              marginBottom: 20,
              textAlign: 'center',
              color: isDarkMode ? colors.text : '#1f2937',
            }}
          >
            Select Date
          </Text>

          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '500',
                marginBottom: 8,
                color: isDarkMode ? colors.text : '#1f2937',
              }}
            >
              Selected Date: {formatDate(selectedDate)}
            </Text>

            {/* Simple date input fields */}
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                marginBottom: 16,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '500',
                    marginBottom: 4,
                    color: isDarkMode ? colors.textSecondary : '#4b5563',
                  }}
                >
                  Month
                </Text>
                <TouchableOpacity
                  style={{
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 12,
                    borderColor: isDarkMode ? colors.border : '#e5e7eb',
                    backgroundColor: isDarkMode ? colors.inputBackground : 'white',
                  }}
                >
                  <Text style={{ color: isDarkMode ? colors.text : '#1f2937' }}>
                    {selectedDate.getMonth() + 1}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '500',
                    marginBottom: 4,
                    color: isDarkMode ? colors.textSecondary : '#4b5563',
                  }}
                >
                  Day
                </Text>
                <TouchableOpacity
                  style={{
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 12,
                    borderColor: isDarkMode ? colors.border : '#e5e7eb',
                    backgroundColor: isDarkMode ? colors.inputBackground : 'white',
                  }}
                >
                  <Text style={{ color: isDarkMode ? colors.text : '#1f2937' }}>
                    {selectedDate.getDate()}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '500',
                    marginBottom: 4,
                    color: isDarkMode ? colors.textSecondary : '#4b5563',
                  }}
                >
                  Year
                </Text>
                <TouchableOpacity
                  style={{
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 12,
                    borderColor: isDarkMode ? colors.border : '#e5e7eb',
                    backgroundColor: isDarkMode ? colors.inputBackground : 'white',
                  }}
                >
                  <Text style={{ color: isDarkMode ? colors.text : '#1f2937' }}>
                    {selectedDate.getFullYear()}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              marginTop: 'auto', // Push buttons to bottom
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: isDarkMode ? colors.border : '#e5e7eb',
            }}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
                backgroundColor: isDarkMode ? '#3D2A72' : '#f3f4f6',
              }}
              onPress={onClose}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: isDarkMode ? colors.text : '#4b5563',
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
                backgroundColor: isDarkMode ? colors.tabActive : '#6366f1',
              }}
              onPress={handleDateSelect}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: 'white',
                }}
              >
                Select Date
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default CalendarModal;
