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

const validateCustomerForm = () => {
  let ok = true;
  [
    { id: '#customer_code', err: '#customer_code-error' },
    { id: '#name', err: '#name-error' },
    { id: '#contact_no', err: '#contact_no-error' }
  ].forEach(({ id, err }) => {
    if (!$(id).val().trim()) { $(err).show(); ok = false; } else { $(err).hide(); }
  });
  return ok;
};

let customerTable;
const trashState = { showTrashed: false };

$(document).ready(() => {
  if (!checkAdmin()) return;

  customerTable = $('#customers-table').DataTable({
    ajax: { url: `${API_URL}/customers`, dataSrc: 'rows', headers: { Authorization: `Bearer ${getToken()}` } },
    columns: [
      { data: 'id' },
      { data: 'customer_code' },
      { data: 'name' },
      { data: 'contact_no' },
      { data: 'email', defaultContent: '-' },
      { data: 'is_active', render: (d) => d ? 'Active' : 'Inactive' },
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

  setupTrashToggle({ table: customerTable, listUrl: `${API_URL}/customers`, $btn: $('#btn-trash'), $addBtn: $('#btn-add'), trashState });
  bindRestore({ resource: 'customers', table: customerTable, getToken, apiUrl: API_URL });

  $('#btn-add').click(() => {
    $('#customer-form')[0].reset();
    $('#customer-id').val('');
    $('#customerModal').modal('show');
  });

  $(document).on('click', '.edit-btn', function () {
    $.ajax({
      url: `${API_URL}/customers/${$(this).data('id')}`,
      headers: { Authorization: `Bearer ${getToken()}` },
      success: (res) => {
        const c = res.result;
        $('#customer-id').val(c.id);
        $('#customer_code').val(c.customer_code);
        $('#name').val(c.name);
        $('#contact_no').val(c.contact_no);
        $('#email').val(c.email);
        $('#address').val(c.address);
        $('#is_active').val(c.is_active);
        $('#customerModal').modal('show');
      }
    });
  });

  $('#customer-form').submit(function (e) {
    e.preventDefault();
    if (!validateCustomerForm()) return;
    const id = $('#customer-id').val();
    const data = {
      customer_code: $('#customer_code').val(),
      name: $('#name').val(),
      contact_no: $('#contact_no').val(),
      email: $('#email').val(),
      address: $('#address').val(),
      is_active: parseInt($('#is_active').val(), 10)
    };
    $.ajax({
      url: id ? `${API_URL}/customers/${id}` : `${API_URL}/customers`,
      method: id ? 'PUT' : 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data),
      headers: { Authorization: `Bearer ${getToken()}` },
      success: () => { $('#customerModal').modal('hide'); customerTable.ajax.reload(); },
      error: (xhr) => Swal.fire('Error', xhr.responseJSON?.error || 'Save failed', 'error')
    });
  });

  $(document).on('click', '.delete-btn', function () {
    const id = $(this).data('id');
    Swal.fire({ title: 'Move to trash?', text: 'You can restore this customer later.', icon: 'warning', showCancelButton: true }).then((r) => {
      if (!r.isConfirmed) return;
      $.ajax({
        url: `${API_URL}/customers/${id}`, method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
        success: () => customerTable.ajax.reload()
      });
    });
  });
});
