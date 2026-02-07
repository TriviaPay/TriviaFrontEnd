import { useSoundEffects } from '../../hooks/use-sound-effects';
import { logger } from '../utils/logger';

class NotificationManager {
  static instance = null;
  soundEffects = null;

  static getInstance() {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  setSoundEffects(soundEffects) {
    this.soundEffects = soundEffects;
  }

  // Notification types
  NOTIFICATION_TYPES = {
    CHAT_MESSAGE: 'chat_message',
    TRIVIA_RESULT: 'trivia_result',
    WINNER_ANNOUNCEMENT: 'winner_announcement',
    SYSTEM_ALERT: 'system_alert',
    ACHIEVEMENT: 'achievement',
    FRIEND_REQUEST: 'friend_request',
    GAME_INVITATION: 'game_invitation',
  };

  // Play notification sound based on type
  playNotification(type, options = {}) {
    if (!this.soundEffects || !this.soundEffects.canPlaySounds) {
      return;
    }

    switch (type) {
      case this.NOTIFICATION_TYPES.CHAT_MESSAGE:
        this.soundEffects.playMessage();
        break;
      case this.NOTIFICATION_TYPES.TRIVIA_RESULT:
        this.soundEffects.playNotificationSound();
        break;
      case this.NOTIFICATION_TYPES.WINNER_ANNOUNCEMENT:
        this.soundEffects.playWin();
        break;
      case this.NOTIFICATION_TYPES.SYSTEM_ALERT:
        this.soundEffects.playNotificationSound();
        break;
      case this.NOTIFICATION_TYPES.ACHIEVEMENT:
        this.soundEffects.playSuccess();
        break;
      case this.NOTIFICATION_TYPES.FRIEND_REQUEST:
        this.soundEffects.playNotificationSound();
        break;
      case this.NOTIFICATION_TYPES.GAME_INVITATION:
        this.soundEffects.playNotificationSound();
        break;
      default:
        this.soundEffects.playNotificationSound();
        break;
    }
  }

  // Show notification with sound
  showNotification(title, message, type = this.NOTIFICATION_TYPES.SYSTEM_ALERT, options = {}) {
    // Play notification sound
    this.playNotification(type, options);

    // In a real app, you would integrate with react-native-push-notification
    // or similar library for actual push notifications
    logger.log(`🔔 Notification: ${title} - ${message}`, 'NOTIFICATIONS');

    // For demo purposes, you could show an in-app notification UI here
    if (options.showInApp) {
      this.showInAppNotification(title, message, type);
    }
  }

  // Show in-app notification (for when user is actively using the app)
  showInAppNotification(title, message, type) {
    // This would typically trigger a toast, banner, or modal
    // For now, we'll just play the sound and log
    logger.log(`📱 In-App Notification: ${title} - ${message}`, 'NOTIFICATIONS');
  }

  // Specific notification methods for common use cases
  notifyNewMessage(senderName, messagePreview) {
    this.showNotification(
      `New message from ${senderName}`,
      messagePreview,
      this.NOTIFICATION_TYPES.CHAT_MESSAGE,
      { showInApp: true }
    );
  }

  notifyTriviaResult(isCorrect, message) {
    this.showNotification(
      isCorrect ? 'Correct Answer!' : 'Wrong Answer',
      message,
      this.NOTIFICATION_TYPES.TRIVIA_RESULT,
      { showInApp: true }
    );
  }

  notifyWinnerAnnouncement(position, prize) {
    this.showNotification(
      `🏆 Congratulations!`,
      `You placed ${position} and won ${prize}!`,
      this.NOTIFICATION_TYPES.WINNER_ANNOUNCEMENT,
      { showInApp: true }
    );
  }

  notifySystemAlert(title, message) {
    this.showNotification(title, message, this.NOTIFICATION_TYPES.SYSTEM_ALERT, {
      showInApp: true,
    });
  }

  notifyAchievement(achievementName, description) {
    this.showNotification(
      `🎉 Achievement Unlocked!`,
      `${achievementName}: ${description}`,
      this.NOTIFICATION_TYPES.ACHIEVEMENT,
      { showInApp: true }
    );
  }

  notifyFriendRequest(friendName) {
    this.showNotification(
      `Friend Request`,
      `${friendName} wants to be your friend`,
      this.NOTIFICATION_TYPES.FRIEND_REQUEST,
      { showInApp: true }
    );
  }

  notifyGameInvitation(inviterName, gameType) {
    this.showNotification(
      `Game Invitation`,
      `${inviterName} invited you to play ${gameType}`,
      this.NOTIFICATION_TYPES.GAME_INVITATION,
      { showInApp: true }
    );
  }
}

export default NotificationManager.getInstance();
