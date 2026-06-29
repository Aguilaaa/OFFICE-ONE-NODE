$(document).ready(() => {
  const setupHoverSidebar = () => {
    const $layout = $('.admin-layout');
    const $sidebar = $('.sidebar');
    if (!$layout.length || !$sidebar.length) return;

    $sidebar.find('.sidebar-nav a').each(function () {
      const $link = $(this);
      if ($link.find('.sidebar-label').length) return;

      const label = $.trim($link.text());
      const iconMap = {
        Dashboard: 'fa-tachometer-alt',
        Products: 'fa-cube',
        Categories: 'fa-tags',
        Orders: 'fa-shopping-cart',
        Users: 'fa-users',
        'Back to Site': 'fa-home',
        Logout: 'fa-power-off'
      };
      const iconClass = iconMap[label] || 'fa-circle';
      $link.empty().append(`<span class="sidebar-icon"><i class="fas ${iconClass}"></i></span><span class="sidebar-label">${label}</span>`);
      $link.attr('title', label);
    });

    let resizeTimer;
    const setExpanded = (expanded) => {
      $layout.toggleClass('sidebar-expanded', expanded);
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => $(window).trigger('resize'), 360);
    };

    $layout.removeClass('sidebar-collapsed').removeClass('sidebar-expanded');
    localStorage.removeItem('officeone_admin_sidebar_collapsed');
    $sidebar.on('mouseenter', () => setExpanded(true));
    $sidebar.on('mouseleave', () => setExpanded(false));
  };

  setupHoverSidebar();

  $(document).on('click', '#admin-logout', (e) => {
    e.preventDefault();
    const logout = () => {
      sessionStorage.clear();
      localStorage.removeItem('officeone_cart');
      window.location.href = '../login.html';
    };

    if (window.Swal) {
      Swal.fire({
        title: 'Logout?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Logout'
      }).then((result) => {
        if (result.isConfirmed) logout();
      });
      return;
    }

    logout();
  });
});
