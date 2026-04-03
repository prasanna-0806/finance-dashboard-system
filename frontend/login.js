// login.js
document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect
  if (getToken()) {
    window.location.href = 'dashboard.html';
    return;
  }

  const emailInput    = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  const loginBtn      = document.getElementById('loginBtn');
  const errorEl       = document.getElementById('loginError');

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }

  async function doLogin() {
    errorEl.style.display = 'none';
    const email    = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) { showError('Please enter email and password.'); return; }

    loginBtn.textContent = 'Signing in…';
    loginBtn.disabled = true;

    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setToken(data.token);
      setUser(data.user);
      window.location.href = 'dashboard.html';
    } catch (err) {
      const msg = err?.data?.error || 'Invalid email or password.';
      showError(msg);
      loginBtn.textContent = 'Sign In';
      loginBtn.disabled = false;
    }
  }

  loginBtn.addEventListener('click', doLogin);
  passwordInput.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
});
