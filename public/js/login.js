
// login.js
document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  if (getToken()) {
    window.location.href = '/html/dashboard.html';
    return;
  }

  //  Elements
  const slider      = document.querySelector('.form-slider');
  const tabLogin    = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');

  const loginError       = document.getElementById('loginError');
  const registerError    = document.getElementById('registerError');
  const registerSuccess  = document.getElementById('registerSuccess');

  //  Safety check
  if (!slider) {
    console.error('Slider not found. Check your HTML structure.');
    return;
  }

  //  Switch tabs (SLIDER LOGIC)
  function switchTab(tab) {
    // Clear messages
    loginError.style.display = 'none';
    registerError.style.display = 'none';
    registerSuccess.style.display = 'none';

    if (tab === 'login') {
      slider.classList.remove('show-register');

      tabLogin.classList.add('active');
      tabLogin.classList.remove('inactive');

      tabRegister.classList.remove('active');
      tabRegister.classList.add('inactive');
    } else {
      slider.classList.add('show-register');

      tabRegister.classList.add('active');
      tabRegister.classList.remove('inactive');

      tabLogin.classList.remove('active');
      tabLogin.classList.add('inactive');
    }
  }

  tabLogin.addEventListener('click', () => switchTab('login'));
  tabRegister.addEventListener('click', () => switchTab('register'));

  //  LOGIN
  const emailInput    = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  const loginBtn      = document.getElementById('loginBtn');

  function showLoginError(msg) {
    loginError.textContent = msg;
    loginError.style.display = 'block';
  }

  async function doLogin() {
    loginError.style.display = 'none';

    const email    = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showLoginError('Please enter email and password.');
      return;
    }

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
      showLoginError(err?.data?.error || 'Invalid email or password.');
      loginBtn.textContent = 'Sign In';
      loginBtn.disabled = false;
    }
  }

  loginBtn.addEventListener('click', doLogin);
  passwordInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });

  //  REGISTER
  const regNameInput  = document.getElementById('regName');
  const regEmailInput = document.getElementById('regEmail');
  const regPassInput  = document.getElementById('regPassword');
  const registerBtn   = document.getElementById('registerBtn');

  async function doRegister() {
    registerError.style.display = 'none';
    registerSuccess.style.display = 'none';

    const name     = regNameInput.value.trim();
    const email    = regEmailInput.value.trim();
    const password = regPassInput.value;

    if (!name || !email || !password) {
      registerError.textContent = 'All fields are required.';
      registerError.style.display = 'block';
      return;
    }

    registerBtn.textContent = 'Creating…';
    registerBtn.disabled = true;

    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });

      registerSuccess.textContent = 'Account created! Signing you in…';
      registerSuccess.style.display = 'block';

      //  Smooth switch to login
      setTimeout(() => {
        emailInput.value = email;
        passwordInput.value = '';
        switchTab('login');
      }, 1200);

    } catch (err) {
      registerError.textContent = err?.data?.error || 'Registration failed.';
      registerError.style.display = 'block';
    }

    registerBtn.textContent = 'Create Account';
    registerBtn.disabled = false;
  }

  registerBtn.addEventListener('click', doRegister);
  regPassInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') doRegister();
  });
});

