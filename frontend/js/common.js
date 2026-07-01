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

const isAdminUser = () => getUser()?.role === 'admin';

const updateNav = () => {
  const user = getUser();
  const $auth = $('#nav-auth');
  const $admin = $('#nav-admin');
  const $cartLinks = $('a[href="cart.html"]');
  if (user) {
    const image = user.profile_image
      ? `<img src="${user.profile_image}" alt="${user.name}" class="nav-profile-img">`
      : '<i class="fas fa-user"></i>';
    $auth.html(`
      <a href="profile.html" class="nav-profile-link">${image} ${user.name}</a>
      <a href="#" id="btn-logout" class="btn btn-secondary btn-sm">Logout</a>
    `);
    if (user.role === 'admin') {
      $admin.show();
      $cartLinks.hide();
      $('#nav-orders').remove();
      if (window.Cart) Cart.clear();
    } else {
      $cartLinks.show();
      if (!$('#nav-orders').length) {
        $cartLinks.after('<a href="my-orders.html" id="nav-orders"><i class="fas fa-box"></i> My Orders</a>');
      }
    }
  } else {
    $auth.html(`
      <a href="login.html">Login</a>
      <a href="register.html" class="btn btn-primary btn-sm">Register</a>
    `);
    $admin.hide();
    $cartLinks.show();
    $('#nav-orders').remove();
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
