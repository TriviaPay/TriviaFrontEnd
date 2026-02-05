import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

interface ExistingUserPopupProps {
  visible: boolean;
  onClose: () => void;
  onLogin: () => void;
  onForgotPassword: () => void;
  identifier: string;
  identifierType: 'email' | 'username';
}

const ExistingUserPopup: React.FC<ExistingUserPopupProps> = ({
  visible,
  onClose,
  onLogin,
  onForgotPassword,
  identifier,
  identifierType,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Icon name="user-check" size={24} color="#6c5ce7" />
            <Text style={styles.title}>Account Found</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.message}>
              An account with this {identifierType} already exists.
            </Text>
            <Text style={styles.identifier}>{identifier}</Text>
            <Text style={styles.question}>Would you like to sign in instead?</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotButton} onPress={onForgotPassword}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginButton} onPress={onLogin}>
              <Text style={styles.loginText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  buttonContainer: {
    gap: 12,
    padding: 20,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
  },
  cancelText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 20,
  },
  forgotButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 12,
  },
  forgotText: {
    color: '#6c5ce7',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    borderBottomColor: 'rgba(255,255,255,0.1)',
    borderBottomWidth: 1,
    padding: 20,
  },
  identifier: {
    color: '#6c5ce7',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  loginButton: {
    backgroundColor: '#6c5ce7',
    borderRadius: 8,
    paddingVertical: 12,
  },
  loginText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  modal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    elevation: 8,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    width: width * 0.9,
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
    justifyContent: 'center',
  },
  question: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
});

export default ExistingUserPopup;
