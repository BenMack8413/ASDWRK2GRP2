// chart.js (frontend, with form functionality)

let charts = {}; // keep Chart.js instances keyed by DOM id

// ---------------------------
// Load all charts for a budget
// ---------------------------
async function loadCharts(budgetId) {
  try {
    const res = await fetch(`/api/charts/configs/${budgetId}`);
    if (!res.ok) throw new Error("Failed to load charts");
    const configs = await res.json();

    configs.forEach(c => renderChart(c));
  } catch (err) {
    console.error("Error loading charts:", err);
  }
}

// ---------------------------
// Render a chart card
// ---------------------------
function renderChart(config) {
  const chartId = `chart-${config.config_id}`;
  const configData = JSON.parse(config.config_json);

  // Create chart card
  const card = document.createElement("div");
  card.classList.add("chart-card");
  card.dataset.id = chartId;

  // Format dates for display
  const startDate = configData.startDate ? new Date(configData.startDate).toLocaleDateString() : 'N/A';
  const endDate = configData.endDate ? new Date(configData.endDate).toLocaleDateString() : 'N/A';

  card.innerHTML = `
    <div class="chart-header">
      <h3>${config.name}</h3>
      <button class="delete-btn" onclick="deleteChart('${config.config_id}', this)">Delete</button>
    </div>
    <div class="chart-meta">${startDate} - ${endDate} | ${configData.dataSource || 'N/A'}</div>
    <canvas id="${chartId}" height="200"></canvas>
  `;

  document.getElementById('chartsArea').appendChild(card);

  // Render Chart.js instance
  const ctx = document.getElementById(chartId).getContext("2d");
  charts[chartId] = new Chart(ctx, {
    type: config.type,
    data: configData.chartData,
    options: { 
      responsive: true, 
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// ---------------------------
// Show/Hide Chart Form
// ---------------------------
function toggleChartForm(show) {
  const form = document.getElementById('chartForm');
  form.style.display = show ? 'block' : 'none';
  
  if (!show) {
    // Reset form
    document.getElementById('chartName').value = '';
    document.getElementById('chartType').value = 'pie';
    document.getElementById('dataSource').value = 'expenses-by-category';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
  }
}

// ---------------------------
// Add new chart
// ---------------------------
async function addChart() {
  const name = document.getElementById('chartName').value.trim();
  const type = document.getElementById('chartType').value;
  const dataSource = document.getElementById('dataSource').value;
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const budgetId = 1; // TODO: replace with real logged-in budgetId

  // Validation
  if (!name) {
    alert('Please enter a chart name');
    return;
  }
  if (!startDate || !endDate) {
    alert('Please select start and end dates');
    return;
  }
  if (new Date(startDate) > new Date(endDate)) {
    alert('Start date must be before end date');
    return;
  }

  try {
    // Fetch data based on data source
    let chartData;
    if (dataSource === 'expenses-by-category') {
      chartData = await fetchExpensesByCategory(budgetId, startDate, endDate);
    } else if (dataSource === 'account-balance') {
      chartData = await fetchAccountBalance(budgetId, startDate, endDate);
    } else {
      // For now, use dummy data for other sources
      chartData = getDummyData(type, 7);
    }

    const config = {
      chartData,
      dataSource,
      startDate,
      endDate
    };

    // Save to database
    const res = await fetch("/api/charts/configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        budgetId,
        name,
        type,
        config
      })
    });

    if (!res.ok) throw new Error("Failed to save chart");
    const saved = await res.json();

    // Render newly saved chart
    renderChart({
      config_id: saved.config_id,
      budget_id: budgetId,
      name,
      type,
      config_json: JSON.stringify(config)
    });

    // Hide form
    toggleChartForm(false);
  } catch (err) {
    console.error("Error adding chart:", err);
    alert("Failed to create chart. Please try again.");
  }
}

// ---------------------------
// Fetch expenses by category
// ---------------------------
async function fetchExpensesByCategory(budgetId, startDate, endDate) {
  try {
    const res = await fetch(`/api/charts/expenses-by-category/${budgetId}`);
    if (!res.ok) throw new Error("Failed to fetch expenses");
    const data = await res.json();

    // If no data, return dummy data
    if (!data || data.length === 0) {
      return getDummyData('pie', 5);
    }

    return {
      labels: data.map(d => d.category),
      datasets: [{
        label: 'Expenses',
        data: data.map(d => Math.abs(d.total)),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(199, 199, 199, 0.8)'
        ],
        borderColor: '#fff',
        borderWidth: 2
      }]
    };
  } catch (err) {
    console.error("Error fetching expenses:", err);
    return getDummyData('pie', 5);
  }
}

