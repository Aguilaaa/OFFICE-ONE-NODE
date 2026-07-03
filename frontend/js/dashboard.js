const API_URL = 'http://localhost:4000/api/v1';
const getToken = () => JSON.parse(sessionStorage.getItem('token'));

const checkAdmin = () => {
  const user = JSON.parse(sessionStorage.getItem('user') || 'null');
  if (!user || user.role !== 'admin') {
    Swal.fire({ icon: 'warning', text: 'Admin access required.' }).then(() => window.location.href = '../login.html');
    return false;
  }
  return true;
};

let barChart, lineChart, pieChart;

const chartGrid = { color: 'rgba(148, 163, 184, 0.18)' };
const chartTicks = { color: '#64748b', font: { family: "'Segoe UI', system-ui, sans-serif" } };
const chartLegend = { labels: { color: '#475569', usePointStyle: true, boxWidth: 8 } };

const buildCharts = (data) => {
  const orders = data.recentOrders || [];
  const dayLabels = [];
  const dayCounts = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
    dayCounts.push(orders.filter((o) => new Date(o.createdAt).toDateString() === d.toDateString()).length);
  }

  if (barChart) barChart.destroy();
  const barCtx = document.getElementById('barChart').getContext('2d');
  const barGradient = barCtx.createLinearGradient(0, 0, 0, 260);
  barGradient.addColorStop(0, 'rgba(37, 99, 235, 0.9)');
  barGradient.addColorStop(1, 'rgba(56, 189, 248, 0.42)');
  barChart = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels: dayLabels,
      datasets: [{ label: 'Orders', data: dayCounts, backgroundColor: barGradient, borderRadius: 12, maxBarThickness: 42 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f172a', padding: 12 } },
      scales: {
        x: { grid: { display: false }, ticks: chartTicks },
        y: { beginAtZero: true, grid: chartGrid, ticks: { ...chartTicks, precision: 0 } }
      }
    }
  });

  const monthly = data.monthlySales || [];
  if (lineChart) lineChart.destroy();
  const lineCtx = document.getElementById('lineChart').getContext('2d');
  const lineGradient = lineCtx.createLinearGradient(0, 0, 0, 260);
  lineGradient.addColorStop(0, 'rgba(13, 148, 136, 0.18)');
  lineGradient.addColorStop(1, 'rgba(13, 148, 136, 0)');
  lineChart = new Chart(document.getElementById('lineChart'), {
    type: 'line',
    data: {
      labels: monthly.map((m) => m.month),
      datasets: [{
        label: 'Revenue (PHP)',
        data: monthly.map((m) => parseFloat(m.revenue)),
        borderColor: '#0d9488',
        backgroundColor: lineGradient,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#0d9488',
        pointBorderWidth: 2,
        pointRadius: 4,
        tension: 0.38,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: chartLegend, tooltip: { backgroundColor: '#0f172a', padding: 12 } },
      scales: {
        x: { grid: { display: false }, ticks: chartTicks },
        y: { beginAtZero: true, grid: chartGrid, ticks: chartTicks }
      }
    }
  });

  const catMap = {};
  (data.categorySales || []).forEach((row) => { catMap[row.category] = parseFloat(row.amount); });
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(document.getElementById('pieChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(catMap),
      datasets: [{
        data: Object.values(catMap),
        backgroundColor: ['#2563eb', '#0d9488', '#7c3aed', '#f59e0b'],
        borderColor: 'rgba(255, 255, 255, 0.85)',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: { legend: { ...chartLegend, position: 'bottom' }, tooltip: { backgroundColor: '#0f172a', padding: 12 } }
    }
  });
};

$(document).ready(() => {
  if (!checkAdmin()) return;
  $.ajax({
    url: `${API_URL}/dashboard`,
    headers: { Authorization: `Bearer ${getToken()}` },
    success: (data) => {
      const s = data.stats;
      $('#stat-products').text(s.totalProducts);
      $('#stat-users').text(s.totalUsers);
      $('#stat-orders').text(s.totalOrders);
      $('#stat-revenue').text(`PHP ${parseFloat(s.totalRevenue).toFixed(2)}`);
      buildCharts(data);
    },
    error: () => Swal.fire('Error', 'Could not load dashboard', 'error')
  });
});
