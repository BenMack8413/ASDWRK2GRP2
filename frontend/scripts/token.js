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
    const id = Number(token.id);
    if (typeof id !== 'number') {
            console.log(8);
        throw new TypeError('Invalid id (must be a number)');
    }
    console.log(1);
    if (!token) {
        console.log(7);
        throw new Error('No auth token found. User not logged in.');
    }
    console.log(2);
    const response = await fetch(`/delete/${id}`, {
        method: 'DELETE',
        headers: {
            authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });
    console.log(3);
    let payload = {};
    try {
        payload = await response.json();
    } catch (e) {
        console.log(e.message);
        console.log(payload);
        console.log(response);
        return `Error: ${e.message}`;
    }
    console.log(4);
    if (!response.ok) {
        const err = new Error(
            payload.error || `Request failed (${response.status})`,
        );
        err.status = response.status;
        err.detail = payload.detail;
        throw err;
    }
    console.log(5);
    return payload;
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
