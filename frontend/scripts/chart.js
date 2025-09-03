let chartCount = 0; // unique ids for canvases
const charts = {};  // store chart instances so we can destroy later

// dummy data generator
function getDummyData(type) {
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const values = labels.map(() => Math.floor(Math.random() * 100) + 20);

  if (type === "pie") {
    return {
      labels: ["Rent", "Food", "Transport", "Shopping", "Other"],
      datasets: [{
        data: [500, 300, 200, 150, 100],
        backgroundColor: ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6"]
      }]
    };
  }

  return {
    labels,
    datasets: [{
      label: "Dummy Data",
      data: values,
      backgroundColor: "#3b82f6",
      borderColor: "#3b82f6",
      fill: type === "line" ? false : true
    }]
  };
}

// add chart
function addChart() {
  const type = document.getElementById("chartType").value;
  const chartId = `chart-${chartCount++}`;

  // create card
  const card = document.createElement("div");
  card.classList.add("chart-card");
  card.innerHTML = `
    <div class="chart-header">
      <h3>${type.charAt(0).toUpperCase() + type.slice(1)} Chart</h3>
      <button class="delete-btn" onclick="deleteChart('${chartId}', this)">Delete</button>
    </div>
    <canvas id="${chartId}" height="200"></canvas>
  `;

  document.getElementById("chartsArea").appendChild(card);

  // create chart
  const ctx = document.getElementById(chartId).getContext("2d");
  charts[chartId] = new Chart(ctx, {
    type,
    data: getDummyData(type),
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// delete chart
function deleteChart(id, btn) {
  if (charts[id]) {
    charts[id].destroy();
    delete charts[id];
  }
  btn.closest(".chart-card").remove();
}
