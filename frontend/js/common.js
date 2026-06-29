const getToken = () => {
  const token = sessionStorage.getItem('token');
  return token ? JSON.parse(token) : null;
};

const getUser = () => {
  const user = sessionStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

const authHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const updateNav = () => {
  const user = getUser();
  const $auth = $('#nav-auth');
  const $admin = $('#nav-admin');
  if (user) {
    $auth.html(`
      <span class="text-muted mr-2"><i class="fas fa-user"></i> ${user.name}</span>
      <a href="#" id="btn-logout" class="btn btn-secondary btn-sm">Logout</a>
    `);
    if (user.role === 'admin') {
      $admin.show();
    }
  } else {
    $auth.html(`
      <a href="login.html">Login</a>
      <a href="register.html" class="btn btn-primary btn-sm">Register</a>
    `);
    $admin.hide();
  }
  if (window.Cart) Cart.updateBadge();
};

$(document).ready(() => {
  updateNav();
  $(document).on('click', '#btn-logout', (e) => {
    e.preventDefault();
    sessionStorage.clear();
    window.location.href = 'index.html';
  });
});
