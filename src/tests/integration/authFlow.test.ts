import { login, signup, refreshToken, logout } from '../../features/auth/api/authApi';
import { apiClient } from '../../core/services/ApiClient';

jest.mock('../../core/services/ApiClient', () => {
  const original = jest.requireActual('../../core/services/ApiClient');
  return {
    ...original,
    apiClient: {
      post: jest.fn(),
      get: jest.fn(),
    },
  };
});

describe('Auth API integration', () => {
  it('logs in successfully', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        user: { id: 'u1', email: 'user@test.com', username: 'user' },
        token: 't',
      },
    });
    const res = await login({ email: 'user@test.com', password: 'pass' });
    expect(res.token).toBe('t');
    expect(res.user.username).toBe('user');
  });

  it('throws on login failure', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: false,
      error: { message: 'Invalid credentials' },
    });
    await expect(login({ email: 'a@b.com', password: 'x' })).rejects.toThrow('Invalid credentials');
  });

  it('signs up successfully', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        user: { id: 'u2', email: 'new@test.com', username: 'new' },
        token: 't2',
      },
    });
    const res = await signup({ email: 'new@test.com', password: 'pass', username: 'new' });
    expect(res.user.email).toBe('new@test.com');
  });

  it('refreshes token', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      data: { token: 'new-token' },
    });
    const res = await refreshToken('old');
    expect(res.token).toBe('new-token');
  });

  it('calls logout endpoint', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ success: true });
    await expect(logout()).resolves.toBeUndefined();
    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
  });
});