// ---------------------------
// Fetch account balance over time
// ---------------------------
async function fetchAccountBalance(budgetId, startDate, endDate) {
  // TODO: Create an API endpoint for account balance over time
  // For now, return dummy data
  return getDummyDataTimeSeries(startDate, endDate);
}

// ---------------------------
// Delete a chart
// ---------------------------
async function deleteChart(configId, btn) {
  if (!confirm('Are you sure you want to delete this chart?')) {
    return;
  }

  try {
    const res = await fetch(`/api/charts/configs/${configId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete chart");

    // Remove DOM + instance
    const card = btn.closest(".chart-card");
    const chartId = card.dataset.id;
    
    if (charts[chartId]) {
      charts[chartId].destroy();
      delete charts[chartId];
    }
    
    card.remove();
  } catch (err) {
    console.error("Error deleting chart:", err);
    alert("Failed to delete chart. Please try again.");
  }
}

// ---------------------------
// Dummy data generator
// ---------------------------
function getDummyData(type, count) {
  const labels = Array.from({ length: count }, (_, i) => `Category ${i + 1}`);
  const data = Array.from({ length: count }, () => Math.floor(Math.random() * 500) + 50);

  return {
    labels,
    datasets: [{
      label: "Sample Data",
      data,
      backgroundColor: [
        "rgba(255, 99, 132, 0.8)",
        "rgba(54, 162, 235, 0.8)",
        "rgba(255, 206, 86, 0.8)",
        "rgba(75, 192, 192, 0.8)",
        "rgba(153, 102, 255, 0.8)",
        "rgba(255, 159, 64, 0.8)",
        "rgba(199, 199, 199, 0.8)"
      ],
      borderColor: "#fff",
      borderWidth: 2
    }]
  };
}

// ---------------------------
// Dummy time series data
// ---------------------------
function getDummyDataTimeSeries(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  
  const labels = [];
  const data = [];
  let balance = 1000;
  
  for (let i = 0; i <= days; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    labels.push(date.toLocaleDateString());
    
    balance += (Math.random() - 0.4) * 100;
    data.push(Math.round(balance));
  }
  
  return {
    labels,
    datasets: [{
      label: 'Account Balance',
      data,
      borderColor: 'rgba(54, 162, 235, 1)',
      backgroundColor: 'rgba(54, 162, 235, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4
    }]
  };
}

// ---------------------------
// Handle data source change
// ---------------------------
function handleDataSourceChange() {
  const dataSource = document.getElementById('dataSource').value;
  const tagFilterGroup = document.getElementById('tagFilterGroup');
  
  // Show tag filter only for expenses-by-tag
  if (dataSource === 'expenses-by-tag') {
    tagFilterGroup.style.display = 'block';
  } else {
    tagFilterGroup.style.display = 'none';
  }
}

// ---------------------------
// Initialize on page load
// ---------------------------
document.addEventListener("DOMContentLoaded", () => {
  const budgetId = 1; // TODO: replace with logged-in user's budget
  loadCharts(budgetId);

  // Set default dates (last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  document.getElementById('endDate').valueAsDate = today;
  document.getElementById('startDate').valueAsDate = thirtyDaysAgo;

  // Hook up buttons
  document.getElementById('addChartBtn').addEventListener('click', () => toggleChartForm(true));
  document.getElementById('cancelChartBtn').addEventListener('click', () => toggleChartForm(false));
  document.getElementById('saveChartBtn').addEventListener('click', addChart);
  document.getElementById('dataSource').addEventListener('change', handleDataSourceChange);
});