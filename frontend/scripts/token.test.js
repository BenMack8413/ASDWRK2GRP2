/**
 * @jest-environment jsdom
 */
require('./token'); // executes file and populates window.*

const {
  saveToken,
  getToken,
  removeToken,
  isLoggedIn,
  authFetch,
  signup,
  login,
  logout,
} = global.window; // or just "window" in test scope

// Mock fetch globally
global.fetch = jest.fn();

describe('auth utilities', () => {
    const token = 'test_jwt_token';

    beforeEach(() => {
  // Clear storages
  localStorage.clear();
  sessionStorage.clear();

  // Reset mocks first
  jest.clearAllMocks();

  // Recreate fetch mock after clearing mocks
  global.fetch = jest.fn();
  });
  

    describe('saveToken / getToken', () => {
        it('saves token in localStorage when rememberMe is true', () => {
            saveToken(token, true);
            expect(localStorage.getItem('auth_jwt_token')).toBe(token);
        });

        it('saves token in sessionStorage when rememberMe is false', () => {
            saveToken(token, false);
            expect(sessionStorage.getItem('auth_jwt_token')).toBe(token);
        });

        it('retrieves token from localStorage first', () => {
            localStorage.setItem('auth_jwt_token', token);
            expect(getToken()).toBe(token);
        });

        it('retrieves token from sessionStorage if not in localStorage', () => {
            sessionStorage.setItem('auth_jwt_token', token);
            expect(getToken()).toBe(token);
        });
    });

    describe('removeToken', () => {
        it('removes token from both storages', () => {
            localStorage.setItem('auth_jwt_token', token);
            sessionStorage.setItem('auth_jwt_token', token);
            removeToken();
            expect(localStorage.getItem('auth_jwt_token')).toBeNull();
            expect(sessionStorage.getItem('auth_jwt_token')).toBeNull();
        });
    });

    describe('isLoggedIn', () => {
        it('returns true when a token exists', () => {
            localStorage.setItem('auth_jwt_token', token);
            expect(isLoggedIn()).toBe(true);
        });

        it('returns false when no token exists', () => {
            expect(isLoggedIn()).toBe(false);
        });
    });

    describe('authFetch', () => {
        it('throws error when no token is available', async () => {
            await expect(authFetch('/api/test')).rejects.toThrow('No token available');
        });

        it('attaches token and resolves json on success', async () => {
            localStorage.setItem('auth_jwt_token', token);

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: 'ok' }),
            });

            const result = await authFetch('/api/test');
            expect(fetch).toHaveBeenCalledWith(
                '/api/test',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: `Bearer ${token}`,
                    }),
                })
            );
            expect(result).toEqual({ data: 'ok' });
        });

        it('removes token and throws error on 401/403', async () => {
            localStorage.setItem('auth_jwt_token', token);

            fetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ error: 'Bad request' }),
            });

            await expect(authFetch('/api/test')).rejects.toThrow('Request failed: 401');
            expect(getToken()).toBeNull();
        });
    });

    describe('signup', () => {
        it('returns success message and calls login on success', async () => {
            const loginMock = jest.spyOn(global, 'login').mockResolvedValueOnce({});
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            });

            const result = await signup('user', 'test@test.com', 'pass', true);
            expect(result).toMatch(/Signup successful/);
            expect(loginMock).toHaveBeenCalledWith('test@test.com', 'pass', true);
        });

        it('returns error message on failure', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Bad request' }),
            });

            const result = await signup('user', 'test@test.com', 'pass');
            expect(result).toBe('Signup failed: Bad request');
        });
    });

    describe('login', () => {
        it('saves token and redirects on success', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ token }),
            });

            const result = await login('test@test.com', 'pass', true);
            expect(localStorage.getItem('auth_jwt_token')).toBe(token);
            expect(window.location.assign).toHaveBeenCalledWith('/dashboard.html');
            expect(result.token).toBe(token);
        });

        it('throws error on failure', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Invalid credentials' }),
            });

            await expect(login('test@test.com', 'wrong')).rejects.toThrow('Invalid credentials');
        });
    });

    describe('logout', () => {
        it('removes token and redirects to login', () => {
            localStorage.setItem('auth_jwt_token', token);
            logout();
            expect(localStorage.getItem('auth_jwt_token')).toBeNull();
            expect(window.location.assign).toHaveBeenCalledWith('/login.html');
        });
    });
});
