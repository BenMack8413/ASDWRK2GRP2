// chart.js (frontend, persistent version)

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

  // Create chart card
  const card = document.createElement("div");
  card.classList.add("chart-card");
  card.dataset.id = chartId;

    card.innerHTML = `
    <div class="chart-header">
      <h3>${config.name}</h3>
      <button class="delete-btn" onclick="deleteChart('${config.config_id}', this)">Delete</button>
    </div>
    <canvas id="${chartId}" height="200"></canvas>
  `;

    document.getElementById('chartsArea').appendChild(card);

  // Render Chart.js instance
  const ctx = document.getElementById(chartId).getContext("2d");
  charts[chartId] = new Chart(ctx, {
    type: config.type,
    data: JSON.parse(config.config_json),
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// ---------------------------
// Add new chart
// ---------------------------
async function addChart() {
  const type = document.getElementById("chartType").value;
  const budgetId = 1; // TODO: replace with real logged-in budgetId

  // Dummy data generator (replace with real transaction/category data later)
  const config = getDummyData(type, 7);

  try {
    const res = await fetch("/api/charts/configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        budgetId,
        name: `${type} chart`,
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
      name: `${type} chart`,
      type,
      config_json: JSON.stringify(config)
    });
  } catch (err) {
    console.error("Error adding chart:", err);
  }
}

// ---------------------------
// Delete a chart
// ---------------------------
async function deleteChart(configId, btn) {
  try {
    const res = await fetch(`/api/charts/configs/${configId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete chart");

    // Remove DOM + instance
    btn.closest(".chart-card").remove();
    delete charts[`chart-${configId}`];
  } catch (err) {
    console.error("Error deleting chart:", err);
  }
}

// ---------------------------
// Dummy data generator
// ---------------------------
function getDummyData(type, count) {
  const labels = Array.from({ length: count }, (_, i) => `Item ${i + 1}`);
  const data = Array.from({ length: count }, () => Math.floor(Math.random() * 100));

  return {
    labels,
    datasets: [{
      label: "Sample Data",
      data,
      backgroundColor: [
        "rgba(255, 99, 132, 0.6)",
        "rgba(54, 162, 235, 0.6)",
        "rgba(255, 206, 86, 0.6)",
        "rgba(75, 192, 192, 0.6)",
        "rgba(153, 102, 255, 0.6)",
        "rgba(255, 159, 64, 0.6)",
        "rgba(199, 199, 199, 0.6)"
      ],
      borderColor: "#fff",
      borderWidth: 1
    }]
  };
}

// ---------------------------
// Initialize on page load
// ---------------------------
document.addEventListener("DOMContentLoaded", () => {
  const budgetId = 1; // TODO: replace with logged-in user’s budget
  loadCharts(budgetId);

  // Hook up Add button
  document.getElementById("addChartBtn").addEventListener("click", addChart);
});
