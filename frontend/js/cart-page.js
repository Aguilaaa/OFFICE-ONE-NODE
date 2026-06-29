const API_BASE = (window.location.port === '4000')
  ? window.location.origin
  : 'http://localhost:4000';

const renderCart = () => {
  const items = Cart.get();
  const $wrap = $('#cart-items');
  const $empty = $('#cart-empty');
  const $summary = $('#cart-summary');

  if (items.length === 0) {
    $wrap.empty();
    $empty.removeClass('d-none');
    $summary.addClass('d-none');
    return;
  }

  $empty.addClass('d-none');
  $summary.removeClass('d-none');
  $wrap.empty();

  items.forEach((item) => {
    const src = getMainPhotoSrc(API_BASE, item);
    const img = src
      ? `<img src="${src}" alt="${item.name}">`
      : '<div class="cart-item-placeholder"><i class="fas fa-box"></i></div>';
    const lineTotal = item.quantity * item.unit_price;

    $wrap.append(`
      <div class="cart-item" data-id="${item.product_id}">
        <div class="cart-item-img">${img}</div>
        <div class="cart-item-info">
          <div class="cart-item-code">${item.item_code}</div>
          <a href="product-detail.html?id=${item.product_id}" class="cart-item-name">${item.name}</a>
          <div class="cart-item-unit">PHP ${item.unit_price.toFixed(2)} / ${item.unit}</div>
        </div>
        <div class="cart-item-qty">
          <button type="button" class="qty-btn qty-minus" data-id="${item.product_id}">−</button>
          <input type="number" class="qty-input" value="${item.quantity}" min="1" data-id="${item.product_id}">
          <button type="button" class="qty-btn qty-plus" data-id="${item.product_id}">+</button>
        </div>
        <div class="cart-item-total">PHP ${lineTotal.toFixed(2)}</div>
        <button type="button" class="cart-remove" data-id="${item.product_id}" title="Remove"><i class="fas fa-times"></i></button>
      </div>
    `);
  });

  const subtotal = Cart.subtotal();
  $('#cart-subtotal').text(`PHP ${subtotal.toFixed(2)}`);
  $('#cart-total').text(`PHP ${subtotal.toFixed(2)}`);
};

$(document).ready(() => {
  renderCart();

  $(document).on('click', '.qty-minus', function () {
    const id = parseInt($(this).data('id'), 10);
    const item = Cart.get().find((i) => i.product_id === id);
    if (item) Cart.updateQty(id, item.quantity - 1);
    renderCart();
  });

  $(document).on('click', '.qty-plus', function () {
    const id = parseInt($(this).data('id'), 10);
    const item = Cart.get().find((i) => i.product_id === id);
    if (item) Cart.updateQty(id, item.quantity + 1);
    renderCart();
  });

  $(document).on('change', '.qty-input', function () {
    Cart.updateQty(parseInt($(this).data('id'), 10), $(this).val());
    renderCart();
  });

  $(document).on('click', '.cart-remove', function () {
    Cart.remove(parseInt($(this).data('id'), 10));
    renderCart();
  });

  $('#btn-clear-cart').click(() => {
    Swal.fire({ title: 'Clear cart?', icon: 'warning', showCancelButton: true }).then((r) => {
      if (r.isConfirmed) {
        Cart.clear();
        renderCart();
      }
    });
  });

  $('#btn-checkout').click(() => {
    if (Cart.get().length === 0) {
      Swal.fire({ icon: 'info', text: 'Your cart is empty.' });
      return;
    }
    if (!getToken()) {
      Swal.fire({
        icon: 'info',
        title: 'Login required',
        text: 'Please log in to checkout.',
        showCancelButton: true,
        confirmButtonText: 'Go to Login'
      }).then((r) => {
        if (r.isConfirmed) window.location.href = 'login.html?redirect=checkout.html';
      });
      return;
    }
    window.location.href = 'checkout.html';
  });
});
