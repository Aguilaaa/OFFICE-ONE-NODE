const API_URL = (window.location.port === '4000')
  ? `${window.location.origin}/api/v1`
  : 'http://localhost:4000/api/v1';

const showResult = (success, title, message) => {
  $('#verify-loading').addClass('d-none');
  $('#verify-result').removeClass('d-none');
  $('#verify-icon').html(success
    ? '<i class="fas fa-check-circle fa-3x text-success"></i>'
    : '<i class="fas fa-times-circle fa-3x text-danger"></i>');
  $('#verify-title').text(title);
  $('#verify-message').text(message);
};

$(document).ready(() => {
  const token = new URLSearchParams(window.location.search).get('token');
  if (!token) {
    showResult(false, 'Invalid Link', 'No verification token was provided.');
    return;
  }

  $.ajax({
    url: `${API_URL}/verify-email/${encodeURIComponent(token)}`,
    method: 'GET',
    success: (res) => showResult(true, 'Email Verified', res.message || 'Your account is ready. You can log in now.'),
    error: (xhr) => showResult(false, 'Verification Failed', xhr.responseJSON?.error || 'This link is invalid or has expired.')
  });
});
