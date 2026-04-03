// dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
  await loadKPIs();
  await loadTrend();
  await loadCategories();
  await loadRecent();
});

async function loadKPIs() {
  try {
    const summary = await apiFetch('/api/dashboard/summary');
    document.getElementById('kpiIncome').textContent   = formatINR(summary.total_income   || 0);
    document.getElementById('kpiExpenses').textContent = formatINR(summary.total_expenses || 0);
    document.getElementById('kpiBalance').textContent  = formatINR(summary.net_balance    || 0);
  } catch (e) {
    console.error('KPI load failed', e);
  }
}

async function loadTrend() {
  try {
    const trends = await apiFetch('/api/dashboard/trends/monthly');
    const labels = trends.map(t => {
      const d = new Date(t.month + '-01');
      return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    });

    const ctx = document.getElementById('trendChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Income',
            data: trends.map(t => Number(t.income || 0)),
            backgroundColor: 'rgba(79,255,176,0.6)',
            borderColor: 'rgba(79,255,176,0.9)',
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'Expenses',
            data: trends.map(t => Number(t.expenses || 0)),
            backgroundColor: 'rgba(255,107,107,0.5)',
            borderColor: 'rgba(255,107,107,0.8)',
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#8a95a3', font: { family: 'DM Mono', size: 11 } } },
          tooltip: { backgroundColor: '#1f242c', titleColor: '#e8ecf0', bodyColor: '#8a95a3' },
        },
        scales: {
          x: { ticks: { color: '#4a5568', font: { family: 'DM Mono', size: 10 } }, grid: { color: '#1f242c' } },
          y: {
            ticks: {
              color: '#4a5568',
              font: { family: 'DM Mono', size: 10 },
              callback: v => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v),
            },
            grid: { color: '#1f242c' },
          },
        },
      },
    });
  } catch (e) {
    console.error('Trend load failed', e);
  }
}

async function loadCategories() {
  try {
    const cats = await apiFetch('/api/dashboard/categories');
    const top = cats.slice(0, 8);
    const palette = [
      '#4fffb0','#7cb9e8','#ff6b6b','#ffd166','#a78bfa','#fb923c','#34d399','#f472b6'
    ];
    const ctx = document.getElementById('categoryChart').getContext('2d');
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: top.map(c => c.category),
        datasets: [{
          data: top.map(c => Math.abs(Number(c.total || 0))),
          backgroundColor: palette.map(c => c + '99'),
          borderColor: palette,
          borderWidth: 1,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#8a95a3', font: { family: 'DM Mono', size: 10 }, boxWidth: 10, padding: 12 },
          },
          tooltip: { backgroundColor: '#1f242c', titleColor: '#e8ecf0', bodyColor: '#8a95a3' },
        },
        cutout: '65%',
      },
    });
  } catch (e) {
    console.error('Category load failed', e);
  }
}

async function loadRecent() {
  const tbody = document.getElementById('recentTableBody');
  try {
    const recent = await apiFetch('/api/dashboard/recent');
    if (!recent || recent.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="loading-row">No recent activity.</td></tr>';
      return;
    }
    tbody.innerHTML = recent.map(r => `
      <tr>
        <td class="date-cell">${formatDate(r.date)}</td>
        <td>${r.category || '—'}</td>
        <td style="color:var(--text-secondary)">${r.notes || '—'}</td>
        <td><span class="badge badge--${r.type}">${r.type}</span></td>
        <td class="text-right amount--${r.type}">${formatINR(r.amount)}</td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading-row">Failed to load activity.</td></tr>';
  }
}
