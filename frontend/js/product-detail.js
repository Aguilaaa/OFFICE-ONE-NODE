const API_BASE = (window.location.port === '4000')
  ? window.location.origin
  : 'http://localhost:4000';
const API_URL = `${API_BASE}/api/v1`;

let currentProduct = null;

const getProductId = () => new URLSearchParams(window.location.search).get('id');
const isAdmin = () => getUser()?.role === 'admin';

const isFeatured = (product, photoPath) =>
  product.image_url === photoPath || !!(product.ProductPhotos || []).find((p) => p.photo_path === photoPath && p.is_main);

const setMainImage = (src, alt) => {
  if (src) {
    $('#main-image').html(`<img src="${src}" alt="${alt}">`);
  } else {
    $('#main-image').html('<div class="img-placeholder large"><i class="fas fa-box"></i></div>');
  }
};

const getGalleryPhotos = (product) => {
  const list = [];
  const seen = new Set();
  (product.ProductPhotos || []).forEach((ph) => {
    if (!seen.has(ph.photo_path)) {
      seen.add(ph.photo_path);
      list.push(ph);
    }
  });
  if (product.image_url && !seen.has(product.image_url)) {
    list.unshift({ id: null, photo_path: product.image_url, is_main: 1 });
  }
  return list;
};

const buildGallery = (product) => {
  currentProduct = product;
  const mainSrc = getMainPhotoSrc(API_BASE, product);
  const photos = getGalleryPhotos(product);

  if (!mainSrc && photos.length === 0) {
    setMainImage(null, product.name);
    $('#thumb-row').empty();
    $('#featured-admin-hint').addClass('d-none');
    return;
  }

  setMainImage(mainSrc, product.name);
  const $thumbs = $('#thumb-row').empty();
  const showAdmin = isAdmin() && getToken();

  if (showAdmin && photos.length > 1) {
    $('#featured-admin-hint').removeClass('d-none');
  } else {
    $('#featured-admin-hint').addClass('d-none');
  }

  photos.forEach((ph) => {
    const src = `${API_BASE}/${ph.photo_path}`;
    const featured = isFeatured(product, ph.photo_path);
    const featuredBtn = showAdmin && ph.id && !featured
      ? `<button type="button" class="set-featured-btn" data-photo-id="${ph.id}">Set Featured</button>`
      : '';
    $thumbs.append(`
      <div class="thumb-wrap">
        <button type="button" class="thumb-btn ${featured ? 'active' : ''}" data-src="${src}">
          <img src="${src}" alt="${product.name}">
          ${featured ? '<span class="featured-badge">Featured</span>' : ''}
        </button>
        ${featuredBtn}
      </div>
    `);
  });
};

const renderProduct = (p) => {
  document.title = `${p.name} | OfficeOne Store`;
  $('#d-code').text(p.item_code);
  $('#d-name').text(p.name);
  $('#d-badge').text(p.category).attr('class', `badge ${p.category === 'Service' ? 'badge-service' : 'badge-product'}`);
  $('#d-price').text(`PHP ${parseFloat(p.unit_price).toFixed(2)}`);
  $('#d-stock').text(p.stock_quantity);
  $('#d-status').text(Number(p.is_active) ? 'Available' : 'Unavailable');
  $('#d-desc').text(p.description || 'No description provided.');
  if (isAdmin()) {
    $('.customer-cart-action').hide();
  } else {
    $('.customer-cart-action').show();
  }
  buildGallery(p);
  $('#detail-loading').addClass('d-none');
  $('#detail-content').removeClass('d-none');
};

const showError = (msg) => {
  $('#detail-loading').html(`<p class="text-danger text-center py-5">${msg} <a href="index.html">Go back</a></p>`);
};

const reloadProduct = () => {
  $.get(`${API_URL}/products/${getProductId()}`, (res) => {
    if (res.result) renderProduct(res.result);
  });
};

$(document).ready(() => {
  const id = getProductId();
  if (!id) {
    showError('Product not found.');
    return;
  }

  $.ajax({
    url: `${API_URL}/products/${id}`,
    method: 'GET',
    dataType: 'json',
    timeout: 8000
  }).done((res) => {
    if (!res.result) {
      showError('Product not found.');
      return;
    }
    renderProduct(res.result);
  }).fail((xhr) => {
    if (xhr.status === 0) {
      showError('Cannot connect to server. Start the backend with <code>npm start</code>.');
    } else {
      showError('Could not load product.');
    }
  });

  $(document).on('click', '.thumb-btn', function () {
    $('.thumb-btn').removeClass('active');
    $(this).addClass('active');
    setMainImage($(this).data('src'), '');
  });

  $(document).on('click', '#btn-add-cart', function () {
    if (!currentProduct) return;
    if (isAdmin()) {
      Swal.fire({ icon: 'info', text: 'Admin accounts do not use cart.' });
      return;
    }
    const qty = parseInt($('#cart-qty').val(), 10) || 1;
    if (qty < 1) {
      Swal.fire({ icon: 'warning', text: 'Quantity must be at least 1.' });
      return;
    }
    Cart.add(currentProduct, qty);
    Swal.fire({ icon: 'success', title: 'Added to cart', timer: 1200, showConfirmButton: false });
  });

  $(document).on('click', '.set-featured-btn', function (e) {
    e.stopPropagation();
    const photoId = $(this).data('photo-id');
    const productId = getProductId();
    $.ajax({
      url: `${API_URL}/products/${productId}/photos/${photoId}/main`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${getToken()}` },
      success: () => reloadProduct()
    });
  });
});
