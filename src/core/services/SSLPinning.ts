export const getPublicKeyPinning = (): string => {
    // Placeholder implementation – replace with real SSL pinning logic using react-native-ssl-pinning
    if (__DEV__) {
        return '';
    }
    // In production you would return a header value containing the pinned public key or certificate hash
    return 'pinned-public-key-placeholder';
};
