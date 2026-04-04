const API = 'http://localhost:3000';

// ── Token helpers ────────────────────────────────────────────────
function getToken()        { return localStorage.getItem('fin_token'); }
function setToken(t)       { localStorage.setItem('fin_token', t); }
function getUser()         { return JSON.parse(localStorage.getItem('fin_user') || 'null'); }
function setUser(u)        { localStorage.setItem('fin_user', JSON.stringify(u)); }
function clearSession()    { localStorage.removeItem('fin_token'); localStorage.removeItem('fin_user'); }

// ── API helper ───────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearSession();
    window.location.href = '/html/login.html';
    throw new Error('Unauthorized');
  }

  const data = res.headers.get('content-type')?.includes('text/csv')
    ? await res.text()
    : await res.json();

  if (!res.ok) throw { status: res.status, data };
  return data;
}

// ── Format helpers ───────────────────────────────────────────────
function formatINR(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// FIX: DB/JWT returns role as a string ('admin', 'analyst', 'viewer'), not a number.
// Old roleName() only handled numbers → always fell through to String(role).
// Now handles both so the sidebar role label displays correctly.
function roleName(role) {
  if (typeof role === 'string') return role;
  return { 1: 'viewer', 2: 'analyst', 3: 'admin' }[role] || String(role);
}

// FIX: isAdmin() was called in initSidebar() but was never defined anywhere.
// This caused a ReferenceError that crashed every page after login —
// the sidebar never rendered, logout never wired up, admin nav never hidden.
function isAdmin(role) {
  return role === 'admin' || role === 3;
}

function isAnalystOrAbove(role) {
  return role === 'admin' || role === 'analyst' || role >= 2;
}

// ── Auth guard ───────────────────────────────────────────────────
function requireAuth() {
  if (!getToken()) {
    window.location.href = '/html/login.html';
    return false;
  }
  return true;
}

// ── Sidebar init ─────────────────────────────────────────────────
function initSidebar() {
  const user = getUser();
  if (!user) return;

  const nameEl   = document.getElementById('sidebarUserName');
  const roleEl   = document.getElementById('sidebarUserRole');
  const avatarEl = document.getElementById('userAvatar');
  if (nameEl)   nameEl.textContent   = user.name || user.email;
  if (roleEl)   roleEl.textContent   = roleName(user.role);
  if (avatarEl) avatarEl.textContent = (user.name || user.email || 'U')[0].toUpperCase();

  // Hide admin-only elements for non-admins
  if (!isAdmin(user.role)) {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
  }

  // Hide analyst-only elements for viewers
  if (!isAnalystOrAbove(user.role)) {
    document.querySelectorAll('.analyst-only').forEach(el => el.classList.add('hidden'));
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearSession();
      window.location.href = '/html/login.html';
    });
  }
}

// ── Topbar date ──────────────────────────────────────────────────
function initTopbarDate() {
  const el = document.getElementById('topbarDate');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// Run on every page (except login)
if (!window.location.pathname.includes('login')) {
  document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    initSidebar();
    initTopbarDate();
  });
}