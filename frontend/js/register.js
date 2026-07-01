const API_URL = (window.location.port === '4000')
  ? `${window.location.origin}/api/v1`
  : 'http://localhost:4000/api/v1';

const validateForm = () => {
  let valid = true;
  const name = $('#name').val().trim();
  const email = $('#email').val().trim();
  const password = $('#password').val();
  const confirm = $('#confirm_password').val();

  if (!name) { $('#name-error').show(); valid = false; } else { $('#name-error').hide(); }
  if (!email) { $('#email-error').show(); valid = false; } else { $('#email-error').hide(); }
  if (!password) { $('#password-error').show(); valid = false; } else { $('#password-error').hide(); }
  if (password !== confirm) { $('#confirm-error').show(); valid = false; } else { $('#confirm-error').hide(); }

  return valid;
};

$(document).ready(() => {
  $('#register-form').submit((e) => {
    e.preventDefault();
    if (!validateForm()) return;

    $.ajax({
      url: `${API_URL}/register`,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        name: $('#name').val().trim(),
        email: $('#email').val().trim(),
        password: $('#password').val()
      }),
      success: (res) => {
        Swal.fire({
          icon: 'success',
          title: 'Check your email',
          html: res.message || 'We sent a verification link. Please verify your email before logging in.',
          confirmButtonText: 'Go to Login'
        }).then(() => window.location.href = 'login.html');
      },
      error: (xhr) => {
        Swal.fire({ icon: 'error', title: 'Error', text: xhr.responseJSON?.error || 'Registration failed' });
      }
    });
  });
});
