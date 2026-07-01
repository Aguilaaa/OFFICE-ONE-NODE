const API_BASE = (window.location.port === '4000')
  ? window.location.origin
  : 'http://localhost:4000';
const API_URL = `${API_BASE}/api/v1`;
const PAGE_SIZE = 8;
let allProducts = [];
let currentPage = 0;
let loadingMore = false;

const isActiveProduct = (p) => Number(p.is_active) === 1 || p.is_active === true;

const productCardImage = (p) => {
  const src = getMainPhotoSrc(API_BASE, p);
  return src
    ? `<img src="${src}" alt="${p.name}">`
    : `<div class="img-placeholder"><i class="fas fa-box"></i></div>`;
};

const showGridMessage = (html) => {
  $('#product-grid').html(`<div class="text-center w-100 p-4" style="grid-column: 1 / -1;">${html}</div>`);
  $('#pagination').empty();
  $('#scroll-status').empty();
};

const productCardHtml = (p) => {
  const img = productCardImage(p);
  const badge = p.category === 'Service' ? 'badge-service' : 'badge-product';
  const outOfStock = Cart.isOutOfStock(p);
  const stockLabel = p.category === 'Service'
    ? 'Service item'
    : outOfStock
      ? '<span class="stock-out">Out of Stock</span>'
      : `Stock: ${p.stock_quantity}`;
  const btnClass = outOfStock ? 'btn btn-secondary btn-sm btn-block add-cart-btn' : 'btn btn-primary btn-sm btn-block add-cart-btn';
  const btnLabel = outOfStock ? 'Out of Stock' : 'Add to Cart';
  const btnDisabled = outOfStock ? 'disabled' : '';

  return `
    <div class="product-card ${outOfStock ? 'product-card--out-of-stock' : ''}">
      <a href="product-detail.html?id=${p.id}" class="product-card-link">
        ${img}
        <div class="card-body">
          <div class="product-code">${p.item_code}</div>
          <div class="product-name">${p.name}</div>
          <span class="badge ${badge}">${p.category}</span>
          <div class="product-price">PHP ${parseFloat(p.unit_price).toFixed(2)}</div>
          <small class="text-muted">${stockLabel}</small>
        </div>
      </a>
      <div class="card-actions customer-cart-action">
        <button type="button" class="${btnClass}" data-id="${p.id}" ${btnDisabled}>${btnLabel}</button>
      </div>
    </div>
  `;
};

const updateInfiniteStatus = () => {
  const shown = currentPage * PAGE_SIZE;
  if (shown < allProducts.length) {
    $('#scroll-status').html('<span class="infinite-status"><i class="fas fa-arrow-down"></i> Scroll down to load more products</span>');
  } else {
    $('#scroll-status').html('<span class="infinite-status">All products loaded</span>');
  }
};

const renderPagination = () => {
  const totalPages = Math.ceil(allProducts.length / PAGE_SIZE);
  const $pag = $('#pagination');
  $pag.empty();
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    $pag.append(`<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`);
  }
};

const appendNextProducts = () => {
  if (loadingMore || currentPage * PAGE_SIZE >= allProducts.length) return;
  loadingMore = true;
  const start = currentPage * PAGE_SIZE;
  const pageItems = allProducts.slice(start, start + PAGE_SIZE);
  const $grid = $('#product-grid');

  if (pageItems.length === 0) {
    updateInfiniteStatus();
    loadingMore = false;
    return;
  }

  pageItems.forEach((p) => {
    $grid.append(productCardHtml(p));
  });
  if (typeof isAdminUser === 'function' && isAdminUser()) {
    $('.customer-cart-action').hide();
  }

  currentPage += 1;
  renderPagination();
  updateInfiniteStatus();
  loadingMore = false;
};

const renderProducts = () => {
  const $grid = $('#product-grid');
  $grid.empty();
  currentPage = 0;

  if (allProducts.length === 0) {
    showGridMessage('<p class="text-muted">No products found.</p>');
    return;
  }

  appendNextProducts();
};

const showPage = (page) => {
  $('#product-grid').empty();
  currentPage = page - 1;
  appendNextProducts();
  $('html, body').animate({ scrollTop: $('#product-grid').offset().top - 20 }, 200);
};

