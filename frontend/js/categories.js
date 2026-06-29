const API_URL = 'http://localhost:4000/api/v1';
const getToken = () => JSON.parse(sessionStorage.getItem('token'));

const checkAdmin = () => {
  const user = JSON.parse(sessionStorage.getItem('user') || 'null');
  if (!user || user.role !== 'admin') {
    Swal.fire({ icon: 'warning', text: 'Admin access required.' }).then(() => window.location.href = '../login.html');
    return false;
  }
  return true;
};

const validateForm = () => {
  let ok = true;
  if (!$('#name').val().trim()) { $('#name-error').show(); ok = false; } else { $('#name-error').hide(); }
  if (!$('#type').val()) { $('#type-error').show(); ok = false; } else { $('#type-error').hide(); }
  return ok;
};

let table;
const trashState = { showTrashed: false };

$(document).ready(() => {
  if (!checkAdmin()) return;

  table = $('#categories-table').DataTable({
    ajax: { url: `${API_URL}/categories`, dataSrc: 'rows', headers: { Authorization: `Bearer ${getToken()}` } },
    columns: [
      { data: 'id' },
      { data: 'name' },
      { data: 'type' },
      {
        data: null,
        render: (row) => {
          if (trashState.showTrashed) {
            return `<button class="btn btn-success btn-sm restore-btn" data-id="${row.id}">Restore</button>`;
          }
          return `
          <button class="btn btn-secondary btn-sm edit-btn" data-id="${row.id}">Edit</button>
          <button class="btn btn-danger btn-sm delete-btn" data-id="${row.id}">Delete</button>
        `;
        }
      }
    ]
  });

  setupTrashToggle({ table, listUrl: `${API_URL}/categories`, $btn: $('#btn-trash'), $addBtn: $('#btn-add'), trashState });
  bindRestore({ resource: 'categories', table, getToken, apiUrl: API_URL });

  $('#btn-add').click(() => {
    $('#category-form')[0].reset();
    $('#category-id').val('');
    $('#categoryModal').modal('show');
  });

  $(document).on('click', '.edit-btn', function () {
    const row = table.rows().data().toArray().find((r) => r.id === $(this).data('id'));
    $('#category-id').val(row.id);
    $('#name').val(row.name);
    $('#type').val(row.type);
    $('#categoryModal').modal('show');
  });

  $('#category-form').submit(function (e) {
    e.preventDefault();
    if (!validateForm()) return;
    const id = $('#category-id').val();
    const data = { name: $('#name').val().trim(), type: $('#type').val() };
    $.ajax({
      url: id ? `${API_URL}/categories/${id}` : `${API_URL}/categories`,
      method: id ? 'PUT' : 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data),
      headers: { Authorization: `Bearer ${getToken()}` },
      success: () => { $('#categoryModal').modal('hide'); table.ajax.reload(); },
      error: (xhr) => Swal.fire('Error', xhr.responseJSON?.error || 'Save failed', 'error')
    });
  });

  $(document).on('click', '.delete-btn', function () {
    const id = $(this).data('id');
    Swal.fire({ title: 'Move to trash?', text: 'You can restore this category later.', icon: 'warning', showCancelButton: true }).then((r) => {
      if (!r.isConfirmed) return;
      $.ajax({
        url: `${API_URL}/categories/${id}`, method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
        success: () => table.ajax.reload(),
        error: (xhr) => Swal.fire('Error', xhr.responseJSON?.error, 'error')
      });
    });
  });
});
