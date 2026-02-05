/**
 * PendingInvitesList Component
 * Displays list of pending group invitations
 * Single Responsibility: Pending invites rendering
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import OptimizedImage from '../OptimizedImage';
import SoundTouchableOpacity from '../../core/components/SoundTouchableOpacity'; // Fixed import path

interface PendingInvite {
  id: number;
  name: string;
  avatar?: string;
  status: 'pending' | 'accepted' | 'declined';
}

interface PendingInvitesListProps {
  pendingInvites: PendingInvite[];
  onInviteResponse: (inviteId: number, accept: boolean) => void;
  styles?: any;
}

export const PendingInvitesList: React.FC<PendingInvitesListProps> = memo(({
  pendingInvites,
  onInviteResponse,
  styles,
}) => {
  // CRITICAL: Validate array before .filter()
  const pendingOnly = Array.isArray(pendingInvites)
    ? pendingInvites.filter((invite) => invite && invite.status === 'pending')
    : [];

  if (pendingOnly.length === 0) return null;

  const componentStyles = styles || defaultStyles;

  return (
    <View style={componentStyles.pendingInvitesContainer}>
      <Text style={componentStyles.pendingInvitesTitle}>
        Group Invitations
      </Text>

      {pendingOnly.map((invite) => {
        if (!invite || !invite.id) return null;
        return (
          <View key={invite.id} style={componentStyles.inviteItem}>
            <View style={componentStyles.inviteUserInfo}>
              {invite.avatar && typeof invite.avatar === 'string' ? (
                <OptimizedImage source={{ uri: invite.avatar }} style={componentStyles.inviteAvatar} />
              ) : (
                <View style={[componentStyles.inviteAvatar, { backgroundColor: '#9333EA', alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' }}>
                    {invite.name ? invite.name.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              )}
              <Text style={componentStyles.inviteUserName}>{invite.name}</Text>
            </View>

            <View style={componentStyles.inviteButtons}>
              <SoundTouchableOpacity
                style={componentStyles.acceptButton}
                onPress={() => onInviteResponse(invite.id, true)}
              >
                <Text style={componentStyles.acceptButtonText}>Accept</Text>
              </SoundTouchableOpacity>

              <SoundTouchableOpacity
                style={componentStyles.declineButton}
                onPress={() => onInviteResponse(invite.id, false)}
              >
                <Text style={componentStyles.declineButtonText}>Decline</Text>
              </SoundTouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
});

PendingInvitesList.displayName = 'PendingInvitesList';

const defaultStyles = StyleSheet.create({
  pendingInvitesContainer: {
    padding: 16,
    backgroundColor: '#40444B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  pendingInvitesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  inviteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  inviteUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  inviteAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  inviteUserName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  inviteButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#9333EA',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  declineButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#D1D5DB',
  },
  declineButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PendingInvitesList;
