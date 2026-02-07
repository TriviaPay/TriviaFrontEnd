/**
 * Auth Feature Tests
 */

import { renderHookWithProviders, waitFor, act, mockUser } from '../../testUtils';
import { useAuth } from '@features/auth';
import * as authApi from '@features/auth/api/authApi';

jest.mock('@features/auth/api/authApi');

describe('Auth Feature', () => {
  describe('useAuth hook', () => {
    it('should login successfully', async () => {
      (authApi.login as jest.Mock).mockResolvedValue({ user: mockUser, token: 'token123' });

      const { result } = renderHookWithProviders(() => useAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
      });

      await act(async () => {
        await result.current.handleLogin({ email: 'test@test.com', password: 'password' });
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual(mockUser);
      });
    });

    it('should handle login failure', async () => {
      (authApi.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHookWithProviders(() => useAuth());

      await expect(
        result.current.handleLogin({ email: 'test@test.com', password: 'wrong' })
      ).rejects.toThrow();
    });

    it('should logout successfully', async () => {
      const { result } = renderHookWithProviders(() => useAuth());

      await act(async () => {
        await result.current.handleLogout();
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
      });
    });
  });
});
