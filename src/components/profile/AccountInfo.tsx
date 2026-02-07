/**
 * AccountInfo - TypeScript Implementation
 * Account information component for profile screen
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import OtpInput from '../OtpInput';
import SoundTouchableOpacity from '../../core/components/SoundTouchableOpacity';

interface AccountInfoProps {
  accountNumber: string;
  account_id?: string | number;
  email: string;
  emailVerified: boolean;
  onCopyAccountNumber?: (accountNumber: string) => void;
}

const AccountInfo: React.FC<AccountInfoProps> = ({
  accountNumber,
  account_id,
  email,
  emailVerified,
  onCopyAccountNumber,
}) => {
  const [copiedAccount, setCopiedAccount] = useState(false);

  useEffect(() => {
    if (copiedAccount) {
      const timer = setTimeout(() => setCopiedAccount(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedAccount]);

  const handleCopyAccount = () => {
    require('react-native').Clipboard.setString(accountNumber);
    setCopiedAccount(true);
    if (onCopyAccountNumber) {
      onCopyAccountNumber(accountNumber);
    }
  };
  return (
    <View
      style={{
        marginBottom: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        padding: 20,
        backgroundColor: '#ffffff',
        borderWidth: 2,
        borderColor: '#FFD700',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 25,
        elevation: 15,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <View
          style={{
            width: 4,
            height: 24,
            borderRadius: 2,
            marginRight: 12,
            backgroundColor: '#3B82F6',
          }}
        />
        <Text
          style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: '#2563EB',
          }}
        >
          Account Information
        </Text>
      </View>

      {/* Account Number */}
      <View
        style={{
          marginBottom: 20,
          backgroundColor: 'rgba(59, 130, 246, 0.08)', // Light bluish
          padding: 12,
          borderRadius: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Icon name="card-account-details-outline" size={18} color="#3B82F6" />
          <Text
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              marginLeft: 8,
              color: '#1f2937',
            }}
          >
            Account Number / ID
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              fontSize: 16,
              marginLeft: 0,
              color: '#4b5563',
              flex: 1,
            }}
          >
            {accountNumber || account_id || 'N/A'}
          </Text>
          <SoundTouchableOpacity
            onPress={handleCopyAccount}
            style={{
              padding: 4,
            }}
          >
            <Icon
              name={copiedAccount ? 'check' : 'content-copy'}
              size={20}
              color="#3B82F6"
            />
          </SoundTouchableOpacity>
        </View>
      </View>

      {/* Email */}
      <View
        style={{
          marginBottom: 20,
          backgroundColor: 'rgba(59, 130, 246, 0.08)', // Light bluish
          padding: 12,
          borderRadius: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Icon name="email-outline" size={18} color="#3B82F6" />
          <Text
            style={{
              fontSize: 16,
              fontWeight: 'bold',
              marginLeft: 8,
              color: '#1f2937',
            }}
          >
            Email
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginLeft: 0,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                color: '#4b5563',
              }}
            >
              {email}
            </Text>
          </View>
          {emailVerified && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#dcfce7',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 20,
              }}
            >
              <Icon name="shield-check" size={14} color="#10B981" />
              <Text
                style={{
                  fontSize: 14,
                  color: '#16a34a',
                  marginLeft: 4,
                  fontWeight: '500',
                }}
              >
                Verified
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default AccountInfo;
