// const { getToken } = require('./token');

const SETTINGS_ENDPOINT = '/api/settings';
const DEFAULTS = {
    theme: 'light',
    items_per_page: 20,
    dark_mode: false,
    language: 'en',
};

/* optional metadata for enum-like settings */
const settingMetadata = {
    theme: ['light', 'dark'],
    language: ['en', 'fr', 'es'], // if you add more languages later
};

let currentSettings = {};
let pendingChanges = {};

function setStatus(text, type = 'info') {
    const el = document.getElementById('statusText');
    el.textContent = text;
    el.style.color =
        type === 'error' ? '#c0392b' : type === 'ok' ? '#0b8a3e' : '#666';
}

function applyTheme(theme) {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add('theme-' + theme);
}

function createInput(key, value) {
    // check for enum first
    if (settingMetadata[key]) {
        const select = document.createElement('select');
        settingMetadata[key].forEach((opt) => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
            select.appendChild(o);
        });
        select.value = value;
        select.addEventListener('change', () => {
            pendingChanges[key] = select.value;
            if (key === 'theme') applyTheme(select.value);
        });
        return select;
    }

    // type-based detection
    if (typeof value === 'boolean') {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = value;
        checkbox.addEventListener(
            'change',
            () => (pendingChanges[key] = checkbox.checked),
        );
        return checkbox;
    }

    if (typeof value === 'number') {
        const input = document.createElement('input');
        input.type = 'number';
        input.value = value;
        input.addEventListener(
            'input',
            () => (pendingChanges[key] = Number(input.value)),
        );
        return input;
    }

    // fallback to text
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.addEventListener('input', () => (pendingChanges[key] = input.value));
    return input;
}

function renderSettings(settings) {
    const container = document.getElementById('settingsContainer');
    container.innerHTML = '';
    pendingChanges = {};
    for (const [key, value] of Object.entries(settings)) {
        const row = document.createElement('div');
        row.className = 'row';
        const label = document.createElement('label');
        label.textContent = key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
        const input = createInput(key, value);
        row.appendChild(label);
        row.appendChild(input);
        container.appendChild(row);
        pendingChanges[key] = value;
    }
}

async function fetchSettings() {
    try {
        const token = getToken();
        const resp = await fetch(SETTINGS_ENDPOINT, {
            credentials: 'include',
            headers: {
                authorization: `Bearer ${token}`,
            },
        });
        const data = await resp.json();
        const storedSettings = data.settings || {};
        currentSettings = { ...DEFAULTS, ...storedSettings };
        renderSettings(currentSettings);
        if (currentSettings.theme) applyTheme(currentSettings.theme);
    } catch (e) {
        console.error('Failed to load settings', e);
        currentSettings = DEFAULTS;
        renderSettings(currentSettings);
    }
}

async function saveSettings() {
    try {
        const token = getToken();
        setStatus('Saving...');
        const resp = await fetch(SETTINGS_ENDPOINT, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(pendingChanges),
        });
        if (!resp.ok) throw new Error('Server error');
        const json = await resp.json();
        currentSettings = json.settings || currentSettings;
        pendingChanges = { ...currentSettings };
        setStatus('Saved', 'ok');
        setTimeout(() => setStatus('—'), 1000);
    } catch (e) {
        console.error('Failed to save', e);
        setStatus('Save failed', 'error');
    }
}
