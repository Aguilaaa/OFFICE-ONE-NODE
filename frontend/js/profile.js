const API_URL = (window.location.port === '4000')
  ? `${window.location.origin}/api/v1`
  : 'http://localhost:4000/api/v1';
const API_BASE = (window.location.port === '4000')
  ? window.location.origin
  : 'http://localhost:4000';

const renderProfile = (user) => {
  $('#profile-name').val(user.name);
  $('#profile-display-name').text(user.name);
  $('#profile-email').text(user.email);
  if (user.profile_image) {
    $('#profile-avatar').html(`<img src="${API_BASE}/${user.profile_image}" alt="${user.name}">`);
  } else {
    $('#profile-avatar').html('<i class="fas fa-user"></i>');
  }
};

const validateProfile = () => {
  let ok = true;
  const name = $('#profile-name').val().trim();
  const password = $('#profile-password').val();
  const confirm = $('#profile-confirm-password').val();

  if (!name) {
    $('#profile-name-error').show();
    ok = false;
  } else {
    $('#profile-name-error').hide();
  }

  if (password && password.length < 6) {
    $('#profile-password-error').show();
    ok = false;
  } else {
    $('#profile-password-error').hide();
  }

  if (password !== confirm) {
    $('#profile-confirm-error').show();
    ok = false;
  } else {
    $('#profile-confirm-error').hide();
  }

  return ok;
};

$(document).ready(() => {
  if (!getToken()) {
    window.location.href = 'login.html?redirect=profile.html';
    return;
  }

  $.ajax({
    url: `${API_URL}/profile`,
    headers: authHeader(),
    success: (res) => renderProfile(res.user),
    error: () => Swal.fire('Error', 'Could not load profile.', 'error')
  });

  $('#profile-form').submit(function (e) {
    e.preventDefault();
    if (!validateProfile()) return;

    const formData = new FormData(this);
    if (!$('#profile-password').val()) formData.delete('password');

    $.ajax({
      url: `${API_URL}/profile`,
      method: 'PUT',
      data: formData,
      processData: false,
      contentType: false,
      headers: authHeader(),
      success: (res) => {
        sessionStorage.setItem('user', JSON.stringify(res.user));
        $('#profile-password').val('');
        $('#profile-confirm-password').val('');
        renderProfile(res.user);
        updateNav();
        Swal.fire({ icon: 'success', title: 'Profile updated', timer: 1300, showConfirmButton: false });
      },
      error: (xhr) => Swal.fire('Error', xhr.responseJSON?.error || 'Update failed', 'error')
    });
  });
});
