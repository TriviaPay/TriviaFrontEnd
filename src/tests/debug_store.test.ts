import { store } from '../store';

describe('Store Debug', () => {
    it('should load the store', () => {
        expect(store).toBeDefined();
        expect(typeof store.dispatch).toBe('function');
    });
});
