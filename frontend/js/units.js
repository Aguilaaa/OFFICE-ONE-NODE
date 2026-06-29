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
  if (!$('#name').val().trim()) { $('#name-error').show(); return false; }
  $('#name-error').hide();
  return true;
};

let table;

$(document).ready(() => {
  if (!checkAdmin()) return;

  table = $('#units-table').DataTable({
    ajax: { url: `${API_URL}/units`, dataSrc: 'rows', headers: { Authorization: `Bearer ${getToken()}` } },
    columns: [
      { data: 'id' },
      { data: 'name' },
      { data: 'abbreviation', defaultContent: '-' },
      {
        data: null,
        render: (row) => `
          <button class="btn btn-secondary btn-sm edit-btn" data-id="${row.id}">Edit</button>
          <button class="btn btn-danger btn-sm delete-btn" data-id="${row.id}">Delete</button>
        `
      }
    ]
  });

  $('#btn-add').click(() => {
    $('#unit-form')[0].reset();
    $('#unit-id').val('');
    $('#unitModal').modal('show');
  });

  $(document).on('click', '.edit-btn', function () {
    const row = table.rows().data().toArray().find((r) => r.id === $(this).data('id'));
    $('#unit-id').val(row.id);
    $('#name').val(row.name);
    $('#abbreviation').val(row.abbreviation || '');
    $('#unitModal').modal('show');
  });

  $('#unit-form').submit(function (e) {
    e.preventDefault();
    if (!validateForm()) return;
    const id = $('#unit-id').val();
    const data = { name: $('#name').val().trim(), abbreviation: $('#abbreviation').val().trim() || null };
    $.ajax({
      url: id ? `${API_URL}/units/${id}` : `${API_URL}/units`,
      method: id ? 'PUT' : 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data),
      headers: { Authorization: `Bearer ${getToken()}` },
      success: () => { $('#unitModal').modal('hide'); table.ajax.reload(); },
      error: (xhr) => Swal.fire('Error', xhr.responseJSON?.error || 'Save failed', 'error')
    });
  });

  $(document).on('click', '.delete-btn', function () {
    const id = $(this).data('id');
    Swal.fire({ title: 'Delete unit?', icon: 'warning', showCancelButton: true }).then((r) => {
      if (!r.isConfirmed) return;
      $.ajax({
        url: `${API_URL}/units/${id}`, method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
        success: () => table.ajax.reload(),
        error: (xhr) => Swal.fire('Error', xhr.responseJSON?.error, 'error')
      });
    });
  });
});
