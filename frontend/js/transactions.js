const API_URL = 'http://localhost:4000/api/v1';
const getToken = () => JSON.parse(sessionStorage.getItem('token'));
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

const checkAdmin = () => {
  const user = JSON.parse(sessionStorage.getItem('user') || 'null');
  if (!user || user.role !== 'admin') {
    Swal.fire({ icon: 'warning', text: 'Admin access required.' }).then(() => window.location.href = '../login.html');
    return false;
  }
  return true;
};

let products = [];
let orderTable;
const trashState = { showTrashed: false };
const normalizeStatus = (status) => status === 'Draft' ? 'Pending' : status;

const reloadOrdersTable = (keepPage = true) => {
  if (!orderTable) return;
  orderTable.ajax.reload(null, keepPage);
};

const patchOrderRow = (id, patch) => {
  if (!orderTable) return false;
  let updated = false;
  orderTable.rows().every(function () {
    const data = this.data();
    if (Number(data.id) === Number(id)) {
      this.data({ ...data, ...patch });
      updated = true;
      return false;
    }
  });
  if (updated) orderTable.draw(false);
  return updated;
};

const statusCellHtml = (status) => {
  const normalized = normalizeStatus(status);
  const label = normalized === 'Pending' ? 'Processing' : normalized;
  return `<span class="order-status status-${normalized.toLowerCase()}">${escapeHtml(label)}</span>`;
};

const actionsCellHtml = (row) => {
  if (trashState.showTrashed) {
    return `<div class="table-actions"><button class="btn btn-success btn-sm restore-btn" data-id="${row.id}"><i class="fas fa-trash-restore"></i> Restore</button></div>`;
  }
  let btns = `<div class="table-actions order-actions"><button class="btn btn-secondary btn-sm edit-btn" data-id="${row.id}"><i class="fas fa-edit"></i> Edit</button>`;
  if (normalizeStatus(row.status) === 'Pending') {
    btns += ` <button class="btn btn-primary btn-sm complete-btn" data-id="${row.id}"><i class="fas fa-check"></i> Complete</button>`;
  }
  btns += ` <button class="btn btn-info btn-sm receipt-btn" data-id="${row.id}"><i class="fas fa-file-pdf"></i> PDF</button>`;
  btns += ` <button class="btn btn-danger btn-sm delete-btn" data-id="${row.id}"><i class="fas fa-trash"></i> Delete</button></div>`;
  return btns;
};

