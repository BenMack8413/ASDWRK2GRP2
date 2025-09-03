require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

function saveToken(token, rememberMe = false) {
  if (rememberMe) {
    localStorage.setItem(JWT_SECRET, token);
  } else {
    sessionStorage.setItem(JWT_SECRET, token);
  }
}

function getToken() {
  return localStorage.getItem(JWT_SECRET) || sessionStorage.getItem(JWT_SECRET);
}

function removeToken() {
  localStorage.removeItem(JWT_SECRET);
  sessionStorage.removeItem(JWT_SECRET);
}

function isLoggedIn() {
  return !!getToken();
}

async function authFetch(url, options = {}) {
  const token = getToken();
  if (!token) throw new Error("No token available");

  const headers = Object.assign({}, options.headers, {
    Authorization: `Bearer ${token}`,
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
          body: JSON.stringify({ username, email, password_hash: password })
        });

        const data = await response.json();

        if (response.ok) {
          messageDiv.textContent = 'Signup successful! You can now log in.';
          login(email, password, rememberMe);
        } else {
          messageDiv.textContent = `Signup failed: ${data.error}`;
        }
      } catch (err) {
        messageDiv.textContent = `Error: ${err.message}`;
      }

}

async function login(email, password, rememberMe = false) {
  const response = await fetch("/api/user/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, rememberMe }),
  });
  const data = await response.json();

  if (response.ok && data.token) {
    saveToken(data.token, rememberMe);
    return data;
  } else {
    throw new Error(data.error || "Login failed");
  }
}

function logout() {
  removeToken();
  window.location.href = "/login.html";
}

module.exports = {
  saveToken,
  getToken,
  removeToken,
  isLoggedIn,
  authFetch,
  login,
  logout,
};