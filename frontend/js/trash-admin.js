window.setupTrashToggle = ({ table, listUrl, $btn, $addBtn, trashState }) => {
  $btn.on('click', () => {
    trashState.showTrashed = !trashState.showTrashed;
    $btn.toggleClass('btn-outline-secondary btn-warning');
    $btn.html(trashState.showTrashed
      ? '<i class="fas fa-list"></i> Show Active'
      : '<i class="fas fa-trash-restore"></i> Show Deleted');
    if ($addBtn?.length) $addBtn.toggle(!trashState.showTrashed);
    table.ajax.url(`${listUrl}?trashed=${trashState.showTrashed ? 1 : 0}`).load();
  });
};

window.bindRestore = ({ resource, table, getToken, apiUrl }) => {
  const base = apiUrl || 'http://localhost:4000/api/v1';
  $(document).on('click', '.restore-btn', function () {
    const id = $(this).data('id');
    Swal.fire({ title: 'Restore this record?', icon: 'question', showCancelButton: true }).then((r) => {
      if (!r.isConfirmed) return;
      $.ajax({
        url: `${base}/${resource}/${id}/restore`,
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` },
        success: () => {
          Swal.fire({ icon: 'success', title: 'Restored', timer: 1200, showConfirmButton: false });
          table.ajax.reload(null, false);
        },
        error: (xhr) => Swal.fire('Error', xhr.responseJSON?.error || 'Restore failed', 'error')
      });
    });
  });
};
