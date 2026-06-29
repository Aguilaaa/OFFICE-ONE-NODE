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

let products = [];
let customers = [];
let orderTable;
const trashState = { showTrashed: false };

const addLineRow = (productId = '', qty = 1) => {
  const opts = products.map((p) =>
    `<option value="${p.id}" data-price="${p.unit_price}" ${p.id == productId ? 'selected' : ''}>${p.item_code} - ${p.name}</option>`
  ).join('');
  $('#line-items').append(`
    <div class="line-row form-row mb-2">
      <div class="col-6"><select class="form-control line-product" required><option value="">Select product</option>${opts}</select></div>
      <div class="col-3"><input type="number" class="form-control line-qty" min="1" value="${qty}" required></div>
      <div class="col-2"><input type="text" class="form-control line-price" readonly></div>
      <div class="col-1"><button type="button" class="btn btn-danger btn-sm remove-line">X</button></div>
    </div>
  `);
  if (productId) $('#line-items .line-row:last .line-product').trigger('change');
};

const getLineItems = () => {
  const items = [];
  $('#line-items .line-row').each(function () {
    const product_id = parseInt($(this).find('.line-product').val(), 10);
    const quantity = parseInt($(this).find('.line-qty').val(), 10);
    const unit_price = parseFloat($(this).find('.line-price').val());
    if (product_id && quantity > 0 && unit_price) items.push({ product_id, quantity, unit_price });
  });
  return items;
};

const validateOrderForm = () => {
  let ok = true;
  if (!$('#transaction_no').val().trim()) { $('#transaction_no-error').show(); ok = false; } else { $('#transaction_no-error').hide(); }
  if (getLineItems().length === 0) { $('#items-error').show(); ok = false; } else { $('#items-error').hide(); }
  return ok;
};

$(document).ready(() => {
  if (!checkAdmin()) return;

  $.when(
    $.get(`${API_URL}/products`, (d) => { products = d.rows.filter((p) => p.is_active); }),
    $.ajax({ url: `${API_URL}/customers`, headers: { Authorization: `Bearer ${getToken()}` }, success: (d) => { customers = d.rows; } })
  ).done(() => {
    const custOpts = customers.map((c) => `<option value="${c.id}">${c.customer_code} - ${c.name}</option>`).join('');
    $('#customer_id').append(custOpts);
  });

  orderTable = $('#orders-table').DataTable({
    ajax: {
      url: `${API_URL}/transactions`,
      dataSrc: 'rows',
      headers: { Authorization: `Bearer ${getToken()}` }
    },
    columns: [
      { data: 'id', title: 'Order ID' },
      { data: 'transaction_no' },
      { data: 'Customer.name', defaultContent: 'Walk-in' },
      { data: 'status' },
      { data: 'grand_total', render: (d) => `PHP ${parseFloat(d || 0).toFixed(2)}` },
      { data: 'createdAt', render: (d) => new Date(d).toLocaleDateString() },
      {
        data: null,
        render: (row) => {
          if (trashState.showTrashed) {
            return `<button class="btn btn-success btn-sm restore-btn" data-id="${row.id}">Restore</button>`;
          }
          let btns = `<button class="btn btn-secondary btn-sm edit-btn" data-id="${row.id}">Edit</button>`;
          if (row.status === 'Draft') {
            btns += ` <button class="btn btn-primary btn-sm complete-btn" data-id="${row.id}">Complete</button>`;
          }
          btns += ` <button class="btn btn-danger btn-sm delete-btn" data-id="${row.id}">Delete</button>`;
          return btns;
        }
      }
    ]
  });

  setupTrashToggle({ table: orderTable, listUrl: `${API_URL}/transactions`, $btn: $('#btn-trash'), $addBtn: $('#btn-add'), trashState });
  bindRestore({ resource: 'transactions', table: orderTable, getToken, apiUrl: API_URL });

  $('#btn-add').click(() => {
    $('#order-form')[0].reset();
    $('#order-id').val('');
    $('#line-items').empty();
    addLineRow();
    $('#orderModal').modal('show');
  });

  $('#btn-add-line').click(() => addLineRow());

  $(document).on('click', '.remove-line', function () {
    if ($('#line-items .line-row').length > 1) $(this).closest('.line-row').remove();
  });

  $(document).on('change', '.line-product', function () {
    const price = $(this).find(':selected').data('price') || '';
    $(this).closest('.line-row').find('.line-price').val(price);
  });

  $(document).on('click', '.edit-btn', function () {
    const id = $(this).data('id');
    const row = orderTable.rows().data().toArray().find((r) => r.id === id);
    if (!row || row.status === 'Completed') return;
    $('#order-id').val(row.id);
    $('#transaction_no').val(row.transaction_no);
    $('#customer_id').val(row.customer_id || '');
    $('#discount').val(row.discount || 0);
    $('#notes').val(row.notes || '');
    $('#line-items').empty();
    (row.Products || []).forEach((p) => {
      addLineRow(p.id, p.TransactionItem?.quantity || 1);
    });
    if (!row.Products?.length) addLineRow();
    $('#orderModal').modal('show');
  });

  $('#order-form').submit(function (e) {
    e.preventDefault();
    if (!validateOrderForm()) return;
    const id = $('#order-id').val();
    const payload = {
      transaction_no: $('#transaction_no').val().trim(),
      customer_id: $('#customer_id').val() || null,
      discount: parseFloat($('#discount').val()) || 0,
      notes: $('#notes').val(),
      items: getLineItems()
    };
    $.ajax({
      url: id ? `${API_URL}/transactions/${id}` : `${API_URL}/transactions`,
      method: id ? 'PUT' : 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload),
      headers: { Authorization: `Bearer ${getToken()}` },
      success: () => { $('#orderModal').modal('hide'); orderTable.ajax.reload(); },
      error: (xhr) => Swal.fire('Error', xhr.responseJSON?.error || 'Save failed', 'error')
    });
  });

  $(document).on('click', '.complete-btn', function () {
    const id = $(this).data('id');
    Swal.fire({ title: 'Mark as Completed?', icon: 'question', showCancelButton: true }).then((r) => {
      if (!r.isConfirmed) return;
      $.ajax({
        url: `${API_URL}/transactions/${id}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ status: 'Completed' }),
        headers: { Authorization: `Bearer ${getToken()}` },
        success: () => orderTable.ajax.reload()
      });
    });
  });

  $(document).on('click', '.delete-btn', function () {
    const id = $(this).data('id');
    Swal.fire({ title: 'Move to trash?', text: 'You can restore this order later.', icon: 'warning', showCancelButton: true }).then((r) => {
      if (!r.isConfirmed) return;
      $.ajax({
        url: `${API_URL}/transactions/${id}`, method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
        success: () => orderTable.ajax.reload()
      });
    });
  });
});
