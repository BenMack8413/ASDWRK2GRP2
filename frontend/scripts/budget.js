(() => {
  const API_ROOT_INCOME = '/api/incomes';
  const API_ROOT_EXPENSES = '/api/expenses';
  const API_ROOT_CATEGORIES = '/api/categories';
  const BUDGET_ID = 1;

  // DOM hooks
  const totalIncomeEl = document.getElementById('total-income');
  const totalExpensesEl = document.getElementById('total-expenses');
  const remainingEl = document.getElementById('remaining');
  const categoriesContainer = document.getElementById('categoriesContainer');
  const currentMonthLabel = document.getElementById('current-month-label');

  const statMonthLabel = document.getElementById('stat-month-label');
  const statMonthBudget = document.getElementById('stat-month-budget');
  const statExpectedRemaining = document.getElementById('stat-expected-remaining');
  const statToday = document.getElementById('stat-today');

  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const addTxBtn = document.getElementById('addTxBtn');
  const addCategoryBudgetBtn = document.getElementById('addCategoryBudgetBtn');
  const resetBudgetsBtn = document.getElementById('resetBudgetsBtn');

  const CATEGORY_COLORS = {
    Rent: '#3b5bd8',
    Food: '#16a34a',
    Transport: '#facc15',
    Shopping: '#f472b6',
    Saving: '#14b8a6',
    Investments: '#8b5cf6',
    Other: '#9ca3af',
  };

  // charts
  let donutChart = null;
  let lineChart = null;

  // state
  let incomes = [];
  let expenses = [];
  let categories = [];

  // budgets stored locally (category -> monthly budget in dollars)
  // persisted in localStorage key: budget_category_amounts_{BUDGET_ID}
  function loadLocalBudgets() {
    try {
      const key = `budget_category_amounts_${BUDGET_ID}`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }
  function saveLocalBudgets(obj) {
    const key = `budget_category_amounts_${BUDGET_ID}`;
    localStorage.setItem(key, JSON.stringify(obj));
  }
  function resetLocalBudgets() {
    const key = `budget_category_amounts_${BUDGET_ID}`;
    localStorage.removeItem(key);
  }

  let categoryBudgets = loadLocalBudgets();

  // helper to format number as money
  function fmt(v) {
    return `$${Number(v || 0).toFixed(2)}`;
  }

  function moneyToCents(dollars) {
    return Math.round(Number(dollars) * 100);
  }

  function centsToMoney(cents) {
    return (Number(cents) / 100).toFixed(2);
  }

  function monthKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  function groupExpensesByCategoryForRange(rangeMonths = 1) {
    // rangeMonths = 1 -> current month only; 3 -> last 3 months
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (rangeMonths - 1), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1); // exclusive
    const sums = {}; // category -> cents

    expenses.forEach((e) => {
      // e.date expected in format YYYY-MM-DD or ISO
      const d = new Date(e.date);
      if (isNaN(d)) return;
      if (d >= start && d < end) {
        const cat = (e.category || e.source || 'Uncategorized').trim();
        sums[cat] = (sums[cat] || 0) + Math.round(Number(e.amount) * 100);
      }
    });

    return sums;
  }

  function groupExpensesMonthly(numMonths = 12) {
    // returns array of { key: 'YYYY-M', totalCents }
    const now = new Date();
    const map = {};
    for (let i = 0; i < numMonths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (numMonths - 1) + i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      map[key] = 0;
    }

    expenses.forEach((e) => {
      const d = new Date(e.date);
      if (isNaN(d)) return;
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (key in map) {
        map[key] += Math.round(Number(e.amount) * 100);
      }
    });

    // convert to arrays
    const keys = Object.keys(map);
    return keys.map((k) => ({ key: k, totalCents: map[k] }));
  }

  // Render category rows
  function renderCategories(rangeMonths = 1) {
    const sums = groupExpensesByCategoryForRange(rangeMonths);

    // compute totals
    const totalExpenseThisRangeCents = Object.values(sums).reduce((a, b) => a + b, 0);
    const budgetTotal = Object.values(categoryBudgets).reduce((a, b) => a + Number(b || 0), 0);

    categoriesContainer.innerHTML = '';

    // Build a list of category names to include: categories from server + ones from sums
    const allNames = new Set();
    categories.forEach((c) => allNames.add(c.name));
    Object.keys(sums).forEach((s) => allNames.add(s));

    const names = Array.from(allNames).sort();

    names.forEach((name) => {
      const spentCents = sums[name] || 0;
      const budgetDollars = Number(categoryBudgets[name] || 0);
      const budgetCents = Math.round(budgetDollars * 100);
      const remainingCents = budgetCents - spentCents;
      const pct = budgetCents > 0 ? Math.min(100, Math.round((spentCents / budgetCents) * 100)) : 0;

      const div = document.createElement('div');
      div.className = 'category-row';
      div.innerHTML = `
        <div class="category-icon" title="${name}">
          <i class="fas fa-circle"></i>
        </div>
        <div style="font-weight:600;">${name}</div>
        <div>
          <input type="number" min="0" step="0.01" class="budget-input" data-cat="${name}" value="${budgetDollars ? budgetDollars.toFixed(2) : ''}" placeholder="0.00"/>
        </div>
        <div class="spent-amount">${fmt(spentCents/100)}</div>
        <div class="remaining-amount">${fmt(remainingCents/100)}</div>
        <div>
          <span class="status-badge small ${pct >= 100 ? 'status-near-limit' : 'status-on-track'}">${pct}%</span>
          <div class="progress-small" style="margin-top:6px;">
            <i style="width:${pct}%; background:${pct>=100? '#f76707' : '#4361ee'};"></i>
          </div>
        </div>
      `;

      // listen for budget input changes
      const input = div.querySelector('.budget-input');
      input.addEventListener('change', (ev) => {
        const val = parseFloat(ev.target.value || 0);
        if (isNaN(val)) return;
        categoryBudgets[name] = Number(val).toFixed(2);
        // don't save instantly — allow Save button. But reflect UI immediately.
        renderSummary(); // update remaining totals
      });

      categoriesContainer.appendChild(div);
    });

    renderSummary();
    drawDonut(sums);
  }

  // update summary numbers
  function renderSummary() {
    // compute totals for current month only
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const totalIncomeThisMonth = incomes.reduce((acc, inc) => {
      const d = new Date(inc.date);
      if (isNaN(d)) return acc;
      if (d >= start && d < end) return acc + Number(inc.amount) * 100;
      return acc;
    }, 0);

    const totalExpenseThisMonth = expenses.reduce((acc, ex) => {
      const d = new Date(ex.date);
      if (isNaN(d)) return acc;
      if (d >= start && d < end) return acc + Math.round(Number(ex.amount) * 100);
      return acc;
    }, 0);

    // budgets total
    const budgetTotalDollars = Object.values(categoryBudgets).reduce((a, b) => a + Number(b || 0), 0);

    const remainingCents = totalIncomeThisMonth - totalExpenseThisMonth;

    totalIncomeEl.textContent = fmt(totalIncomeThisMonth / 100);
    totalExpensesEl.textContent = fmt(totalExpenseThisMonth / 100);
    remainingEl.textContent = fmt(remainingCents / 100);

    // stats
    statMonthLabel.textContent = new Date().toLocaleString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    statMonthBudget.textContent = fmt(budgetTotalDollars);
    statExpectedRemaining.textContent = fmt((remainingCents / 100));
    statToday.textContent = fmt((remainingCents / 100));

  }

async function drawDonut() {
    try {
        const res = await fetch(`/api/expenses?budget_id=1`);
        if (!res.ok) throw new Error('Failed to fetch expenses');
        const expenses = await res.json();

        // Group by category
        const totals = {};
        expenses.forEach(exp => {
            const cat = exp.category || 'Other';
            const amt = Number(exp.amount) || 0;
            totals[cat] = (totals[cat] || 0) + amt;
        });

        const labels = Object.keys(totals);
        const data = Object.values(totals);
        const backgroundColors = labels.map(
            c => CATEGORY_COLORS[c] || '#9ca3af'
        );

        const ctx = document.getElementById('categoryDonut').getContext('2d');

        // Destroy previous chart if it exists
        if (window.categoryDonutChart) window.categoryDonutChart.destroy();

        window.categoryDonutChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: backgroundColors,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const val = ctx.parsed;
                                const pct = ((val / total) * 100).toFixed(1);
                                return `${ctx.label}: $${val.toFixed(2)} (${pct}%)`;
                            },
                        },
                    },
                },
            },
        });
    } catch (err) {
        console.error('drawDonut error:', err);
        alert('Failed to load data');
    }
}

  // Draw monthly line chart
  function drawMonthly(numMonths = 12) {
    const monthly = groupExpensesMonthly(numMonths);
    const labels = monthly.map((m) => m.key);
    const data = monthly.map((m) => Math.abs(m.totalCents) / 100);

    const ctx = document.getElementById('monthlyLine').getContext('2d');
    if (lineChart) {
      lineChart.data.labels = labels;
      lineChart.data.datasets[0].data = data;
      lineChart.update();
      return;
    }

    lineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Expenses ($)',
            data,
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  // fetch functions
  async function fetchIncomes() {
    const res = await fetch(`${API_ROOT_INCOME}?budget_id=${BUDGET_ID}`);
    if (!res.ok) throw new Error('Failed to load incomes');
    const json = await res.json();
    incomes = json;
  }
  async function fetchExpenses() {
    const res = await fetch(`${API_ROOT_EXPENSES}?budget_id=${BUDGET_ID}`);
    if (!res.ok) throw new Error('Failed to load expenses');
    const json = await res.json();
    expenses = json;
  }
  async function fetchCategories() {
    // if your backend categories endpoint differs, adjust this URL.
    try {
      const res = await fetch(`${API_ROOT_CATEGORIES}?budget_id=${BUDGET_ID}`);
      if (!res.ok) {
        categories = []; // fallback
        return;
      }
      categories = await res.json();
    } catch (e) {
      categories = [];
    }
  }

  async function loadAll(rangeMonths = 1) {
    try {
      await Promise.all([fetchIncomes(), fetchExpenses(), fetchCategories()]);
      // show current month label
      const now = new Date();
      currentMonthLabel.textContent = now.toLocaleString(undefined, { month: 'long', year: 'numeric' });

      // ensure categoryBudgets has entries for known categories (optional)
      categories.forEach((c) => {
        if (!(c.name in categoryBudgets)) categoryBudgets[c.name] = categoryBudgets[c.name] || '';
      });

      renderCategories(rangeMonths);
      drawMonthly(12);
    } catch (err) {
      console.error('loadAll error', err);
      alert('Failed to load budget data. See console for details.');
    }
  }

  // event handlers
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const range = btn.dataset.range || 'month';
      const months = range === 'month' ? 1 : (range === '3month' ? 3 : 12);
      renderCategories(months);
      drawMonthly(12);
    });
  });

  exportCsvBtn.addEventListener('click', () => {
    // produce CSV of current categories with budgets and spent
    const rows = [['Category','Budget','Spent','Remaining']];
    const sums = groupExpensesByCategoryForRange(1);
    Object.keys(sums).forEach((cat) => {
      const spent = Math.abs(sums[cat] || 0) / 100;
      const budget = Number(categoryBudgets[cat] || 0);
      const rem = budget - spent;
      rows.push([cat, budget.toFixed(2), spent.toFixed(2), rem.toFixed(2)]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget_export_${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  addCategoryBudgetBtn.addEventListener('click', () => {
    // read all budget inputs and persist to localStorage
    document.querySelectorAll('.budget-input').forEach((input) => {
      const name = input.dataset.cat;
      const v = parseFloat(input.value || 0);
      categoryBudgets[name] = Number(isNaN(v) ? 0 : v).toFixed(2);
    });
    saveLocalBudgets(categoryBudgets);
    alert('Budgets saved locally.');
    renderCategories(); // refresh UI to reflect saved budgets
  });

  resetBudgetsBtn.addEventListener('click', () => {
    if (!confirm('Reset all saved budgets?')) return;
    resetLocalBudgets();
    categoryBudgets = {};
    renderCategories();
  });

  // init
  loadAll(1);

  // create initial empty charts so canvas sizes are correct
  drawDonut({});
  drawMonthly(12);
})();
