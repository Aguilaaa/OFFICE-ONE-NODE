const API_BASE = 'http://localhost:4000';
const API_URL = `${API_BASE}/api/v1`;
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

const validateProductForm = () => {
  let ok = true;
  [
    { id: '#item_code', err: '#item_code-error' },
    { id: '#name', err: '#name-error' },
    { id: '#unit_price', err: '#unit_price-error' }
  ].forEach(({ id, err }) => {
    if (!$(id).val().trim()) { $(err).show(); ok = false; } else { $(err).hide(); }
  });
  if ($('#unit_price').val() && isNaN($('#unit_price').val())) {
    $('#unit_price-error').text('Must be a number').show();
    ok = false;
  }
  return ok;
};

const validatePhotoForm = () => {
  const files = $('#photo-files')[0].files;
  if (!files || files.length === 0) {
    $('#photos-error').show();
    return false;
  }
  $('#photos-error').hide();
  return true;
};

const renderPhotoPreview = (product) => {
  const $preview = $('#photo-preview');
  $preview.empty();
  const photos = product?.ProductPhotos || [];
  if (photos.length === 0) {
    $preview.html('<p class="text-muted small mb-0">No photos yet. Upload below — the first photo becomes featured.</p>');
    return;
  }
  photos.forEach((ph) => {
    const isMain = product.image_url === ph.photo_path || ph.is_main;
    $preview.append(`
      <div class="photo-preview-item ${isMain ? 'is-main' : ''}">
        <img src="${API_BASE}/${ph.photo_path}" alt="Product photo">
        ${isMain ? '<span class="photo-main-badge">Featured</span>' : `<button type="button" class="btn btn-sm btn-outline-primary set-featured-btn set-main-btn" data-photo-id="${ph.id}">Set Featured</button>`}
        <button type="button" class="btn btn-sm btn-danger delete-photo-btn" data-photo-id="${ph.id}">Delete</button>
      </div>
    `);
  });
};

let productTable;
const trashState = { showTrashed: false };

