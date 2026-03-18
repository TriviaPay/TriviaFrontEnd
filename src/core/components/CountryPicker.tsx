import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
} from 'react-native';
import LottieView from 'lottie-react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import { fetchCountries as fetchCountriesAction } from '../../store/countrySlice';
import { getOptimizedFlatListProps } from '../../utils/flatListOptimization';

interface CountryPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (country: string) => void;
  selectedCountry?: string;
}

const CountryPicker: React.FC<CountryPickerProps> = React.memo(
  ({ visible, onClose, onSelect }) => {
    const dispatch = useDispatch();
    const [searchQuery, setSearchQuery] = useState('');

    // Consume countries from Redux state (pre-fetched by prefetchService)
    const { list: countries, loading, error: reduxError } = useSelector((state: any) => state.countries);
    const [localError, setLocalError] = useState<string | null>(null);

    const error = reduxError || localError;

    // Fetch countries if list is empty and component becomes visible
    // This is a fallback in case pre-fetch didn't complete or failed
    useEffect(() => {
      if (visible && countries.length === 0 && !loading) {
        dispatch(fetchCountriesAction() as any);
      }
    }, [visible, countries.length, loading, dispatch]);

    const handleSelect = useCallback(
      (country: string | any) => {
        // Handle both string and object formats if necessary, though list is currently any[]
        const countryName = typeof country === 'string' ? country : country.name || country;
        onSelect(countryName);
        onClose();
      },
      [onSelect, onClose]
    );

    const handleRetry = useCallback(() => {
      setLocalError(null);
      dispatch(fetchCountriesAction() as any);
    }, [dispatch]);

    const filteredCountries = useMemo(() => {
      if (!searchQuery.trim()) {
        return countries;
      }
      return countries.filter((country: any) =>
        country.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }, [searchQuery, countries]);

    const handleSearchChange = useCallback((text: string) => {
      setSearchQuery(text);
    }, []);

    const handleClearSearch = useCallback(() => {
      setSearchQuery('');
    }, []);

    // Always render Modal - let it handle visibility internally
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Select Country</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Icon name="magnify" size={20} color="#ffffff" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search countries"
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoCapitalize="none"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={handleClearSearch}>
                  <Icon name="close-circle" size={20} color="#6B7280" />
                </TouchableOpacity>
              ) : null}
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <LottieView
                  source={require('../../../assets/animations/LoadingBar.json')}
                  autoPlay
                  loop
                  style={{ width: 60, height: 60 }}
                />
                <Text style={styles.loadingText}>Loading countries...</Text>
              </View>
            ) : error ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{error}</Text>
                <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                key={`countries-${countries.length}`}
                data={filteredCountries as string[]}
                keyExtractor={(item: string) => item}
                extraData={countries.length}
                {...getOptimizedFlatListProps(50, {
                  initialNumToRender: 15,
                  maxToRenderPerBatch: 10,
                  windowSize: 21,
                  removeClippedSubviews: Platform.OS === 'android',
                  updateCellsBatchingPeriod: 50,
                })}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.countryItem} onPress={() => handleSelect(item)}>
                    <Text style={styles.countryText}>{item}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No countries found</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    );
  }
);

CountryPicker.displayName = 'CountryPicker';

const styles = StyleSheet.create({
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 8,
  },
  container: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#8b5cf6', // Purple background like reference images
    borderRadius: 12,
    overflow: 'hidden',
  },
  countryItem: {
    borderBottomColor: 'rgba(255,255,255,0.1)',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  countryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: 'rgba(255,255,255,0.2)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginTop: 12,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
    justifyContent: 'center',
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(187, 151, 245, 0.71)', // Lighter purple background like in image
    borderRadius: 18, // Rounded corners like in image
    marginHorizontal: 20, // Match the image width
    marginVertical: 8,
    height: 42, // Fixed height like in image
    width: '90%', // Specific width like in image
    alignSelf: 'center', // Center the search bar
  },
  searchIcon: {
    color: '#ffffff',
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
    backgroundColor: 'transparent', // Transparent background to match image
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 0, // Remove border to match image
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default CountryPicker;
