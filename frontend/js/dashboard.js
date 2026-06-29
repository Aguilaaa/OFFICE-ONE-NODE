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
  barChart = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: { labels: dayLabels, datasets: [{ label: 'Orders', data: dayCounts, backgroundColor: '#2563eb' }] },
    options: { responsive: true, plugins: { title: { display: true, text: 'Orders (Last 7 Days)' } } }
  });

  const monthly = data.monthlySales || [];
  if (lineChart) lineChart.destroy();
  lineChart = new Chart(document.getElementById('lineChart'), {
    type: 'line',
    data: {
      labels: monthly.map((m) => m.month),
      datasets: [{ label: 'Revenue (PHP)', data: monthly.map((m) => parseFloat(m.revenue)), borderColor: '#0d9488', fill: false }]
    },
    options: { responsive: true, plugins: { title: { display: true, text: 'Monthly Revenue (SQL computed)' } } }
  });

  const catMap = {};
  (data.categorySales || []).forEach((row) => { catMap[row.category] = parseFloat(row.amount); });
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(document.getElementById('pieChart'), {
    type: 'pie',
    data: {
      labels: Object.keys(catMap),
      datasets: [{ data: Object.values(catMap), backgroundColor: ['#2563eb', '#0d9488'] }]
    },
    options: { responsive: true, plugins: { title: { display: true, text: 'Sales by Category' } } }
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
      $('#stat-customers').text(s.totalCustomers);
      $('#stat-users').text(s.totalUsers);
      $('#stat-transactions').text(s.totalTransactions);
      $('#stat-revenue').text(`PHP ${parseFloat(s.totalRevenue).toFixed(2)}`);
      buildCharts(data);
    },
    error: () => Swal.fire('Error', 'Could not load dashboard', 'error')
  });
});