const addLineRow = (productId = '', qty = 1) => {
  const opts = products.map((p) =>
    `<option value="${p.id}" data-price="${p.unit_price}" ${p.id == productId ? 'selected' : ''}>${escapeHtml(p.item_code)} - ${escapeHtml(p.name)}</option>`
  ).join('');
  $('#line-items').append(`
    <div class="line-row form-row mb-2">
      <div class="col-6"><select class="form-control line-product" required><option value="">Select product</option>${opts}</select></div>
      <div class="col-3"><input type="number" class="form-control line-qty" min="1" value="${qty}" required></div>
      <div class="col-2"><input type="text" class="form-control line-price" readonly></div>
      <div class="col-1"><button type="button" class="btn btn-danger btn-sm remove-line" aria-label="Remove line item"><i class="fas fa-times"></i></button></div>
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
  const allowedStatuses = ['Pending', 'Completed', 'Cancelled'];
  if (!$('#transaction_no').val().trim()) { $('#transaction_no-error').show(); ok = false; } else { $('#transaction_no-error').hide(); }
  if (!allowedStatuses.includes($('#status').val())) {
    Swal.fire('Error', 'Select a valid order status.', 'error');
    ok = false;
  }
  if (getLineItems().length === 0) { $('#items-error').show(); ok = false; } else { $('#items-error').hide(); }
  return ok;
};

$(document).ready(() => {
  if (!checkAdmin()) return;

  $.get(`${API_URL}/products`, (d) => { products = d.rows.filter((p) => p.is_active); });

  orderTable = $('#orders-table').DataTable({
    ajax: {
      url: `${API_URL}/transactions`,
      dataSrc: 'rows',
      beforeSend(xhr) {
        xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`);
      }
    },
    columns: [
      { data: 'id', title: 'Order ID', render: (d) => `<span class="order-id-pill">#${escapeHtml(d)}</span>` },
      { data: 'transaction_no', title: 'Transaction No', render: (d) => `<strong class="transaction-code">${escapeHtml(d)}</strong>` },
      {
        data: 'User.name',
        title: 'Customer',
        defaultContent: 'Walk-in',
        render: (d) => `
          <div class="customer-cell">
            <span class="customer-avatar"><i class="fas fa-user"></i></span>
            <span>${escapeHtml(d || 'Walk-in')}</span>
          </div>
        `
      },
      {
        data: 'status',
        title: 'Status',
        render: (d) => statusCellHtml(d)
      },
      { data: 'grand_total', title: 'Total', render: (d) => `<span class="amount-pill">PHP ${parseFloat(d || 0).toFixed(2)}</span>` },
      { data: 'createdAt', title: 'Date', render: (d) => `<span class="date-cell">${new Date(d).toLocaleDateString()}</span>` },
      {
        data: null,
        title: 'Actions',
        orderable: false,
        render: (row) => actionsCellHtml(row)
      }
    ]
  });

  setupTrashToggle({ table: orderTable, listUrl: `${API_URL}/transactions`, $btn: $('#btn-trash'), $addBtn: $('#btn-add'), trashState });
  bindRestore({ resource: 'transactions', table: orderTable, getToken, apiUrl: API_URL });

  $('#btn-add').click(() => {
    $('#order-form')[0].reset();
    $('#order-id').val('');
    $('#status').val('Pending');
    $('#line-items').empty();
    addLineRow();
    $('#orderModal .modal-title').text('New Order');
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
    if (!row) return;
    $('#order-id').val(row.id);
    $('#transaction_no').val(row.transaction_no);
    $('#status').val(normalizeStatus(row.status));
    $('#notes').val(row.notes || '');
    $('#line-items').empty();
    (row.Products || []).forEach((p) => {
      addLineRow(p.id, p.TransactionItem?.quantity || 1);
    });
    if (!row.Products?.length) addLineRow();
    $('#orderModal .modal-title').text('Edit Order');
    $('#orderModal').modal('show');
  });

  $('#order-form').submit(function (e) {
    e.preventDefault();
    if (!validateOrderForm()) return;
    const id = $('#order-id').val();
    const payload = {
      transaction_no: $('#transaction_no').val().trim(),
      status: $('#status').val(),
      notes: $('#notes').val(),
      items: getLineItems()
    };
    $.ajax({
      url: id ? `${API_URL}/transactions/${id}` : `${API_URL}/transactions`,
      method: id ? 'PUT' : 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload),
      headers: { Authorization: `Bearer ${getToken()}` },
      success: (res) => {
        $('#orderModal').modal('hide');
        if (res.emailQueued) {
          Swal.fire({ icon: 'success', title: 'Order updated', text: 'Customer will receive an email about the status change.', timer: 1800, showConfirmButton: false });
        }
        reloadOrdersTable(false);
      },
      error: (xhr) => Swal.fire('Error', xhr.responseJSON?.error || 'Save failed', 'error')
    });
  });

  $(document).on('click', '.complete-btn', function () {
    const id = $(this).data('id');
    const $btn = $(this);
    Swal.fire({ title: 'Mark as Completed?', icon: 'question', showCancelButton: true }).then((r) => {
      if (!r.isConfirmed) return;

      $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');

      $.ajax({
        url: `${API_URL}/transactions/${id}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ status: 'Completed' }),
        headers: { Authorization: `Bearer ${getToken()}` },
        success: (res) => {
          patchOrderRow(id, { status: res.status || 'Completed' });
          const msg = res.emailQueued
            ? 'Order completed. Customer will receive an email update.'
            : 'Order completed';
          Swal.fire({ icon: 'success', title: 'Order completed', text: msg, timer: 1800, showConfirmButton: false });
          reloadOrdersTable(true);
        },
        error: (xhr) => {
          $btn.prop('disabled', false).html('<i class="fas fa-check"></i> Complete');
          Swal.fire('Error', xhr.responseJSON?.error || 'Could not complete order', 'error');
        }
      });
    });
  });

  $(document).on('click', '.receipt-btn', function () {
    const id = $(this).data('id');
    fetch(`${API_URL}/transactions/${id}/receipt`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    }).then(async (res) => {
      if (!res.ok) throw new Error('Could not download receipt');
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : `receipt-${id}.pdf`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }).catch(() => Swal.fire('Error', 'Could not download PDF receipt.', 'error'));
  });

  $(document).on('click', '.delete-btn', function () {
    const id = $(this).data('id');
    Swal.fire({ title: 'Move to trash?', text: 'You can restore this order later.', icon: 'warning', showCancelButton: true }).then((r) => {
      if (!r.isConfirmed) return;
      $.ajax({
        url: `${API_URL}/transactions/${id}`, method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
        success: () => reloadOrdersTable(true),
      });
    });
  });
});
