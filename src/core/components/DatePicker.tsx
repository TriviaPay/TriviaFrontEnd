import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface DatePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  selectedDate?: string;
}

// Parse date string safely - handles YYYY-MM-DD format
const parseDate = (dateStr?: string): Date => {
  if (!dateStr) return new Date();
  try {
    // Handle YYYY-MM-DD format
    if (dateStr.includes('-') && dateStr.length === 10) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(dateStr);
  } catch (error) {
    logger.warn('DatePicker: Failed to parse date:', 'APP', dateStr, error);
    return new Date();
  }
};

const DatePicker: React.FC<DatePickerProps> = React.memo(
  ({ visible, onClose, onSelect, selectedDate }) => {
    const initialDate = useMemo(() => parseDate(selectedDate), [selectedDate]);
    const [currentDate, setCurrentDate] = useState(initialDate);
    const [selectedDay, setSelectedDay] = useState(initialDate.getDate());
    const [showYearPicker, setShowYearPicker] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);

    // Calendar logic
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const navigateMonth = useCallback(
      (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (direction === 'prev') {
          newDate.setMonth(currentMonth - 1);
        } else {
          newDate.setMonth(currentMonth + 1);
        }
        setCurrentDate(newDate);
      },
      [currentDate, currentMonth]
    );

    const navigateYear = useCallback(
      (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (direction === 'prev') {
          newDate.setFullYear(currentYear - 1);
        } else {
          newDate.setFullYear(currentYear + 1);
        }
        setCurrentDate(newDate);
      },
      [currentDate, currentYear]
    );

    const selectYear = useCallback(
      (year: number) => {
        const newDate = new Date(currentDate);
        newDate.setFullYear(year);
        setCurrentDate(newDate);
        setShowYearPicker(false);
      },
      [currentDate]
    );

    const selectMonth = useCallback(
      (month: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(month);
        setCurrentDate(newDate);
        setShowMonthPicker(false);
      },
      [currentDate]
    );

    const getDaysInMonth = (year: number, month: number) => {
      return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
      return new Date(year, month, 1).getDay();
    };

    const generateCalendarDays = () => {
      const daysInMonth = getDaysInMonth(currentYear, currentMonth);
      const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
      const days = [];

      // Add empty cells for days before the first day of the month
      for (let i = 0; i < firstDay; i++) {
        days.push(null);
      }

      // Add days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        days.push(day);
      }

      return days;
    };

    const handleDaySelect = useCallback((day: number) => {
      setSelectedDay(day);
    }, []);

    const handleConfirm = useCallback(() => {
      // Create date in local timezone to avoid timezone issues
      const selectedDate = new Date(currentYear, currentMonth, selectedDay);

      // Format date as YYYY-MM-DD without timezone conversion
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      onSelect(formattedDate);
      onClose();
    }, [currentYear, currentMonth, selectedDay, onSelect, onClose]);

    const calendarDays = generateCalendarDays();

    // Update currentDate when selectedDate prop changes
    useEffect(() => {
      if (selectedDate) {
        const parsedDate = parseDate(selectedDate);
        setCurrentDate(parsedDate);
        setSelectedDay(parsedDate.getDate());
      }
    }, [selectedDate]);

    // Always render Modal - let it handle visibility internally
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
        statusBarTranslucent={true}
        presentationStyle="overFullScreen"
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
          <View
            style={styles.container}
            onStartShouldSetResponder={() => true}
            onResponderTerminationRequest={() => false}
          >
            {/* Month/Year Navigation Header - Only show when no picker is open */}
            {!showMonthPicker && !showYearPicker && (
              <View style={styles.header}>
                <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navButton}>
                  <Icon name="chevron-left" size={24} color="#ffffff" />
                </TouchableOpacity>
                <View style={styles.monthYearContainer}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowMonthPicker(true);
                      setShowYearPicker(false);
                    }}
                    style={styles.monthYearButton}
                  >
                    <Text style={styles.monthYear}>{monthNames[currentMonth]}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setShowYearPicker(true);
                      setShowMonthPicker(false);
                    }}
                    style={styles.monthYearButton}
                  >
                    <Text style={styles.monthYear}>{currentYear}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navButton}>
                  <Icon name="chevron-right" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
            )}

            {/* Month Picker */}
            {showMonthPicker && (
              <ScrollView style={styles.pickerContainer} showsVerticalScrollIndicator={true}>
                <Text style={styles.pickerTitle}>Select Month</Text>
                <View style={styles.monthGrid}>
                  {monthNames.map((month, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.monthButton,
                        index === currentMonth && styles.selectedMonthButton,
                      ]}
                      onPress={() => selectMonth(index)}
                    >
                      <Text
                        style={[
                          styles.monthButtonText,
                          index === currentMonth && styles.selectedMonthButtonText,
                        ]}
                        numberOfLines={2}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.8}
                      >
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}

            {/* Year Picker */}
            {showYearPicker && (
              <ScrollView style={styles.pickerContainer} showsVerticalScrollIndicator={true}>
                <Text style={styles.pickerTitle}>Select Year</Text>
                <View style={styles.yearGrid}>
                  {Array.from({ length: 51 }, (_, i) => 1975 + i).map(year => (
                    <TouchableOpacity
                      key={year}
                      style={[styles.yearButton, year === currentYear && styles.selectedYearButton]}
                      onPress={() => selectYear(year)}
                    >
                      <Text
                        style={[
                          styles.yearButtonText,
                          year === currentYear && styles.selectedYearButtonText,
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}

            {/* Select Day Title - Only show when no picker is open */}
            {!showMonthPicker && !showYearPicker && (
              <Text style={styles.selectDayTitle}>Select Day</Text>
            )}

            {/* Calendar Grid - Only show when no picker is open */}
            {!showMonthPicker && !showYearPicker && (
              <View style={styles.calendarGrid}>
                {calendarDays.map((day, index) => (
                  <View key={index} style={styles.dayCellContainer}>
                    {day ? (
                      <TouchableOpacity
                        style={[styles.dayCell, day === selectedDay && styles.selectedDay]}
                        onPress={() => handleDaySelect(day)}
                      >
                        <Text
                          style={[styles.dayText, day === selectedDay && styles.selectedDayText]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.emptyDayCell} />
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmText}>Select</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }
);

DatePicker.displayName = 'DatePicker';

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.1)', // Add subtle background to separate from content
    marginTop: 'auto', // Push buttons to bottom
    // Removed borderTopWidth and borderTopColor to remove the line
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 8,
    justifyContent: 'flex-start', // Left align all rows like first row
    alignItems: 'flex-start',
    flex: 1, // Allow calendar to take available space
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginRight: 8,
    paddingVertical: 12,
  },
  cancelText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    paddingVertical: 12,
  },
  confirmText: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  container: {
    width: '90%',
    maxHeight: '80%', // Use maxHeight instead of fixed height
    minHeight: '60%', // Ensure minimum height
    backgroundColor: '#8b5cf6', // Purple background like your image
    borderRadius: 12,
    overflow: 'hidden',
    // Removed flex: 1 to prevent layout issues
  },
  dayCell: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)', // Background only for numbers
    borderRadius: 8,
  },
  dayCellContainer: {
    width: '13%', // Slightly smaller to allow for spacing
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
    marginHorizontal: 2, // Add horizontal spacing between numbers
  },
  dayText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyDayCell: {
    height: '100%',
    width: '100%',
    // No background for empty spaces
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
    justifyContent: 'center',
  },
  monthButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    justifyContent: 'center',
    marginVertical: 4,
    minHeight: 44,
    paddingHorizontal: 4,
    paddingVertical: 12,
    width: '30%',
  },
  monthButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  monthYear: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  monthYearButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    marginHorizontal: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  monthYearContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  navButton: {
    padding: 8,
  },
  pickerContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    marginBottom: 8,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  selectDayTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 16,
    textAlign: 'center',
  },
  selectedDay: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  selectedDayText: {
    color: '#8b5cf6',
    fontWeight: 'bold',
  },
  selectedMonthButton: {
    backgroundColor: '#ffffff',
  },
  selectedMonthButtonText: {
    color: '#8b5cf6',
    fontWeight: 'bold',
  },
  selectedYearButton: {
    backgroundColor: '#ffffff',
  },
  selectedYearButtonText: {
    color: '#8b5cf6',
    fontWeight: 'bold',
  },
  yearButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    marginVertical: 4,
    paddingHorizontal: 8,
    paddingVertical: 12,
    width: '30%',
  },
  yearButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
});

export default DatePicker;
