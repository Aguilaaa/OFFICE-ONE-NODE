const API_URL = (window.location.port === '4000')
  ? `${window.location.origin}/api/v1`
  : 'http://localhost:4000/api/v1';

const statusClass = (status) => {
  const s = (status || 'Pending').toLowerCase();
  if (s === 'completed') return 'status-completed';
  if (s === 'cancelled') return 'status-cancelled';
  return 'status-pending';
};

const statusLabel = (status) => {
  const s = status || 'Pending';
  if (s === 'Completed') return 'Completed';
  if (s === 'Cancelled') return 'Cancelled';
  return 'Processing';
};

const buildTracker = (status) => {
  const s = status || 'Pending';
  const cancelled = s === 'Cancelled';
  const completed = s === 'Completed';
  const processing = !completed && !cancelled;

  return `
    <div class="order-tracker ${cancelled ? 'is-cancelled' : ''}">
      <div class="track-step done">
        <span class="track-dot"><i class="fas fa-check"></i></span>
        <span class="track-label">Order Placed</span>
      </div>
      <div class="track-line ${processing || completed ? 'done' : ''}"></div>
      <div class="track-step ${processing ? 'active' : completed ? 'done' : cancelled ? 'cancelled' : ''}">
        <span class="track-dot"><i class="fas ${processing ? 'fa-cog fa-spin' : completed ? 'fa-check' : 'fa-times'}"></i></span>
        <span class="track-label">${cancelled ? 'Cancelled' : processing ? 'Processing' : 'Processed'}</span>
      </div>
      <div class="track-line ${completed ? 'done' : ''}"></div>
      <div class="track-step ${completed ? 'done' : ''}">
        <span class="track-dot"><i class="fas fa-truck"></i></span>
        <span class="track-label">${completed ? 'Delivered' : 'Out for Delivery'}</span>
      </div>
    </div>
  `;
};

const renderItems = (products) => {
  if (!products || products.length === 0) return '<p class="text-muted small mb-0">No items</p>';
  return products.map((p) => {
    const qty = p.TransactionItem?.quantity || 1;
    const price = parseFloat(p.TransactionItem?.unit_price || 0);
    return `<div class="order-item-line"><span>${p.name} × ${qty}</span><span>PHP ${(qty * price).toFixed(2)}</span></div>`;
  }).join('');
};

const downloadReceipt = async (orderId, filenameHint = 'receipt') => {
  try {
    const res = await fetch(`${API_URL}/my-orders/${orderId}/receipt`, { headers: authHeader() });
    if (!res.ok) throw new Error('Could not download receipt');
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match ? match[1] : `${filenameHint}.pdf`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    Swal.fire('Error', err.message || 'Could not download PDF receipt.', 'error');
  }
};

const renderOrders = (orders) => {
  const $list = $('#orders-list').empty();
  $('#orders-loading').addClass('d-none');

  if (!orders.length) {
    $('#orders-empty').removeClass('d-none');
    return;
  }

  $('#orders-empty').addClass('d-none');

  orders.forEach((order) => {
    const status = order.status || 'Pending';
    $list.append(`
      <article class="order-card" data-id="${order.id}">
        <div class="order-card-head">
          <div>
            <div class="order-id-pill">${order.transaction_no}</div>
            <div class="date-cell mt-1">${new Date(order.createdAt).toLocaleString()}</div>
          </div>
          <span class="order-status ${statusClass(status)}">${statusLabel(status)}</span>
        </div>
        ${buildTracker(status)}
        <div class="order-card-items">${renderItems(order.Products)}</div>
        <div class="order-card-foot">
          <strong>Total: PHP ${parseFloat(order.grand_total || 0).toFixed(2)}</strong>
          <button type="button" class="btn btn-secondary btn-sm download-receipt-btn" data-id="${order.id}">
            <i class="fas fa-file-pdf"></i> Download PDF
          </button>
          ${order.notes ? `<span class="text-muted small">Note: ${order.notes}</span>` : ''}
        </div>
      </article>
    `);
  });
};

$(document).ready(() => {
  if (typeof isAdminUser === 'function' && isAdminUser()) {
    window.location.href = 'admin/transactions.html';
    return;
  }

  if (!getToken()) {
    window.location.href = 'login.html?redirect=my-orders.html';
    return;
  }

  $.ajax({
    url: `${API_URL}/my-orders`,
    headers: authHeader(),
    success: (data) => renderOrders(data.rows || []),
    error: (xhr) => {
      $('#orders-loading').addClass('d-none');
      if (xhr.status === 401) {
        window.location.href = 'login.html?redirect=my-orders.html';
        return;
      }
      Swal.fire('Error', xhr.responseJSON?.error || 'Could not load orders.', 'error');
    }
  });

  $(document).on('click', '.download-receipt-btn', function () {
    downloadReceipt($(this).data('id'));
  });
});
