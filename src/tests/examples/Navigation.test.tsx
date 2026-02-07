import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AppNavigator from '../../navigation/AppNavigator';
import { Providers } from '../../app/Providers';

// Mock navigation completely for integration testing
jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({
        navigate: jest.fn(),
        goBack: jest.fn(),
        setOptions: jest.fn(),
        addListener: jest.fn(() => jest.fn()),
        isFocused: jest.fn(() => true),
    }),
    useRoute: () => ({
        params: {},
        name: 'Home',
    }),
    useIsFocused: () => true,
    useFocusEffect: (callback: any) => callback(),
}));

describe('App Navigation', () => {
    it('renders the initial route and can navigate between tabs', async () => {
        const { findByTestId, queryAllByRole } = render(
            <Providers>
                <AppNavigator />
            </Providers>
        );

        // Initial screen should be Home
        const homeStack = await findByTestId('StackScreen_UpdatesScreen');
        expect(homeStack).toBeTruthy();

        // Get all tab buttons
        const buttons = queryAllByRole('button');

        // Find and press the Chats tab
        const chatTab = buttons.find(btn => (btn.props as any).accessibilityLabel === 'Chats');
        if (!chatTab) throw new Error('Chats tab not found');

        fireEvent.press(chatTab);

        // Verify that the navigation triggered the Chats list rendering
        const chatsList = await findByTestId('StackScreen_ChatsList');
        expect(chatsList).toBeTruthy();
    });
});
