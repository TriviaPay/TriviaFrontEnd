/**
 * MessageAlignmentService - Single Responsibility Principle (SRP)
 * Handles ALL alignment logic - determines if message is from current user
 * This service is the single source of truth for message alignment
 */

export interface ChatMessage {
  id: number;
  username: string;
  message: string;
  avatar?: string;
  profile_pic?: string;
  avatar_url?: string | null;
  frame_url?: string | null;
  badge?: {
    image_url?: string;
    name?: string;
  } | null;
  isHost?: boolean;
  isWinner?: boolean;
  winnerPosition?: number;
  likes?: number;
  created_at: string;
  user_id?: string;
  isOptimistic?: boolean;
  isOwn?: boolean;
  status?: 'sent' | 'delivered' | 'read';
  is_typing?: boolean;
  online?: boolean;
  last_seen?: string;
}

export class MessageAlignmentService {
  /**
   * Determines if a message belongs to the current user
   * @param message - The chat message
   * @param currentUserId - Current user's ID (string or number)
   * @returns true if message is from current user (aligns RIGHT), false otherwise (aligns LEFT)
   */
  static isOwnMessage(message: ChatMessage, currentUserId: string | null): boolean {
    // Priority 1: Explicit isOwn flag (most reliable)
    if (message.isOwn === true) return true;
    if (message.isOwn === false) return false;

    // Priority 2: Optimistic messages are always own
    if (message.isOptimistic) return true;

    // Priority 3: User ID comparison (handles string/number mismatches)
    if (currentUserId && message.user_id && message.user_id !== '') {
      // Convert both to numbers for reliable comparison
      const currentUserIdNum =
        typeof currentUserId === 'string'
          ? parseInt(currentUserId, 10)
          : typeof currentUserId === 'number'
            ? currentUserId
            : null;
      const messageUserIdNum =
        typeof message.user_id === 'string'
          ? parseInt(message.user_id, 10)
          : typeof message.user_id === 'number'
            ? message.user_id
            : null;

      if (
        currentUserIdNum !== null &&
        messageUserIdNum !== null &&
        !isNaN(currentUserIdNum) &&
        !isNaN(messageUserIdNum)
      ) {
        return currentUserIdNum === messageUserIdNum;
      }

      // Fallback to string comparison
      return String(message.user_id).trim() === String(currentUserId).trim();
    }

    return false;
  }

  /**
   * Gets alignment configuration for message container
   * @param isOwn - Whether message is from current user
   * @returns Alignment configuration object - EXACTLY matches global chat
   */
  static getContainerAlignment(isOwn: boolean) {
    // CRITICAL: Match global chat exactly - use alignItems (not justifyContent)
    // Global chat uses: alignItems: 'flex-end' for own, 'flex-start' for others
    return {
      alignItems: isOwn ? ('flex-end' as const) : ('flex-start' as const),
    };
  }
}
