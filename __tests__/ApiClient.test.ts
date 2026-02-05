// Jest test for ApiClient service
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { initializeApiClient } from '../../src/core/services/ApiClient';
import { keychainStorage } from '../../src/services/keychainStorage';
import { getPublicKeyPinning } from '../../src/core/services/SSLPinning';

jest.mock('../../src/services/keychainStorage');
jest.mock('../../src/core/services/SSLPinning');

describe('ApiClientService', () => {
    const mock = new MockAdapter(axios);
    const baseURL = 'https://api.triviacoin.com';
    const client = initializeApiClient({ baseURL });

    beforeEach(() => {
        mock.reset();
        (keychainStorage.getAccessToken as jest.Mock).mockResolvedValue('test-token');
        (keychainStorage.storeAccessToken as jest.Mock).mockResolvedValue(true);
        (keychainStorage.removeAccessToken as jest.Mock).mockResolvedValue(true);
        (getPublicKeyPinning as jest.Mock).mockReturnValue('pinned-key');
    });

    it('should attach auth token and SSL pinning header on requests', async () => {
        mock.onGet('/test').reply(config => {
            // Verify headers
            expect(config.headers?.Authorization).toBe('Bearer test-token');
            expect(config.headers?.['X-SSL-Pinning']).toBe('pinned-key');
            return [200, { success: true }];
        });

        const response = await client.get('/test');
        expect(response.success).toBe(true);
    });

    it('should reject non‑HTTPS URLs', async () => {
        // Directly call the interceptor to simulate a request with http URL
        // @ts-ignore – accessing private method for test purposes
        const interceptor = (client as any).client.interceptors.request.handlers[0].fulfilled;
        await expect(
            interceptor({ url: 'http://insecure.example.com', method: 'get', headers: {} })
        ).rejects.toThrow('Insecure HTTP request blocked');
    });

    it('should load auth token from Keychain on init', async () => {
        // Re‑initialize to trigger loadAuthToken
        const newClient = initializeApiClient({ baseURL });
        // @ts-ignore – access private authToken
        expect((newClient as any).authToken).toBe('test-token');
    });

    it('should store and clear token via setAuthToken', async () => {
        await client.setAuthToken('new-token');
        expect(keychainStorage.storeAccessToken).toHaveBeenCalledWith('new-token');
        await client.setAuthToken(null);
        expect(keychainStorage.removeAccessToken).toHaveBeenCalled();
    });
});
