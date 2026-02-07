import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';
import { Providers } from '../../app/Providers';
import LoginScreen from '../../features/auth/screens/LoginScreen';

describe('LoginScreen', () => {
    it('renders correctly', () => {
        const { getByText, getByPlaceholderText } = render(
            <Providers>
                <LoginScreen />
            </Providers>
        );

        expect(getByText('Welcome Back')).toBeTruthy();
        expect(getByPlaceholderText('Email')).toBeTruthy();
        expect(getByPlaceholderText('Password')).toBeTruthy();
    });
});
