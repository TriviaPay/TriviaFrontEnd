import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { scaleSize } from '../../utils/scaleSize';
import { getVerticalSpacing, getHorizontalSpacing } from '../../theme/spacing';
import { useTheme } from '../../hooks/useReduxHooks';

interface EmptyStateProps {
    title?: string;
    message?: string;
    icon?: string;
    actionLabel?: string;
    onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
    title = 'No Data Found',
    message = "We couldn't find what you were looking for.",
    icon = 'database-off-outline',
    actionLabel,
    onAction,
}) => {
    const theme = useTheme();
    const colors = theme?.colors || { textSecondary: '#6b7280', text: '#1f2937', primary: '#6c5ce7' };

    return (
        <View style={styles.container}>
            <Icon name={icon} size={scaleSize(64)} color={colors.textSecondary} style={styles.icon} />
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
            {actionLabel && onAction && (
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary }]}
                    onPress={onAction}
                    activeOpacity={0.8}
                >
                    <Text style={styles.buttonText}>{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: scaleSize(8),
        marginTop: getVerticalSpacing(24),
        paddingHorizontal: getHorizontalSpacing(24),
        paddingVertical: getVerticalSpacing(12),
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: scaleSize(16),
        fontWeight: 'bold',
    },
    container: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        padding: getHorizontalSpacing(20),
    },
    icon: {
        marginBottom: getVerticalSpacing(16),
    },
    message: {
        fontSize: scaleSize(14),
        lineHeight: scaleSize(20),
        textAlign: 'center',
    },
    title: {
        fontSize: scaleSize(18),
        fontWeight: 'bold',
        marginBottom: getVerticalSpacing(8),
        textAlign: 'center',
    },
});

export default EmptyState;
