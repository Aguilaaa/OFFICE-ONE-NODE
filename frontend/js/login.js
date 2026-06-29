const API_URL = 'http://localhost:4000/api/v1';

const validateForm = () => {
  let valid = true;
  const email = $('#email').val().trim();
  const password = $('#password').val();

  if (!email) { $('#email-error').show(); valid = false; } else { $('#email-error').hide(); }
  if (!password) { $('#password-error').show(); valid = false; } else { $('#password-error').hide(); }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    $('#email-format-error').show(); valid = false;
  } else { $('#email-format-error').hide(); }

  return valid;
};

$(document).ready(() => {
  $('#login-form').submit((e) => {
    e.preventDefault();
    if (!validateForm()) return;

    $.ajax({
      url: `${API_URL}/login`,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        email: $('#email').val().trim(),
        password: $('#password').val()
      }),
      success: (res) => {
        sessionStorage.setItem('token', JSON.stringify(res.token));
        sessionStorage.setItem('user', JSON.stringify(res.user));
        Swal.fire({ icon: 'success', title: 'Welcome!', text: res.message, timer: 1500, showConfirmButton: false })
          .then(() => {
            const redirect = new URLSearchParams(window.location.search).get('redirect');
            if (redirect) {
              window.location.href = redirect;
            } else if (res.user.role === 'admin') {
              window.location.href = 'admin/dashboard.html';
            } else {
              window.location.href = 'index.html';
            }
          });
      },
      error: (xhr) => {
        const msg = xhr.responseJSON?.message || xhr.responseJSON?.error || 'Login failed';
        Swal.fire({ icon: 'error', title: 'Login Failed', text: msg });
      }
    });
  });
});
