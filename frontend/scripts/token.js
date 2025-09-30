const token_key = 'auth_jwt_token';

function saveToken(token, rememberMe = false) {
    if (rememberMe) {
        localStorage.setItem(token_key, token);
    } else {
        sessionStorage.setItem(token_key, token);
    }
}

function getToken() {
    return localStorage.getItem(token_key) || sessionStorage.getItem(token_key);
}

function removeToken() {
    localStorage.removeItem(token_key);
    sessionStorage.removeItem(token_key);
}

function decodeToken(token) {
    if (!token) return null;
    try {
        const base64Url = token.split('.')[1]; // payload part
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = atob(base64);
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('Failed to decode token:', e);
        return null;
    }
}

function isLoggedIn() {
    return !!getToken();
}

async function authFetch(url, options = {}) {
    const token = getToken();
    if (!token) throw new Error('No token available');

    const headers = Object.assign({}, options.headers, {
        authorization: `Bearer ${token}`,
    });

    const response = await fetch(url, Object.assign({}, options, { headers }));
    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            removeToken();
        }
        throw new Error(`Request failed: ${response.status}`);
    }
    return response.json();
}

async function signup(username, email, password, rememberMe) {
    try {
        const response = await fetch('/api/user/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password_hash: password }),
        });

        const data = await response.json();

        if (response.ok) {
            login(email, password, rememberMe);
            return 'Signup successful! You can now log in.';
        } else {
            return `Signup failed: ${data.error}`;
        }
    } catch (err) {
        return `Error: ${err.message}`;
    }
}

async function login(email, password, rememberMe = false) {
    const response = await fetch('/api/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
    });
    const data = await response.json();

    if (response.ok && data.token) {
        saveToken(data.token, rememberMe);
        window.location.href = '/dashboard.html';
        return data;
    } else {
        throw new Error(data.error || 'Login failed');
    }
}

function logout() {
    removeToken();
    window.location.href = '/index.html';
}

async function deleteUser() {
    const token = getToken();
    if (!token) {
        throw new Error('No auth token found. User not logged in.');
    }

    const id = parseInt(decodeToken(token).id);
    if (typeof id !== 'number') {
        throw new TypeError('Invalid id (must be a number)');
    }

    if (!token) {
        throw new Error('No auth token found. User not logged in.');
    }

    const response = await fetch(`/api/user/delete/${id}`, {
        method: 'DELETE',
        headers: {
            'authorization': `Bearer ${token}`,
        },
    });

    let body = null;
    const text = await response.text(); // read as text first
    if (text) {
        try {
            body = JSON.parse(text); // try parse JSON
        } catch {
            body = text; // fallback to plain text
        }
    }

    if (!response.ok) {
        const msg =
            (body && (body.error || body.message)) ||
            `Request failed (${response.status})`;
        throw new Error(msg);
    }
    console.log('Deleted', response);
    window.location.href = '/index.html'
}

window.saveToken = saveToken;
window.getToken = getToken;
window.removeToken = removeToken;
window.isLoggedIn = isLoggedIn;
window.authFetch = authFetch;
window.signup = signup;
window.login = login;
window.logout = logout;
window.deleteUser = deleteUser;
