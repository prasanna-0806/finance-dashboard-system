// users.js

// ── Load users ───────────────────────────────────────────
async function loadUsers() {
  try {
    // FIX: was '/users' — missing /api prefix, so every request 404'd
    const data = await apiFetch('/api/users');

    const users = data.users || [];
    const tbody = document.getElementById('usersTableBody');

    if (!users.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="loading-row">No users found</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(u => `
      <tr>
        <td>${u.name}</td>
        <td style="font-family:var(--font-mono);font-size:13px">${u.email}</td>
        <td>
          <span class="badge badge--${u.role}">${u.role}</span>
        </td>
        <td>
          <span class="status-dot ${u.is_active ? 'active' : 'inactive'}"></span>
          ${u.is_active ? 'Active' : 'Inactive'}
        </td>
        <td style="color:var(--text-secondary);font-size:13px">
          ${new Date(u.created_at).toLocaleDateString('en-IN')}
        </td>
        <td class="text-center">
          <select class="filter-select" style="padding:5px 8px;font-size:12px"
                  onchange="changeRole('${u.id}', this.value)">
            <option ${u.role === 'viewer'  ? 'selected' : ''} value="viewer">Viewer</option>
            <option ${u.role === 'analyst' ? 'selected' : ''} value="analyst">Analyst</option>
            <option ${u.role === 'admin'   ? 'selected' : ''} value="admin">Admin</option>
          </select>
          <button class="action-btn" style="margin-left:6px"
                  onclick="toggleStatus('${u.id}', ${!u.is_active})">
            ${u.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    console.error(err);
    document.getElementById('usersTableBody').innerHTML =
      `<tr><td colspan="6" class="loading-row">Failed to load users</td></tr>`;
  }
}

// ── Change role ──────────────────────────────────────────
async function changeRole(id, role) {
  try {
    // FIX: was '/users/${id}/role' — missing /api prefix
    // FIX: body must be JSON.stringify'd; apiFetch does NOT auto-stringify plain objects
    await apiFetch(`/api/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    loadUsers();
  } catch (err) {
    alert(err?.data?.error || 'Failed to update role.');
  }
}

// ── Toggle status ────────────────────────────────────────
async function toggleStatus(id, is_active) {
  try {
    // FIX: was '/users/${id}/status' — missing /api prefix
    // FIX: body must be JSON.stringify'd
    await apiFetch(`/api/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }),
    });
    loadUsers();
  } catch (err) {
    alert(err?.data?.error || 'Failed to update status.');
  }
}

// ── Init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // FIX: No auth guard was called — non-logged-in users could open users.html directly.
  // requireAuth() is already called by app.js DOMContentLoaded, but guard here too
  // so loadUsers() doesn't fire before the redirect happens.
  if (!getToken()) return;
  loadUsers();

  // FIX: logout() was re-defined here, duplicating app.js's logoutBtn listener.
  // Removed — app.js's initSidebar() already wires up #logoutBtn correctly.
});
