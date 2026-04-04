document.addEventListener('DOMContentLoaded', () => {
  if (getToken()) {
    window.location.href = '/html/dashboard.html';
    return;
  }

  // ── Login ──
  const loginView     = document.getElementById('loginView');
  const emailInput    = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  const loginBtn      = document.getElementById('loginBtn');
  const errorEl       = document.getElementById('loginError');

  function showError(msg) { errorEl.textContent = msg; errorEl.style.display = 'block'; }

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
      window.location.href = '/html/dashboard.html';
    } catch (err) {
      showError(err?.data?.error || 'Invalid email or password.');
      loginBtn.textContent = 'Sign In';
      loginBtn.disabled = false;
    }
  }

  loginBtn.addEventListener('click', doLogin);
  passwordInput.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  // ── Register ──
  const registerView    = document.getElementById('registerView');
  const regNameInput    = document.getElementById('regName');
  const regEmailInput   = document.getElementById('regEmail');
  const regPassInput    = document.getElementById('regPassword');
  const registerBtn     = document.getElementById('registerBtn');
  const registerError   = document.getElementById('registerError');
  const registerSuccess = document.getElementById('registerSuccess');

  document.getElementById('showRegister').addEventListener('click', e => {
    e.preventDefault();
    loginView.style.display = 'none';
    registerView.style.display = 'block';
  });

  document.getElementById('showLogin').addEventListener('click', e => {
    e.preventDefault();
    registerView.style.display = 'none';
    loginView.style.display = 'block';
  });

  async function doRegister() {
    registerError.style.display = 'none';
    registerSuccess.style.display = 'none';
    const name     = regNameInput.value.trim();
    const email    = regEmailInput.value.trim();
    const password = regPassInput.value;
    if (!name || !email || !password) { registerError.textContent = 'All fields are required.'; registerError.style.display = 'block'; return; }
    registerBtn.textContent = 'Creating…';
    registerBtn.disabled = true;
    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      registerSuccess.textContent = 'Account created! You can now sign in.';
      registerSuccess.style.display = 'block';
      registerBtn.textContent = 'Create Account';
      registerBtn.disabled = false;
      setTimeout(() => {
        registerView.style.display = 'none';
        loginView.style.display = 'block';
        emailInput.value = email;
      }, 1500);
    } catch (err) {
      registerError.textContent = err?.data?.error || 'Registration failed.';
      registerError.style.display = 'block';
      registerBtn.textContent = 'Create Account';
      registerBtn.disabled = false;
    }
  }

  registerBtn.addEventListener('click', doRegister);
  regPassInput.addEventListener('keydown', e => { if (e.key === 'Enter') doRegister(); });
});