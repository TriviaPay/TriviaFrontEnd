import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';
import { Providers } from '../../app/Providers';
import LoginScreen from '../../features/auth/screens/LoginScreen';

describe('Sanity Check', () => {
    it('passes', () => {
        expect(1 + 1).toBe(2);
    });
});
