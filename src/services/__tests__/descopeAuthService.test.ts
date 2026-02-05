import { descopeAuthService } from '../descopeAuthService';

// Mock the Descope SDK
jest.mock('@descope/react-native-sdk', () => ({
  Descope: jest.fn().mockImplementation(() => ({
    otp: {
      signUpOrIn: {
        email: jest.fn(),
      },
      verify: {
        email: jest.fn(),
      },
    },
    password: {
      signIn: jest.fn(),
    },
    me: {
      update: jest.fn(),
    },
    logout: jest.fn(),
  })),
}));

describe('DescopeAuthService', () => {
  const mockDescope = {
    otp: {
      signUpOrIn: {
        email: jest.fn(),
      },
      verify: {
        email: jest.fn(),
      },
    },
    password: {
      signIn: jest.fn(),
    },
    me: {
      update: jest.fn(),
    },
    logout: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendOTP', () => {
    it('should send OTP successfully', async () => {
      mockDescope.otp.signUpOrIn.email.mockResolvedValue({ ok: true });

      const result = await descopeAuthService.sendOTP('test@example.com', mockDescope);

      expect(result.success).toBe(true);
      expect(mockDescope.otp.signUpOrIn.email).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(Object)
      );
    });

    it('should handle OTP send failure', async () => {
      mockDescope.otp.signUpOrIn.email.mockResolvedValue({
        ok: false,
        error: { message: 'Failed to send OTP' },
      });

      const result = await descopeAuthService.sendOTP('test@example.com', mockDescope);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send OTP');
    });
  });

  describe('verifyOTP', () => {
    it('should verify OTP successfully', async () => {
      mockDescope.otp.verify.email.mockResolvedValue({
        ok: true,
        data: {
          sessionToken: 'mock-token',
          refreshToken: 'mock-refresh',
          user: { id: 'user-123', email: 'test@example.com' },
        },
      });

      const result = await descopeAuthService.verifyOTP('test@example.com', '123456', mockDescope);

      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-token');
    });

    it('should handle OTP verification failure', async () => {
      mockDescope.otp.verify.email.mockResolvedValue({
        ok: false,
        error: { message: 'Invalid OTP' },
      });

      const result = await descopeAuthService.verifyOTP('test@example.com', '123456', mockDescope);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid OTP');
    });
  });

  describe('bindPassword', () => {
    it('should bind password successfully', async () => {
      mockDescope.me.update.mockResolvedValue({
        ok: true,
        data: { id: 'user-123' },
      });

      const result = await descopeAuthService.bindPassword(
        'test@example.com',
        'password123',
        'testuser',
        mockDescope
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });

    it('should handle password binding failure', async () => {
      mockDescope.me.update.mockResolvedValue({
        ok: false,
        error: { message: 'Update failed' },
      });

      const result = await descopeAuthService.bindPassword(
        'test@example.com',
        'password123',
        'testuser',
        mockDescope
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('loginWithPassword', () => {
    it('should login successfully', async () => {
      mockDescope.password.signIn.mockResolvedValue({
        ok: true,
        data: {
          sessionToken: 'mock-token',
          refreshToken: 'mock-refresh',
        },
      });

      const result = await descopeAuthService.loginWithPassword(
        'test@example.com',
        'pw123',
        mockDescope
      );
      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-token');
    });
  });
});
