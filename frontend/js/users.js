const API_URL = 'http://localhost:4000/api/v1';
const getToken = () => JSON.parse(sessionStorage.getItem('token'));
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));
const normalizeRole = (role) => ['admin', 'customer', 'staff'].includes(role) ? role : 'customer';
const getInitial = (name) => String(name || '?').trim().charAt(0).toUpperCase() || '?';

const checkAdmin = () => {
  const user = JSON.parse(sessionStorage.getItem('user') || 'null');
  if (!user || user.role !== 'admin') {
    Swal.fire({ icon: 'warning', text: 'Admin access required.' }).then(() => window.location.href = '../login.html');
    return false;
  }
  return true;
};

const validateUserForm = () => {
  let ok = true;
  if (!$('#user-name').val().trim()) { $('#user-name-error').show(); ok = false; } else { $('#user-name-error').hide(); }
  if (!$('#user-email').val().trim()) { $('#user-email-error').text('Required').show(); ok = false; } else { $('#user-email-error').hide(); }
  if (!$('#user-password').val()) { $('#user-password-error').show(); ok = false; } else { $('#user-password-error').hide(); }
  const email = $('#user-email').val().trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    $('#user-email-error').text('Invalid email').show();
    ok = false;
  }
  return ok;
};

let userTable;
const trashState = { showTrashed: false };

$(document).ready(() => {
  if (!checkAdmin()) return;

  userTable = $('#users-table').DataTable({
    ajax: {
      url: `${API_URL}/users`,
      dataSrc: 'rows',
      headers: { Authorization: `Bearer ${getToken()}` }
    },
    columns: [
      { data: 'id', render: (d) => `<span class="user-id-pill">#${escapeHtml(d)}</span>` },
      {
        data: 'name',
        render: (d) => `
          <div class="user-name-cell">
            <span class="user-avatar">${escapeHtml(getInitial(d))}</span>
            <strong>${escapeHtml(d)}</strong>
          </div>
        `
      },
      { data: 'email', render: (d) => `<span class="email-cell">${escapeHtml(d)}</span>` },
      { data: 'role', render: (d) => `<span class="role-pill role-${normalizeRole(d)}">${escapeHtml(normalizeRole(d))}</span>` },
      {
        data: 'is_active',
        render: (d) => `<span class="status-pill ${d ? 'status-active' : 'status-inactive'}">${d ? 'Active' : 'Inactive'}</span>`
      },
      { data: 'createdAt', render: (d) => `<span class="date-cell">${new Date(d).toLocaleDateString()}</span>` },
      {
        data: null,
        orderable: false,
        render: (row) => {
          if (trashState.showTrashed) {
            return `<div class="table-actions"><button class="btn btn-success btn-sm restore-btn" data-id="${row.id}"><i class="fas fa-trash-restore"></i> Restore</button></div>`;
          }
          return `
          <div class="table-actions user-actions">
            <select class="form-control form-control-sm role-select" data-id="${row.id}">
              <option value="admin" ${row.role === 'admin' ? 'selected' : ''}>Admin</option>
              <option value="customer" ${row.role === 'customer' || row.role === 'staff' ? 'selected' : ''}>Customer</option>
            </select>
            <button class="btn btn-sm btn-danger toggle-btn" data-id="${row.id}"><i class="fas fa-user-slash"></i> Deactivate</button>
          </div>
        `;
        }
      }
    ],
    autoWidth: false,
    columnDefs: [
      { targets: 2, width: '240px' },
      { targets: 6, width: '190px', orderable: false }
    ]
  });

  setupTrashToggle({ table: userTable, listUrl: `${API_URL}/users`, $btn: $('#btn-trash'), $addBtn: $('#btn-add'), trashState });
  bindRestore({ resource: 'users', table: userTable, getToken, apiUrl: API_URL });

  $('#btn-add').click(() => {
    $('#user-form')[0].reset();
    $('#user-role').val('customer');
    $('#userModal .modal-title').text('Add User');
    $('#userModal').modal('show');
  });

  $('#user-form').submit(function (e) {
    e.preventDefault();
    if (!validateUserForm()) return;
    $.ajax({
      url: `${API_URL}/users`,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        name: $('#user-name').val().trim(),
        email: $('#user-email').val().trim(),
        password: $('#user-password').val(),
        role: $('#user-role').val()
      }),
      headers: { Authorization: `Bearer ${getToken()}` },
      success: () => {
        $('#userModal').modal('hide');
        userTable.ajax.reload();
        Swal.fire({ icon: 'success', title: 'User created', timer: 1200, showConfirmButton: false });
      },
      error: (xhr) => Swal.fire('Error', xhr.responseJSON?.error || 'Save failed', 'error')
    });
  });

  $(document).on('change', '.role-select', function () {
    const id = $(this).data('id');
    const role = $(this).val();
    $.ajax({
      url: `${API_URL}/users/${id}/role`, method: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify({ role }),
      headers: { Authorization: `Bearer ${getToken()}` },
      success: () => Swal.fire({ icon: 'success', title: 'Role updated', timer: 1000, showConfirmButton: false }),
      error: (xhr) => Swal.fire('Error', xhr.responseJSON?.error, 'error')
    });
  });

  $(document).on('click', '.toggle-btn', function () {
    const id = $(this).data('id');
    Swal.fire({ title: 'Move user to trash?', text: 'They will not be able to log in until restored.', icon: 'warning', showCancelButton: true }).then((r) => {
      if (!r.isConfirmed) return;
      $.ajax({
        url: `${API_URL}/users/${id}/status`, method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` },
        success: () => userTable.ajax.reload(),
        error: (xhr) => Swal.fire('Error', xhr.responseJSON?.error, 'error')
      });
    });
  });
});
