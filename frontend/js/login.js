const API_URL = (window.location.port === '4000')
  ? `${window.location.origin}/api/v1`
  : 'http://localhost:4000/api/v1';

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

const resendVerification = (email) => {
  $.ajax({
    url: `${API_URL}/resend-verification`,
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ email }),
    success: (res) => Swal.fire({ icon: 'success', title: 'Email Sent', text: res.message }),
    error: (xhr) => Swal.fire({ icon: 'error', title: 'Error', text: xhr.responseJSON?.error || 'Could not resend email' })
  });
};

$(document).ready(() => {
  $('#login-form').submit((e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const email = $('#email').val().trim();

    $.ajax({
      url: `${API_URL}/login`,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ email, password: $('#password').val() }),
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
        const data = xhr.responseJSON || {};
        const msg = data.message || data.error || 'Login failed';

        if (xhr.status === 403 && data.needsVerification) {
          Swal.fire({
            icon: 'warning',
            title: 'Email not verified',
            text: msg,
            showCancelButton: true,
            confirmButtonText: 'Resend verification email',
            cancelButtonText: 'Close'
          }).then((result) => {
            if (result.isConfirmed) resendVerification(data.email || email);
          });
          return;
        }

        Swal.fire({ icon: 'error', title: 'Login Failed', text: msg });
      }
    });
  });

  $('#resend-link').click((e) => {
    e.preventDefault();
    const email = $('#email').val().trim();
    if (!email) {
      Swal.fire({ icon: 'info', title: 'Enter your email first', text: 'Type the email you registered with, then click resend.' });
      return;
    }
    resendVerification(email);
  });
});
