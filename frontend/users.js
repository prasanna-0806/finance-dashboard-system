// ── Load users ───────────────────────────────────────────
async function loadUsers() {
  try {
    const data = await apiFetch('/users');

    console.log('Users API:', data); // debug

    const users = data.users || [];

    const tbody = document.getElementById('usersTableBody');

    if (!users.length) {
      tbody.innerHTML = `<tr><td colspan="6">No users found</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(u => `
      <tr>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.role}</td>
        <td>${u.is_active ? 'Active' : 'Inactive'}</td>
        <td>${new Date(u.created_at).toLocaleDateString()}</td>
        <td>
          <button onclick="toggleStatus('${u.id}', ${!u.is_active})">
            ${u.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    console.error(err);
    document.getElementById('usersTableBody').innerHTML =
      `<tr><td colspan="6">Failed to load users</td></tr>`;
  }
}

// ── Change role ──────────────────────────────────────────
async function changeRole(id, role) {
  try {
    await apiFetch(`/users/${id}/role`, {
      method: 'PATCH',
      body: { role }
    });
    alert('Role updated');
    loadUsers();
  } catch (err) {
    alert(err.data?.error || err.message);
  }
}

// ── Toggle status ────────────────────────────────────────
async function toggleStatus(id, is_active) {
  try {
    await apiFetch(`/users/${id}/status`, {
      method: 'PATCH',
      body: { is_active }
    });
    alert('Status updated');
    loadUsers();
  } catch (err) {
    alert(err.data?.error || err.message);
  }
}

// ── Logout ───────────────────────────────────────────────
function logout() {
  localStorage.removeItem('fin_token');
  localStorage.removeItem('fin_user');
  window.location.href = 'login.html';
}

// ── Init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadUsers();
});