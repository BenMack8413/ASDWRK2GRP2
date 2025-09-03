/* -------- Dashboard Start -------- */
const sample = {
    recentTx: [
        { id: 1, title: 'Deposit to Amex', date: '2 September', amount: -1230 },
        {
            id: 2,
            title: 'Deposit from PayPal',
            date: '1 September',
            amount: +2450,
        },
        { id: 3, title: 'Refund', date: '31 August', amount: +130 },
        {
            id: 4,
            title: 'Purchase iPhone 16 Pro Max',
            date: '31 August',
            amount: -2849,
        },
        { id: 5, title: 'Deposit from NAB', date: '30 August', amount: +600 },
    ],
    monthly: {
        months: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
        income: [7000, 7000, 7000, 7000, 7000, 7000, 7000],
        expense: [6800, 6600, 5900, 6650, 6500, 6900, 6000],
    },
    categories: [
        { label: 'Rent', value: 3300 },
        { label: 'Food', value: 1000 },
        { label: 'Transport', value: 300 },
        { label: 'Shopping', value: 700 },
        { label: 'Saving', value: 600 },
        { label: 'Investments', value: 800 },
        { label: 'Other', value: 200 },
    ],
};

function safeCtx(id) {
    const el = document.getElementById(id);
    return el && el.getContext ? el.getContext('2d') : null;
}

function renderRecentTx() {
    const container = document.getElementById('recentTx');
    if (!container) return;
    container.innerHTML = '';
    sample.recentTx.forEach((tx) => {
        const el = document.createElement('div');
        el.className = 'tx';
        const left = document.createElement('div');
        left.className = 'meta';
        const dot = document.createElement('div');
        dot.className = 'dot';
        dot.style.background = '#eef2ff';
        dot.textContent = tx.title.split(' ')[0][0] || '•';
        left.appendChild(dot);
        const txt = document.createElement('div');
        txt.innerHTML = `<div style="font-weight:600">${tx.title}</div><div class="muted">${tx.date}</div>`;
        left.appendChild(txt);
        const amt = document.createElement('div');
        amt.style.fontWeight = 700;
        try {
            amt.textContent =
                (tx.amount > 0 ? '+' : '') +
                tx.amount.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                });
        } catch (e) {
            amt.textContent = (tx.amount > 0 ? '+' : '') + tx.amount;
            console.error(e);
        }
        if (tx.amount < 0) amt.style.color = '#ff5c68';
        else if (tx.amount > 0) amt.style.color = '#16a34a';
        el.appendChild(left);
        el.appendChild(amt);
        container.appendChild(el);
    });
}

function renderMiniTx() {
    const mini = document.getElementById('miniTx');
    if (!mini) return;
    mini.innerHTML = '';
    sample.recentTx.slice(0, 3).forEach((tx) => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        const amountText = (tx.amount > 0 ? '+' : '') + tx.amount;
        row.innerHTML = `<div style="font-size:13px">${tx.title}</div><div style="font-weight:700">${amountText}</div>`;
        mini.appendChild(row);
    });
}

let incomeChart, spendPie, activityBar;
function initCharts() {
    const ctxIncome = safeCtx('incomeChart');
    if (ctxIncome) {
        const months = sample.monthly.months;
        incomeChart = new Chart(ctxIncome, {
            type: 'line',
            data: {
                labels: months.slice(-6),
                datasets: [
                    {
                        label: 'Income',
                        data: sample.monthly.income.slice(-6),
                        fill: false,
                        tension: 0.3,
                        borderWidth: 2,
                        borderColor: 'rgba(59,91,216,0.95)',
                        pointBackgroundColor: '#fff',
                        pointBorderColor: 'rgba(59,91,216,0.95)',
                        backgroundColor: 'rgba(26, 115, 232, 0.1)',
                    },
                    {
                        label: 'Expense',
                        data: sample.monthly.expense.slice(-6),
                        fill: false,
                        tension: 0.3,
                        borderWidth: 2,
                        borderColor: 'rgba(200,50,80,0.9)',
                        pointBackgroundColor: '#fff',
                        pointBorderColor: 'rgba(200,50,80,0.9)',
                        backgroundColor: 'rgba(234, 67, 53, 0.1)',
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } },
            },
        });
    }
    const ctxPie = safeCtx('spendPie');
    if (ctxPie) {
        spendPie = new Chart(ctxPie, {
            type: 'doughnut',
            data: {
                labels: sample.categories.map((c) => c.label),
                datasets: [
                    {
                        data: sample.categories.map((c) => c.value),
                        hoverOffset: 6,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } },
            },
        });
    }

    const ctxBar = safeCtx('activityBar');
    if (ctxBar) {
        activityBar = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
                datasets: [
                    {
                        label: 'Income',
                        data: [7000, 7000, 7000, 7000, 7000, 7000, 7000],
                        stack: 'a',
                    },
                    {
                        label: 'Spending',
                        data: [6800, 6600, 5900, 6650, 6500, 6900, 6000],
                        stack: 'a',
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true } },
            },
        });
    }
}

const LAYOUT_KEY = 'mb_dashboard_layout_v1';
const HIDDEN_KEY = 'mb_dashboard_hidden_v1';

function getHiddenWidgets() {
    return [...document.querySelectorAll('.widget')]
        .filter((w) => w.style.display === 'none')
        .map((w) => w.id);
}
function saveHiddenState() {
    try {
        localStorage.setItem(HIDDEN_KEY, JSON.stringify(getHiddenWidgets()));
    } catch (e) {console.error(e);}
}

function saveLayout() {
    if (!widgetsContainer) return;
    try {
        const order = [...widgetsContainer.querySelectorAll('.widget')]
            .map((w) => w.id)
            .filter(Boolean);
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(order));
        localStorage.setItem(HIDDEN_KEY, JSON.stringify(getHiddenWidgets()));
        alert('Layout saved');
    } catch (e) {console.error(e);}
}

function loadLayout() {
    if (!widgetsContainer) return;
    try {
        const order = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null');
        if (order && Array.isArray(order)) {
            order.forEach((id) => {
                const el = document.getElementById(id);
                if (el) widgetsContainer.appendChild(el);
            });
        }
        const hidden = JSON.parse(localStorage.getItem(HIDDEN_KEY) || 'null');
        if (hidden && Array.isArray(hidden)) {
            document.querySelectorAll('.widget').forEach((w) => {
                const visible = !hidden.includes(w.id);
                w.style.display = visible ? 'block' : 'none';
            });
        }
    } catch (e) {console.error(e);}
}

function resetLayout() {
    try {
        localStorage.removeItem(LAYOUT_KEY);
        localStorage.removeItem(HIDDEN_KEY);
        location.reload();
    } catch (e) {console.error(e);}
}

(function init() {
    renderRecentTx();
    renderMiniTx();
    initCharts();
    loadLayout();
})();

/* -------- Dashboard End -------- */

/* -------- Budget Start -------- */
document.querySelectorAll('.filter-btn').forEach((button) => {
    button.addEventListener('click', function () {
        document.querySelectorAll('.filter-btn').forEach((btn) => {
            btn.classList.remove('active');
        });
        this.classList.add('active');
    });
});

document.querySelectorAll('.month').forEach((month) => {
    month.addEventListener('click', function () {
        document.querySelectorAll('.month').forEach((m) => {
            m.classList.remove('active');
        });
        this.classList.add('active');
    });
});
/* -------- Budget End -------- */
