// records.js
let currentPage = 1;
let currentFilters = {};
let searchDebounceTimer;

document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  loadRecords();

  // Debounced search
  document.getElementById('searchInput').addEventListener('input', e => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      currentPage = 1;
      currentFilters.search = e.target.value.trim() || undefined;
      loadRecords();
    }, 350);
  });

  document.getElementById('applyFilterBtn').addEventListener('click', () => {
    currentPage = 1;
    currentFilters = {
      search:   document.getElementById('searchInput').value.trim()    || undefined,
      type:     document.getElementById('typeFilter').value            || undefined,
      dateFrom: document.getElementById('dateFromFilter').value        || undefined,
      dateTo:   document.getElementById('dateToFilter').value          || undefined,
    };
    loadRecords();
  });

  document.getElementById('clearFilterBtn').addEventListener('click', () => {
    document.getElementById('searchInput').value   = '';
    document.getElementById('typeFilter').value    = '';
    document.getElementById('dateFromFilter').value = '';
    document.getElementById('dateToFilter').value   = '';
    currentPage = 1;
    currentFilters = {};
    loadRecords();
  });

  // CSV Export
  document.getElementById('exportCsvBtn').addEventListener('click', async e => {
    e.preventDefault();
    try {
      const params = buildParams({ ...currentFilters });
      const qs = params.toString() ? '?' + params.toString() : '';
      const token = getToken();
      const res = await fetch(`http://localhost:3000/api/records/export${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `records-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed. Make sure you have analyst or admin access.');
    }
  });

  // Modal — Admin only
  if (user && user.role >= 3) {
    document.getElementById('addRecordBtn').addEventListener('click', () => openModal());
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    document.getElementById('modalSaveBtn').addEventListener('click', saveRecord);
    document.getElementById('recordModal').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModal();
    });
  }
});

function buildParams(filters) {
  const p = new URLSearchParams();
  if (filters.search)   p.set('search', filters.search);
  if (filters.type)     p.set('type', filters.type);
  if (filters.dateFrom) p.set('dateFrom', filters.dateFrom);
  if (filters.dateTo)   p.set('dateTo', filters.dateTo);
  return p;
}

async function loadRecords() {
  const tbody = document.getElementById('recordsTableBody');
  tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Loading…</td></tr>';

  const params = buildParams(currentFilters);
  params.set('page', currentPage);
  params.set('limit', 15);

  try {
    const result = await apiFetch(`/api/records?${params.toString()}`);
    renderTable(result.data);
    renderPagination(result.pagination);
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Failed to load records.</td></tr>';
  }
}

function renderTable(records) {
  const tbody  = document.getElementById('recordsTableBody');
  const user   = getUser();
  const isAdmin = user && user.role >= 3;

  if (!records || records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row">No records found.</td></tr>';
    return;
  }

  tbody.innerHTML = records.map(r => `
    <tr>
      <td class="date-cell">${formatDate(r.date)}</td>
      <td>${r.category || '—'}</td>
      <td style="color:var(--text-secondary);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.notes || '—'}</td>
      <td><span class="badge badge--${r.type}">${r.type}</span></td>
      <td class="text-right amount--${r.type}">${formatINR(r.amount)}</td>
      <td class="text-center admin-only ${isAdmin ? '' : 'hidden'}">
        <button class="action-btn" onclick="editRecord(${r.id})">Edit</button>
        <button class="action-btn action-btn--delete" onclick="deleteRecord(${r.id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

function renderPagination({ page, pages }) {
  const el = document.getElementById('pagination');
  if (pages <= 1) { el.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="goPage(${page - 1})" ${page <= 1 ? 'disabled' : ''}>‹</button>`;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 2) {
      html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
    } else if (Math.abs(i - page) === 3) {
      html += `<span style="color:var(--text-dim);padding:0 4px">…</span>`;
    }
  }
  html += `<button class="page-btn" onclick="goPage(${page + 1})" ${page >= pages ? 'disabled' : ''}>›</button>`;
  el.innerHTML = html;
}

function goPage(p) {
  currentPage = p;
  loadRecords();
}

// ── Modal ────────────────────────────────────────────────────────
function openModal(record = null) {
  document.getElementById('modalTitle').textContent = record ? 'Edit Record' : 'Add Record';
  document.getElementById('recordId').value         = record?.id || '';
  document.getElementById('fieldAmount').value      = record?.amount || '';
  document.getElementById('fieldType').value        = record?.type || 'income';
  document.getElementById('fieldCategory').value    = record?.category || '';
  document.getElementById('fieldDate').value        = record?.date ? record.date.split('T')[0] : '';
  document.getElementById('fieldNotes').value       = record?.notes || '';
  document.getElementById('fieldDescription').value = record?.description || '';
  document.getElementById('recordModal').classList.add('open');
}

function closeModal() {
  document.getElementById('recordModal').classList.remove('open');
}

async function editRecord(id) {
  try {
    const record = await apiFetch(`/api/records/${id}`);
    openModal(record);
  } catch (e) { alert('Could not load record.'); }
}

async function deleteRecord(id) {
  if (!confirm('Soft-delete this record? It can be recovered from the database.')) return;
  try {
    await apiFetch(`/api/records/${id}`, { method: 'DELETE' });
    loadRecords();
  } catch (e) { alert('Delete failed.'); }
}

async function saveRecord() {
  const id = document.getElementById('recordId').value;
  const body = {
    amount:      parseFloat(document.getElementById('fieldAmount').value),
    type:        document.getElementById('fieldType').value,
    category:    document.getElementById('fieldCategory').value.trim(),
    date:        document.getElementById('fieldDate').value,
    notes:       document.getElementById('fieldNotes').value.trim(),
    description: document.getElementById('fieldDescription').value.trim(),
  };

  if (!body.amount || !body.category || !body.date) {
    alert('Amount, category, and date are required.'); return;
  }

  try {
    if (id) {
      await apiFetch(`/api/records/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    } else {
      await apiFetch('/api/records', { method: 'POST', body: JSON.stringify(body) });
    }
    closeModal();
    loadRecords();
  } catch (e) {
    const msg = e?.data?.errors?.[0]?.msg || e?.data?.error || 'Save failed.';
    alert(msg);
  }
}
