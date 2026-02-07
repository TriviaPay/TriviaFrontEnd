import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SafeScreenWrapper from '../../../core/components/SafeScreenWrapper';

const { width } = Dimensions.get('window');

interface StoryViewerScreenProps { }

interface Story {
  id: number;
  userId: number;
  name: string;
  avatar: string;
  image: string;
  time: string;
  viewed: boolean;
  isAdd?: boolean;
}

interface StoryItem {
  id: number;
  image: string;
  timestamp: string;
}

const StoryViewerScreen: React.FC<StoryViewerScreenProps> = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { story } = route.params as { story: Story };

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [paused, setPaused] = useState<boolean>(false);
  const [liked, setLiked] = useState<boolean>(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef<Animated.CompositeAnimation | null>(null);

  // Dummy stories data (in a real app, this would come from the API)
  const stories: StoryItem[] = [
    {
      id: 1,
      image: story.image,
      timestamp: story.time,
    },
    {
      id: 2,
      image:
        'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2232&q=80',
      timestamp: '1h ago',
    },
  ];

  // Start progress animation
  const startProgressAnimation = () => {
    progressAnim.setValue(0);
    progressAnimation.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: 5000, // 5 seconds per story
      useNativeDriver: false,
    });

    progressAnimation.current.start(({ finished }) => {
      if (finished && !paused) {
        // Move to next story or close if last
        if (currentIndex < stories.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          navigation.goBack();
        }
      }
    });
  };

  // Handle press to navigate between stories
  const handlePress = (event: any) => {
    const { locationX } = event.nativeEvent;

    if (locationX < width * 0.3) {
      // Pressed left side, go to previous story
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else {
        navigation.goBack();
      }
    } else if (locationX > width * 0.7) {
      // Pressed right side, go to next story
      if (currentIndex < stories.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        navigation.goBack();
      }
    } else {
      // Pressed middle, pause/resume
      setPaused(!paused);
    }
  };

  // Handle long press to pause
  const handleLongPress = () => {
    setPaused(true);
  };

  // Handle release to resume
  const handlePressOut = () => {
    if (paused) {
      setPaused(false);
    }
  };

  // Reset and start animation when story changes or pause state changes
  useEffect(() => {
    if (progressAnimation.current) {
      progressAnimation.current.stop();
    }

    if (!paused) {
      startProgressAnimation();
    }

    return () => {
      if (progressAnimation.current) {
        progressAnimation.current.stop();
      }
    };
  }, [currentIndex, paused]);

  return (
    <SafeScreenWrapper
      statusBarStyle="light-content"
      backgroundColor="#1e90ff"
      edges={['top', 'bottom', 'left', 'right']}
    >
      {/* Progress bars */}
      <View style={styles.progressContainer}>
        {stories.map((_, index) => (
          <View key={index} style={styles.progressBar}>
            {index === currentIndex ? (
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            ) : index < currentIndex ? (
              <View style={styles.progressComplete} />
            ) : null}
          </View>
        ))}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Image source={{ uri: story.avatar }} style={styles.headerAvatar} />
          <Text style={styles.headerName}>{story.name}</Text>
          <Text style={styles.headerTime}>{stories[currentIndex].timestamp}</Text>
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Story content */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.storyContent}
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressOut={handlePressOut}
      >
        <Image
          source={{ uri: stories[currentIndex].image }}
          style={styles.storyImage}
          resizeMode="cover"
        />
      </TouchableOpacity>

      {/* Footer actions */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.actionButton} onPress={() => setLiked(!liked)}>
          <Icon
            name={liked ? 'heart' : 'heart-outline'}
            size={20}
            color={liked ? '#EF4444' : '#FFFFFF'}
          />
          <Text style={styles.actionButtonText}>Like</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Icon name="chat-outline" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Reply</Text>
        </TouchableOpacity>
      </View>
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    flexDirection: 'row',
    marginRight: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
  },
  container: {
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerAvatar: {
    borderRadius: 16,
    height: 32,
    width: 32,
  },
  headerInfo: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  headerName: {
    color: '#FFFFFF',
    fontWeight: '500',
    marginLeft: 8,
  },
  headerTime: {
    color: '#9CA3AF',
    fontSize: 12,
    marginLeft: 8,
  },
  progressBar: {
    backgroundColor: '#4B5563',
    borderRadius: 2,
    flex: 1,
    height: 4,
    marginHorizontal: 4,
    overflow: 'hidden',
  },
  progressComplete: {
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    height: '100%',
    width: '100%',
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  progressFill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  storyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  storyImage: {
    height: '100%',
    position: 'absolute',
    width: '100%',
  },
});

export default StoryViewerScreen;
