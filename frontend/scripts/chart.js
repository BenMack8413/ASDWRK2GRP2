let chartCount = 0; // unique ids for canvases
const charts = {};  // store chart instances so we can destroy later

// dummy data generator
function getDummyData(type, days = 7) {
  const labels = Array.from({ length: days }, (_, i) => `Day ${i + 1}`);
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
      label: `Last ${days} Days`,
      data: values,
      backgroundColor: "#3b82f6",
      borderColor: "#3b82f6",
      fill: type === "line" ? false : true
    }]
  };
}

// add 
function addChart() {
  const type = document.getElementById("chartType").value;
  const chartId = `chart-${chartCount++}`;

  const card = document.createElement("div");
  card.classList.add("chart-card");
  card.setAttribute("draggable", "true");
  card.dataset.id = chartId;

  card.innerHTML = `
    <div class="chart-header">
      <h3>${type.charAt(0).toUpperCase() + type.slice(1)} Chart</h3>
      <div>
        <select onchange="updateChartRange('${chartId}', this.value)">
          <option value="7" selected>7 Days</option>
          <option value="30">30 Days</option>
          <option value="90">90 Days</option>
        </select>
        <button class="delete-btn" onclick="deleteChart('${chartId}', this)">Delete</button>
      </div>
    </div>
    <canvas id="${chartId}" height="200"></canvas>
  `;

  document.getElementById("chartsArea").appendChild(card);

  const ctx = document.getElementById(chartId).getContext("2d");
  charts[chartId] = new Chart(ctx, {
    type,
    data: getDummyData(type, 7),
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// update
function updateChartRange(id, days) {
  if (charts[id]) {
    const chart = charts[id];
    chart.data = getDummyData(chart.config.type, parseInt(days));
    chart.update();
  }
}

// delete
function deleteChart(id, btn) {
  if (charts[id]) {
    charts[id].destroy();
    delete charts[id];
  }
  btn.closest(".chart-card").remove();
}

// drag-and-drop
const chartsArea = document.getElementById("chartsArea");

chartsArea.addEventListener("dragstart", e => {
  if (e.target.classList.contains("chart-card")) {
    e.dataTransfer.setData("text/plain", e.target.dataset.id);
    e.target.classList.add("dragging");
  }
});

chartsArea.addEventListener("dragend", e => {
  if (e.target.classList.contains("chart-card")) {
    e.target.classList.remove("dragging");
  }
});

chartsArea.addEventListener("dragover", e => {
  e.preventDefault();
  const dragging = document.querySelector(".dragging");
  const afterElement = getDragAfterElement(chartsArea, e.clientY);
  if (afterElement == null) {
    chartsArea.appendChild(dragging);
  } else {
    chartsArea.insertBefore(dragging, afterElement);
  }
});

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".chart-card:not(.dragging)")];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}
