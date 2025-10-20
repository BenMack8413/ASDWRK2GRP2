/**
 * @jest-environment jsdom
 */

const { signup, login } = require('../frontend/scripts/token'); // Adjust path

describe('signup function', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    it('should call login on successful signup and return success message', async () => {
        // Mock fetch for signup endpoint (successful)
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({}),
        });

        // Mock fetch for login endpoint called inside signup
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ token: 'fake-token' }),
        });

        // Mock console.error to catch any navigation errors silently
        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {});

        const message = await signup(
            'user1',
            'user1@example.com',
            'password123',
            true,
        );

        expect(fetch).toHaveBeenCalledTimes(2);

        expect(fetch).toHaveBeenNthCalledWith(
            1,
            '/api/user/signup',
            expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'user1',
                    email: 'user1@example.com',
                    password_hash: 'password123',
                }),
            }),
        );

        expect(fetch).toHaveBeenNthCalledWith(
            2,
            '/api/user/login',
            expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'user1@example.com',
                    password: 'password123',
                    rememberMe: true,
                }),
            }),
        );

        expect(message).toBe('Signup successful! You can now log in.');

        // Clean up
        consoleErrorSpy.mockRestore();
    });

    it('should return error message on failed signup', async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Email already exists' }),
        });

        const message = await signup(
            'user1',
            'user1@example.com',
            'password123',
            false,
        );

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(message).toBe('Signup failed: Email already exists');
    });

    it('should return error message on fetch error', async () => {
        fetch.mockRejectedValueOnce(new Error('Network error'));

        const message = await signup(
            'user1',
            'user1@example.com',
            'password123',
            false,
        );

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(message).toBe('Error: Network error');
    });

    it('should handle signup success but login failure correctly', async () => {
        // Mock successful signup but failed login
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({}),
        });

        fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Login failed after signup' }),
        });

        // Mock console.error to catch any navigation errors silently
        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {});

        const message = await signup(
            'user1',
            'user1@example.com',
            'password123',
            true,
        );

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(message).toBe(
            'Signup successful, but login failed. Please try logging in manually.',
        );

        // Clean up
        consoleErrorSpy.mockRestore();
    });
});
