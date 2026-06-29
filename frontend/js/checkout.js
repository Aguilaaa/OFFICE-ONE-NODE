const API_URL = (window.location.port === '4000')
  ? `${window.location.origin}/api/v1`
  : 'http://localhost:4000/api/v1';

const renderSummary = () => {
  const items = Cart.get();
  const $list = $('#checkout-items').empty();

  if (items.length === 0) {
    window.location.href = 'cart.html';
    return;
  }

  items.forEach((item) => {
    const line = item.quantity * item.unit_price;
    $list.append(`
      <div class="checkout-line">
        <span>${item.name} × ${item.quantity}</span>
        <span>PHP ${line.toFixed(2)}</span>
      </div>
    `);
  });

  const subtotal = Cart.subtotal();
  $('#checkout-subtotal').text(`PHP ${subtotal.toFixed(2)}`);
  const discount = parseFloat($('#discount').val()) || 0;
  $('#checkout-total').text(`PHP ${Math.max(0, subtotal - discount).toFixed(2)}`);
};

const validateCheckout = () => {
  let ok = true;
  if (Cart.get().length === 0) {
    Swal.fire({ icon: 'warning', text: 'Your cart is empty.' });
    return false;
  }
  const discount = parseFloat($('#discount').val());
  if ($('#discount').val() && (isNaN(discount) || discount < 0)) {
    $('#discount-error').show();
    ok = false;
  } else {
    $('#discount-error').hide();
  }
  return ok;
};

$(document).ready(() => {
  if (!getToken()) {
    window.location.href = 'login.html?redirect=checkout.html';
    return;
  }

  renderSummary();

  $('#discount').on('input', renderSummary);

  $('#checkout-form').submit(function (e) {
    e.preventDefault();
    if (!validateCheckout()) return;

    const discount = parseFloat($('#discount').val()) || 0;
    const payload = {
      notes: $('#notes').val().trim(),
      discount,
      items: Cart.toOrderItems()
    };

    $('#btn-place-order').prop('disabled', true).text('Placing order...');

    $.ajax({
      url: `${API_URL}/checkout`,
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload),
      headers: authHeader(),
      success: (res) => {
        Cart.clear();
        const order = res.transaction;
        sessionStorage.setItem('lastOrder', JSON.stringify({
          transaction_no: order.transaction_no,
          id: order.id,
          grand_total: order.grand_total
        }));
        window.location.href = 'order-success.html';
      },
      error: (xhr) => {
        $('#btn-place-order').prop('disabled', false).html('<i class="fas fa-check"></i> Place Order');
        Swal.fire('Error', xhr.responseJSON?.error || 'Could not place order.', 'error');
      }
    });
  });
});
