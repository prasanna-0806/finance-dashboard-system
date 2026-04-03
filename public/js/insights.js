// insights.js
document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    loadInsightsSummary(),
    loadInsightsMonthly(),
    loadInsightsWeekly(),
    loadInsightsCategories(),
  ]);
});

async function loadInsightsSummary() {
  try {
    const s = await apiFetch('/api/dashboard/summary');
    document.getElementById('insIncome').textContent   = formatINR(s.total_income   || 0);
    document.getElementById('insExpenses').textContent = formatINR(s.total_expenses || 0);
    document.getElementById('insBalance').textContent  = formatINR(s.net_balance    || 0);
  } catch (e) { console.error('Summary failed', e); }
}

async function loadInsightsMonthly() {
  try {
    const trends = await apiFetch('/api/dashboard/trends/monthly');
    const labels = trends.map(t => {
      const d = new Date(t.month + '-01');
      return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    });
    const ctx = document.getElementById('insMonthlyChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Income',   data: trends.map(t => Number(t.income   || 0)), backgroundColor: 'rgba(79,255,176,0.6)',  borderColor: 'rgba(79,255,176,0.9)',  borderWidth: 1, borderRadius: 4 },
          { label: 'Expenses', data: trends.map(t => Number(t.expenses || 0)), backgroundColor: 'rgba(255,107,107,0.5)', borderColor: 'rgba(255,107,107,0.8)', borderWidth: 1, borderRadius: 4 },
        ],
      },
      options: chartOptions(),
    });
  } catch (e) { console.error('Monthly trend failed', e); }
}

async function loadInsightsWeekly() {
  try {
    const trends = await apiFetch('/api/dashboard/trends/weekly');
    const labels = trends.map(t => {
      const d = new Date(t.week_start);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    });
    const ctx = document.getElementById('insWeeklyChart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Income',   data: trends.map(t => Number(t.income   || 0)), borderColor: 'rgba(79,255,176,0.9)',  backgroundColor: 'rgba(79,255,176,0.08)',  tension: 0.3, fill: true, pointRadius: 3 },
          { label: 'Expenses', data: trends.map(t => Number(t.expenses || 0)), borderColor: 'rgba(255,107,107,0.8)', backgroundColor: 'rgba(255,107,107,0.06)', tension: 0.3, fill: true, pointRadius: 3 },
        ],
      },
      options: chartOptions(),
    });
  } catch (e) { console.error('Weekly trend failed', e); }
}

async function loadInsightsCategories() {
  try {
    const cats = await apiFetch('/api/dashboard/categories');

    // Doughnut chart (all categories)
    const top8 = cats.slice(0, 8);
    const palette = ['#4fffb0','#7cb9e8','#ff6b6b','#ffd166','#a78bfa','#fb923c','#34d399','#f472b6'];
    const ctx = document.getElementById('insCategoryChart').getContext('2d');
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: top8.map(c => c.category),
        datasets: [{
          data: top8.map(c => Math.abs(Number(c.total || 0))),
          backgroundColor: palette.map(c => c + '99'),
          borderColor: palette,
          borderWidth: 1,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#8a95a3', font: { family: 'DM Mono', size: 10 }, boxWidth: 10, padding: 12 } },
          tooltip: { backgroundColor: '#1f242c', titleColor: '#e8ecf0', bodyColor: '#8a95a3' },
        },
        cutout: '65%',
      },
    });

    // Top expense categories bar list
    const expenses = cats.filter(c => c.type === 'expense');
    const maxExp = Math.max(...expenses.map(c => Number(c.total)), 1);
    document.getElementById('insExpenseCats').innerHTML = expenses.slice(0, 6).map(c => `
      <div class="cat-row">
        <div class="cat-row__top">
          <span class="cat-row__name">${c.category}</span>
          <span class="cat-row__amt" style="color:var(--expense)">${formatINR(c.total)}</span>
        </div>
        <div class="cat-row__track">
          <div class="cat-row__fill" style="width:${(Number(c.total)/maxExp*100).toFixed(1)}%;background:var(--expense)"></div>
        </div>
      </div>
    `).join('') || '<p class="no-data">No expense data yet.</p>';

    // Income vs expense breakdown
    const incomes = cats.filter(c => c.type === 'income');
    const allMax = Math.max(...cats.map(c => Number(c.total)), 1);
    document.getElementById('insBreakdown').innerHTML = [
      '<div class="breakdown-col"><h3>Income</h3>' +
        incomes.slice(0, 8).map(c => catRow(c, allMax, 'var(--income)')).join('') +
      '</div>',
      '<div class="breakdown-col"><h3>Expenses</h3>' +
        expenses.slice(0, 8).map(c => catRow(c, allMax, 'var(--expense)')).join('') +
      '</div>',
    ].join('');

  } catch (e) { console.error('Categories failed', e); }
}

function catRow(c, max, color) {
  return `
    <div class="cat-row">
      <div class="cat-row__top">
        <span class="cat-row__name">${c.category}</span>
        <span class="cat-row__amt" style="color:${color}">${formatINR(c.total)}</span>
      </div>
      <div class="cat-row__track">
        <div class="cat-row__fill" style="width:${(Number(c.total)/max*100).toFixed(1)}%;background:${color}"></div>
      </div>
    </div>`;
}

function chartOptions() {
  return {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#8a95a3', font: { family: 'DM Mono', size: 11 } } },
      tooltip: { backgroundColor: '#1f242c', titleColor: '#e8ecf0', bodyColor: '#8a95a3' },
    },
    scales: {
      x: { ticks: { color: '#4a5568', font: { family: 'DM Mono', size: 10 } }, grid: { color: '#1f242c' } },
      y: {
        ticks: {
          color: '#4a5568', font: { family: 'DM Mono', size: 10 },
          callback: v => '₹' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v),
        },
        grid: { color: '#1f242c' },
      },
    },
  };
}