const shouldLoadMore = () => {
  const distanceFromBottom = $(document).height() - ($(window).scrollTop() + $(window).height());
  return distanceFromBottom < 250;
};

const loadProducts = (search = '') => {
  showGridMessage('<p class="text-muted"><i class="fas fa-spinner fa-spin"></i> Loading products...</p>');

  $.ajax({
    url: `${API_URL}/products`,
    method: 'GET',
    data: search ? { search } : {},
    dataType: 'json',
    timeout: 8000
  }).done((data) => {
    if (!data || !Array.isArray(data.rows)) {
      showGridMessage('<p class="text-danger">Invalid API response. Check backend.</p>');
      return;
    }
    allProducts = data.rows.filter(isActiveProduct);
    if (allProducts.length === 0) {
      showGridMessage('<p class="text-muted">No active products in database. Run <code>npm run seed</code> in backend.</p>');
      return;
    }
    renderProducts();
  }).fail((xhr) => {
    const msg = xhr.status === 0
      ? 'Cannot reach the API server.'
      : `API error (${xhr.status}).`;
    showGridMessage(`
      <p class="text-danger"><strong>${msg}</strong></p>
      <p class="text-muted">Start the backend first:</p>
      <code>cd office-one/backend → npm start</code>
      <p class="mt-2">Then open: <a href="http://localhost:4000/index.html"><strong>http://localhost:4000/index.html</strong></a></p>
      <p class="small text-muted">Do not open the HTML file directly from File Explorer.</p>
    `);
  });
};

$(document).ready(() => {
  if (typeof $ === 'undefined') {
    showGridMessage('<p class="text-danger">jQuery failed to load. Check your internet connection.</p>');
    return;
  }

  loadProducts();

  if ($.fn.autocomplete) {
    $('#search-input').autocomplete({
      source: (request, response) => {
        $.get(`${API_URL}/products/search`, { q: request.term }, (data) => {
          response((data.rows || []).map((p) => ({
            label: `${p.name} (${p.item_code}) - PHP ${p.unit_price}`,
            value: p.name,
            id: p.id
          })));
        }).fail(() => response([]));
      },
      minLength: 2,
      select: (e, ui) => {
        window.location.href = `product-detail.html?id=${ui.item.id}`;
      }
    });
  }

  $('#btn-search').click(() => {
    loadProducts($('#search-input').val());
  });

  $(window).on('scroll', () => {
    if (shouldLoadMore()) appendNextProducts();
  });

  $(document).on('click', '.page-btn', function () {
    showPage(parseInt($(this).data('page'), 10));
  });

  $('.filter-btn').click(function () {
    $('.filter-btn').removeClass('btn-primary').addClass('btn-secondary');
    $(this).removeClass('btn-secondary').addClass('btn-primary');
    const cat = $(this).data('category');
    if (cat === 'all') {
      loadProducts();
    } else {
      showGridMessage('<p class="text-muted"><i class="fas fa-spinner fa-spin"></i> Loading...</p>');
      $.get(`${API_URL}/products`, { category: cat }, (data) => {
        allProducts = (data.rows || []).filter(isActiveProduct);
        renderProducts();
      }).fail(() => loadProducts());
    }
  });

  $(document).on('click', '.add-cart-btn', function (e) {
    e.preventDefault();
    if (typeof isAdminUser === 'function' && isAdminUser()) {
      Swal.fire({ icon: 'info', text: 'Admin accounts do not use cart.' });
      return;
    }
    const id = parseInt($(this).data('id'), 10);
    const product = allProducts.find((p) => p.id === id);
    if (!product) return;
    if (Cart.isOutOfStock(product)) {
      Swal.fire({ icon: 'warning', title: 'Out of Stock', text: `${product.name} is currently unavailable.` });
      return;
    }
    const result = Cart.add(product, 1);
    if (!result.ok) {
      Swal.fire({ icon: 'warning', title: 'Cannot add to cart', text: result.message });
      return;
    }
    Swal.fire({ icon: 'success', title: 'Added to cart', timer: 1200, showConfirmButton: false });
  });
});
