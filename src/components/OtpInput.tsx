import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

interface OtpInputProps {
  length?: number;
  onComplete: (code: string) => void;
  onResend?: () => void;
  error?: string;
  disabled?: boolean;
  resendCountdown?: number;
  email?: string;
  style?: any;
  variant?: 'default' | 'profile'; // 'default' for white (signup), 'profile' for dark
}

const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  onComplete,
  onResend,
  error,
  disabled = false,
  resendCountdown = 0,
  email,
  style,
  variant = 'default',
}) => {
  const [otp, setOtp] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRefs = useRef<TextInput[]>([]);
  const hasCompleted = useRef(false);

  useEffect(() => {
    if (otp.length === length && !hasCompleted.current) {
      hasCompleted.current = true;
      onComplete(otp);
    }
  }, [otp, length, onComplete]);

  const handleChangeText = (text: string, index: number) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, '');

    if (numericText.length <= 1) {
      const newOtp = otp.split('');
      newOtp[index] = numericText;
      const updatedOtp = newOtp.join('');
      setOtp(updatedOtp);

      // Reset completion flag when OTP changes
      hasCompleted.current = false;

      // Move to next input if current is filled
      if (numericText && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
        setActiveIndex(index + 1);
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      // Move to previous input on backspace
      inputRefs.current[index - 1]?.focus();
      setActiveIndex(index - 1);
    }
  };

  const handleFocus = (index: number) => {
    setActiveIndex(index);
  };

  const handleResendPress = () => {
    if (resendCountdown > 0) return;
    if (onResend) {
      onResend();
    }
  };

  // Reset OTP when there's an error
  useEffect(() => {
    if (error) {
      setOtp('');
      hasCompleted.current = false;
      setActiveIndex(0);
      inputRefs.current[0]?.focus();
    }
  }, [error]);

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, variant === 'profile' && styles.titleProfile]}>
        Enter Verification Code
      </Text>
      {email && (
        <Text style={[styles.subtitle, variant === 'profile' && styles.subtitleProfile]}>
          We sent a code to {email}
        </Text>
      )}

      <View style={styles.inputContainer}>
        {Array.from({ length }, (_, index) => (
          <TextInput
            key={index}
            ref={ref => {
              if (ref) inputRefs.current[index] = ref;
            }}
            style={[
              styles.input,
              variant === 'profile' && styles.inputProfile,
              activeIndex === index &&
                (variant === 'profile' ? styles.activeInputProfile : styles.activeInput),
              error && styles.errorInput,
            ]}
            value={otp[index] || ''}
            onChangeText={text => handleChangeText(text, index)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
            onFocus={() => handleFocus(index)}
            keyboardType="numeric"
            maxLength={1}
            editable={!disabled}
            selectTextOnFocus
            autoFocus={index === 0}
          />
        ))}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {onResend && (
        <TouchableOpacity
          onPress={handleResendPress}
          disabled={resendCountdown > 0 || disabled}
          style={[styles.resendButton, (resendCountdown > 0 || disabled) && styles.disabledButton]}
        >
          <Text
            style={[
              styles.resendText,
              variant === 'profile' && styles.resendTextProfile,
              (resendCountdown > 0 || disabled) &&
                (variant === 'profile' ? styles.disabledTextProfile : styles.disabledText),
            ]}
          >
            {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Code'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  activeInput: {
    backgroundColor: 'rgba(255,107,53,0.1)',
    borderColor: '#FF6B35',
  },
  activeInputProfile: {
    backgroundColor: '#ede9fe',
    borderColor: '#7B68EE',
  },
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: 'rgba(255,255,255,0.5)',
  },
  disabledTextProfile: {
    color: '#9ca3af',
  },
  errorInput: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    borderWidth: 2,
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    height: 45,
    textAlign: 'center',
    width: 45,
  },
  inputContainer: {
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    maxWidth: 300,
    width: '100%',
  },
  inputProfile: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
    color: '#1f2937',
  },
  resendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resendText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  resendTextProfile: {
    color: '#7B68EE',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  subtitleProfile: {
    color: '#6b7280',
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  titleProfile: {
    color: '#1f2937',
  },
});

export default OtpInput;
