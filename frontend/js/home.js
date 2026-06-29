const API_BASE = (window.location.port === '4000')
  ? window.location.origin
  : 'http://localhost:4000';
const API_URL = `${API_BASE}/api/v1`;
const PAGE_SIZE = 8;
let allProducts = [];
let currentPage = 1;

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
};

const renderProducts = (products) => {
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = products.slice(start, start + PAGE_SIZE);
  const $grid = $('#product-grid');
  $grid.empty();

  if (pageItems.length === 0) {
    showGridMessage('<p class="text-muted">No products found.</p>');
    return;
  }

  pageItems.forEach((p) => {
    const img = productCardImage(p);
    const badge = p.category === 'Service' ? 'badge-service' : 'badge-product';
    $grid.append(`
      <div class="product-card">
        <a href="product-detail.html?id=${p.id}" class="product-card-link">
          ${img}
          <div class="card-body">
            <div class="product-code">${p.item_code}</div>
            <div class="product-name">${p.name}</div>
            <span class="badge ${badge}">${p.category}</span>
            <div class="product-price">PHP ${parseFloat(p.unit_price).toFixed(2)}</div>
            <small class="text-muted">${p.unit} | Stock: ${p.stock_quantity}</small>
          </div>
        </a>
        <div class="card-actions">
          <button type="button" class="btn btn-primary btn-sm btn-block add-cart-btn" data-id="${p.id}">Add to Cart</button>
        </div>
      </div>
    `);
  });

  renderPagination(products.length);
};

const renderPagination = (total) => {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const $pag = $('#pagination');
  $pag.empty();
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    $pag.append(`<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`);
  }
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
    currentPage = 1;
    if (allProducts.length === 0) {
      showGridMessage('<p class="text-muted">No active products in database. Run <code>npm run seed</code> in backend.</p>');
      return;
    }
    renderProducts(allProducts);
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

  $(document).on('click', '.page-btn', function () {
    currentPage = parseInt($(this).data('page'), 10);
    renderProducts(allProducts);
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
        currentPage = 1;
        renderProducts(allProducts);
      }).fail(() => loadProducts());
    }
  });

  $(document).on('click', '.add-cart-btn', function (e) {
    e.preventDefault();
    const id = parseInt($(this).data('id'), 10);
    const product = allProducts.find((p) => p.id === id);
    if (!product) return;
    Cart.add(product, 1);
    Swal.fire({ icon: 'success', title: 'Added to cart', timer: 1200, showConfirmButton: false });
  });
});