$(document).ready(() => {
  if (!checkAdmin()) return;

  productTable = $('#products-table').DataTable({
    ajax: { url: `${API_URL}/products`, dataSrc: 'rows', headers: { Authorization: `Bearer ${getToken()}` } },
    columns: [
      { data: 'id' },
      {
        data: 'image_url',
        orderable: false,
        render: (d, t, row) => {
          const src = getMainPhotoSrc(API_BASE, row);
          if (src) return `<img class="table-product-img" src="${src}" alt="${escapeHtml(row.name || 'Product image')}">`;
          return '<span class="table-product-placeholder"><i class="fas fa-image"></i></span>';
        }
      },
      { data: 'item_code', render: (d) => `<span class="item-code-pill">${escapeHtml(d)}</span>` },
      { data: 'name', render: (d) => `<strong class="table-product-name">${escapeHtml(d)}</strong>` },
      { data: 'category', render: (d) => `<span class="badge ${d === 'Service' ? 'badge-service' : 'badge-product'}">${escapeHtml(d)}</span>` },
      { data: 'unit_price', render: (d) => `PHP ${parseFloat(d).toFixed(2)}` },
      { data: 'stock_quantity' },
      { data: 'is_active', render: (d) => `<span class="status-pill ${d ? 'status-active' : 'status-inactive'}">${d ? 'Active' : 'Inactive'}</span>` },
      {
        data: null,
        orderable: false,
        render: (row) => {
          if (trashState.showTrashed) {
            return `<div class="table-actions"><button class="btn btn-success btn-sm restore-btn" data-id="${row.id}"><i class="fas fa-trash-restore"></i> Restore</button></div>`;
          }
          return `
          <div class="table-actions product-actions">
            <button class="btn btn-secondary btn-sm edit-btn" data-id="${row.id}"><i class="fas fa-edit"></i> Edit</button>
            <button class="btn btn-primary btn-sm photo-btn" data-id="${row.id}" data-name="${escapeHtml(row.name)}"><i class="fas fa-images"></i> Photos</button>
            <button class="btn btn-danger btn-sm delete-btn" data-id="${row.id}"><i class="fas fa-trash"></i> Delete</button>
          </div>
        `;
        }
      }
    ]
  });

  setupTrashToggle({ table: productTable, listUrl: `${API_URL}/products`, $btn: $('#btn-trash'), $addBtn: $('#btn-add'), trashState });
  bindRestore({ resource: 'products', table: productTable, getToken, apiUrl: API_URL });

  $('#btn-add').click(() => {
    $('#product-form')[0].reset();
    $('#product-id').val('');
    $('#productModal .modal-title').text('Add Product');
    $('#productModal').modal('show');
  });

  $(document).on('click', '.edit-btn', function () {
    $.get(`${API_URL}/products/${$(this).data('id')}`, (res) => {
      const p = res.result;
      $('#product-id').val(p.id);
      $('#item_code').val(p.item_code);
      $('#name').val(p.name);
      $('#category').val(p.category);
      $('#unit_price').val(p.unit_price);
      $('#stock_quantity').val(p.stock_quantity);
      $('#description').val(p.description || '');
      $('#is_active').val(p.is_active);
      $('#productModal .modal-title').text('Edit Product');
      $('#productModal').modal('show');
    });
  });

  $(document).on('click', '.photo-btn', function () {
    const id = $(this).data('id');
    const name = $(this).data('name');
    $('#photo-product-id').val(id);
    $('#photo-product-name').text(name);
    $('#photo-form')[0].reset();
    $('#photos-error').hide();
    $.get(`${API_URL}/products/${id}`, (res) => renderPhotoPreview(res.result));
    $('#photoModal').modal('show');
  });

  $('#product-form').submit(function (e) {
    e.preventDefault();
    if (!validateProductForm()) return;
    const id = $('#product-id').val();
    $.ajax({
      url: id ? `${API_URL}/products/${id}` : `${API_URL}/products`,
      method: id ? 'PUT' : 'POST',
      data: new FormData(this),
      processData: false,
      contentType: false,
      headers: { Authorization: `Bearer ${getToken()}` },
      success: () => { $('#productModal').modal('hide'); productTable.ajax.reload(); },
      error: (xhr) => Swal.fire('Error', xhr.responseJSON?.error || 'Save failed', 'error')
    });
  });

  $('#photo-form').submit(function (e) {
    e.preventDefault();
    if (!validatePhotoForm()) return;
    const id = $('#photo-product-id').val();
    $.ajax({
      url: `${API_URL}/products/${id}/photos`,
      method: 'POST',
      data: new FormData(this),
      processData: false,
      contentType: false,
      headers: { Authorization: `Bearer ${getToken()}` },
      success: (res) => {
        Swal.fire({ icon: 'success', title: 'Uploaded', text: `${res.photos.length} photo(s) added`, timer: 1500, showConfirmButton: false });
        $.get(`${API_URL}/products/${id}`, (r) => renderPhotoPreview(r.result));
        productTable.ajax.reload(null, false);
      },
      error: (xhr) => Swal.fire('Error', xhr.responseJSON?.error || 'Upload failed', 'error')
    });
  });

  $(document).on('click', '.set-main-btn', function () {
    const productId = $('#photo-product-id').val();
    const photoId = $(this).data('photo-id');
    $.ajax({
      url: `${API_URL}/products/${productId}/photos/${photoId}/main`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${getToken()}` },
      success: () => {
        $.get(`${API_URL}/products/${productId}`, (res) => renderPhotoPreview(res.result));
        productTable.ajax.reload(null, false);
      },
      error: (xhr) => Swal.fire('Error', xhr.responseJSON?.error || 'Failed', 'error')
    });
  });

  $(document).on('click', '.delete-photo-btn', function () {
    const productId = $('#photo-product-id').val();
    const photoId = $(this).data('photo-id');
    Swal.fire({
      title: 'Delete photo?',
      text: 'This uploaded image will be removed from the product.',
      icon: 'warning',
      showCancelButton: true
    }).then((result) => {
      if (!result.isConfirmed) return;
      $.ajax({
        url: `${API_URL}/products/${productId}/photos/${photoId}`,
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
        success: () => {
          $.get(`${API_URL}/products/${productId}`, (res) => renderPhotoPreview(res.result));
          productTable.ajax.reload(null, false);
        },
        error: (xhr) => Swal.fire('Error', xhr.responseJSON?.error || 'Delete failed', 'error')
      });
    });
  });

  $(document).on('click', '.delete-btn', function () {
    const id = $(this).data('id');
    Swal.fire({ title: 'Move to trash?', text: 'You can restore this product later.', icon: 'warning', showCancelButton: true }).then((r) => {
      if (!r.isConfirmed) return;
      $.ajax({
        url: `${API_URL}/products/${id}`, method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
        success: () => productTable.ajax.reload()
      });
    });
  });
});
