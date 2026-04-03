// records.js
let currentPage = 1;
let currentFilters = {};
let searchDebounceTimer;
let recordsFlashTimer;

function showRecordsFlash(message) {
  const el = document.getElementById('recordsFlash');
  if (!el) return;
  clearTimeout(recordsFlashTimer);
  el.textContent = message;
  el.hidden = false;
  recordsFlashTimer = setTimeout(() => {
    el.hidden = true;
    el.textContent = '';
  }, 4500);
}

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
    // FIX: toISODate() normalises whatever the date input gives us before storing —
    // so even if the browser shows dd-mm-yyyy, we always store a valid YYYY-MM-DD or undefined.
    currentFilters = {
      search:   document.getElementById('searchInput').value.trim()              || undefined,
      type:     document.getElementById('typeFilter').value                      || undefined,
      dateFrom: toISODate(document.getElementById('dateFromFilter').value)       || undefined,
      dateTo:   toISODate(document.getElementById('dateToFilter').value)         || undefined,
    };
    loadRecords();
  });

  document.getElementById('clearFilterBtn').addEventListener('click', () => {
    document.getElementById('searchInput').value    = '';
    document.getElementById('typeFilter').value     = '';
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
      const res = await fetch(`https://finance-dashboard-system-5noe.onrender.com/api/records/export${qs}`, {
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

  // FIX: role from DB/JWT is a string ('admin'), not a number (3).
  // Old code: user.role >= 3  → always false for string 'admin'
  // Fixed:    isAdmin(user.role) → works for both string and numeric roles
  if (user && isAdmin(user.role)) {
    document.getElementById('addRecordBtn').addEventListener('click', () => openModal());
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    document.getElementById('modalSaveBtn').addEventListener('click', saveRecord);
    document.getElementById('recordModal').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModal();
    });
  }
});

// FIX: converts any date string to YYYY-MM-DD, or returns null if invalid.
// Prevents browser locale dates (dd-mm-yyyy) or placeholder strings from
// being sent to the backend's isISO8601() validator, which rejects them with
// a 422 → the frontend then shows "Failed to load records."
function toISODate(val) {
  if (!val || typeof val !== 'string') return null;
  // Already ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  // Try parsing anyway
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

function buildParams(filters) {
  const p = new URLSearchParams();
  if (filters.search)   p.set('search', filters.search);
  if (filters.type)     p.set('type', filters.type);
  // FIX: only append dates if they are valid ISO strings — never send placeholder or garbage
  const from = toISODate(filters.dateFrom);
  const to   = toISODate(filters.dateTo);
  if (from) p.set('dateFrom', from);
  if (to)   p.set('dateTo', to);
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
    // FIX: show the actual error from the server if available, not just a generic message
    const msg = e?.data?.errors?.[0]?.msg || e?.data?.error || 'Failed to load records.';
    tbody.innerHTML = `<tr><td colspan="6" class="loading-row">${msg}</td></tr>`;
  }
}

function renderTable(records) {
  const tbody   = document.getElementById('recordsTableBody');
  const user    = getUser();
  // FIX: same string-based role check here
  const adminUser = user && isAdmin(user.role);

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
      <td class="text-center admin-only ${adminUser ? '' : 'hidden'}">
        <button class="action-btn" onclick="editRecord('${r.id}')">Edit</button>
        <button class="action-btn action-btn--delete" onclick="deleteRecord('${r.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

function renderPagination({ page, pages }) {
  const el = document.getElementById('pagination');
  if (!pages || pages <= 1) { el.innerHTML = ''; return; }

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
  document.getElementById('modalTitle').textContent  = record ? 'Edit Record' : 'Add Record';
  document.getElementById('recordId').value          = record?.id || '';
  document.getElementById('fieldAmount').value       = record?.amount || '';
  document.getElementById('fieldType').value         = record?.type || 'income';
  document.getElementById('fieldCategory').value     = record?.category || '';
  // FIX: was '' for new records — blank date fails isISO8601() validation on the backend.
  // Default to today so the field is always pre-filled when adding a new record.
  document.getElementById('fieldDate').value         = record?.date ? record.date.split('T')[0] : new Date().toISOString().split('T')[0];
  document.getElementById('fieldNotes').value        = record?.notes || '';
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
    showRecordsFlash('Record deleted successfully.');
    loadRecords();
  } catch (e) { alert('Delete failed.'); }
}

async function saveRecord() {
  const id = document.getElementById('recordId').value;
  const body = {
    amount:      parseFloat(document.getElementById('fieldAmount').value),
    type:        document.getElementById('fieldType').value,
    category:    document.getElementById('fieldCategory').value.trim(),
    // FIX: browser date inputs can display in locale format (DD-MM-YYYY) but their
    // .value is always YYYY-MM-DD internally. However if the date somehow arrives
    // in a non-ISO format, parse and re-format it so the backend isISO8601() validator
    // never rejects it with a 422 "Failed to create record" error.
    date: (() => {
      const raw = document.getElementById('fieldDate').value;
      if (!raw) return '';
      const d = new Date(raw);
      return isNaN(d) ? raw : d.toISOString().split('T')[0];
    })(),
    notes:       document.getElementById('fieldNotes').value.trim(),
  };

  if (!body.amount || !body.category || !body.date) {
    alert('Amount, category, and date are required.'); return;
  }

  try {
    if (id) {
      await apiFetch(`/api/records/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      showRecordsFlash('Record updated successfully.');
    } else {
      await apiFetch('/api/records', { method: 'POST', body: JSON.stringify(body) });
      showRecordsFlash('Record created successfully.');
    }
    closeModal();
    loadRecords();
  } catch (e) {
    const msg = e?.data?.errors?.[0]?.msg || e?.data?.error || 'Save failed.';
    alert(msg);
  }
}