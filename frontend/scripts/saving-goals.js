// ===== Saving Goals controller (with categories & rich cards) =====
const GOALS_KEY = 'mb_saving_goals_v2';

const CATEGORIES = [
    { key: 'travel', label: 'Travel', emoji: '✈️' },
    { key: 'home', label: 'Home', emoji: '🏠' },
    { key: 'emergency', label: 'Emergency', emoji: '🆘' },
    { key: 'education', label: 'Education', emoji: '🎓' },
    { key: 'vehicle', label: 'Vehicle', emoji: '🚗' },
    { key: 'gadgets', label: 'Gadgets', emoji: '💻' },
    { key: 'shopping', label: 'Shopping', emoji: '🛒' },
    { key: 'health', label: 'Health', emoji: '💊' },
];

// DOM helpers
const $ = (s) => document.querySelector(s);
const read = () => JSON.parse(localStorage.getItem(GOALS_KEY) || '[]');
const write = (arr) => localStorage.setItem(GOALS_KEY, JSON.stringify(arr));
const pct = (cur, tgt) => {
    const t = Number(tgt) || 0,
        c = Number(cur) || 0;
    if (!t) return 0;
    return Math.min(100, Math.round((c / t) * 100));
};
const daysLeft = (dateStr) => {
    const d = new Date(dateStr),
        now = new Date();
    return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
};

let selectedCategory = 'travel'; // default

function renderCategoryPicker() {
    const wrap = $('#categoryPicker');
    wrap.innerHTML = '';
    CATEGORIES.forEach((cat) => {
        const item = document.createElement('div');
        item.className = `cat ${cat.key} ${selectedCategory === cat.key ? 'active' : ''}`;
        item.innerHTML = `<div class="ico">${cat.emoji}</div><div class="t">${cat.label}</div>`;
        item.onclick = () => {
            selectedCategory = cat.key;
            renderCategoryPicker();
        };
        wrap.appendChild(item);
    });
}

// Render list + summary
function render() {
    const data = read();

    // summary
    const totalTarget = data.reduce(
        (a, g) => a + Number(g.targetAmount || 0),
        0,
    );
    const totalSaved = data.reduce(
        (a, g) => a + Number(g.currentSaved || 0),
        0,
    );
    $('#sumTarget').textContent = `$${totalTarget.toFixed(2)}`;
    $('#sumSaved').textContent = `$${totalSaved.toFixed(2)}`;
    $('#sumCount').textContent = data.length;

    // sort
    const sortBy = $('#sortBy')?.value || 'deadline';
    const sorted = [...data].sort((a, b) => {
        if (sortBy === 'name')
            return (a.name || '').localeCompare(b.name || '');
        if (sortBy === 'progress')
            return (
                pct(b.currentSaved, b.targetAmount) -
                pct(a.currentSaved, a.targetAmount)
            );
        return new Date(a.deadline) - new Date(b.deadline); // deadline
    });

    // list
    const list = $('#goalsList');
    list.innerHTML = '';
    if (!sorted.length) {
        list.innerHTML = `<div class="empty">No goals yet. Pick a category and add your first one.</div>`;
        return;
    }

    sorted.forEach((g) => {
        const p = pct(g.currentSaved, g.targetAmount);
        const dl = daysLeft(g.deadline);
        const badge =
            p >= 100
                ? `<span class="badge good">Reached</span>`
                : dl < 0
                  ? `<span class="badge warn">Past due</span>`
                  : dl <= 7
                    ? `<span class="badge soon">Due soon</span>`
                    : `<span class="badge ok">On track</span>`;

        const cat =
            CATEGORIES.find((c) => c.key === g.category) || CATEGORIES[0];

        const row = document.createElement('div');
        row.className = 'row';

        row.innerHTML = `
      <div class="row-left">
        <div class="avatar" title="${cat.label}">${cat.emoji}</div>
        <div class="row-text">
          <div class="row-title">${g.name} ${badge} <span style="float:right;color:#475569;font-weight:600">${p}%</span></div>
          <div class="row-sub">Target $${Number(g.targetAmount || 0).toFixed(2)} • Saved $${Number(g.currentSaved || 0).toFixed(2)} • Due ${g.deadline || '—'}</div>
          <div class="bar"><div class="bar-fill" style="width:${p}%"></div></div>
        </div>
      </div>
      <div class="row-actions">
        <button class="btn ghost" data-action="edit">Edit</button>
        <button class="btn ghost danger" data-action="delete">Delete</button>
      </div>
    `;

        row.querySelector('[data-action="edit"]').onclick = () =>
            loadForm(g.id);
        row.querySelector('[data-action="delete"]').onclick = () => {
            write(read().filter((x) => x.id !== g.id));
            render();
        };

        list.appendChild(row);
    });
}

// Form logic
function loadForm(id) {
    const g = read().find((x) => x.id === id);
    if (!g) return;
    $('#goalId').value = g.id;
    $('#goalName').value = g.name;
    $('#targetAmount').value = g.targetAmount;
    $('#currentSaved').value = g.currentSaved;
    $('#deadline').value = g.deadline;
    selectedCategory = g.category || 'travel';
    renderCategoryPicker();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function saveGoal(e) {
    e.preventDefault();
    const id = $('#goalId').value || crypto.randomUUID();
    const name = $('#goalName').value.trim();
    const targetAmount = Number($('#targetAmount').value);
    const currentSaved = Number($('#currentSaved').value);
    const deadline = $('#deadline').value;

    if (!name || !targetAmount || targetAmount <= 0) {
        alert('Please enter a name and a positive target amount.');
        return;
    }

    const data = read();
    const idx = data.findIndex((x) => x.id === id);
    const item = {
        id,
        name,
        targetAmount,
        currentSaved,
        deadline,
        category: selectedCategory,
    };
    if (idx >= 0) data[idx] = item;
    else data.push(item);
    write(data);

    $('#goalForm').reset();
    $('#goalId').value = '';
    selectedCategory = 'travel';
    renderCategoryPicker();
    render();
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    renderCategoryPicker();
    $('#goalForm').addEventListener('submit', saveGoal);
    $('#resetGoalForm').addEventListener('click', () => {
        $('#goalForm').reset();
        $('#goalId').value = '';
        selectedCategory = 'travel';
        renderCategoryPicker();
    });
    $('#sortBy')?.addEventListener('change', render);
    render();
});
