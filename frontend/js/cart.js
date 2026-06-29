(() => {
  const KEY = 'officeone_cart';

  const save = (items) => {
    localStorage.setItem(KEY, JSON.stringify(items));
    Cart.updateBadge();
  };

  window.Cart = {
    get() {
      try {
        return JSON.parse(localStorage.getItem(KEY) || '[]');
      } catch {
        return [];
      }
    },

    count() {
      return this.get().reduce((sum, item) => sum + item.quantity, 0);
    },

    subtotal() {
      return this.get().reduce((sum, item) => sum + item.quantity * parseFloat(item.unit_price), 0);
    },

    add(product, qty = 1) {
      const quantity = Math.max(1, parseInt(qty, 10) || 1);
      const items = this.get();
      const existing = items.find((i) => i.product_id === product.id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        items.push({
          product_id: product.id,
          name: product.name,
          item_code: product.item_code,
          unit_price: parseFloat(product.unit_price),
          unit: product.unit,
          stock_quantity: product.stock_quantity,
          image_url: product.image_url || null,
          ProductPhotos: product.ProductPhotos || [],
          quantity
        });
      }
      save(items);
      return items;
    },

    updateQty(productId, qty) {
      const quantity = parseInt(qty, 10);
      let items = this.get();
      if (quantity <= 0) {
        items = items.filter((i) => i.product_id !== productId);
      } else {
        const item = items.find((i) => i.product_id === productId);
        if (item) item.quantity = quantity;
      }
      save(items);
      return items;
    },

    remove(productId) {
      const items = this.get().filter((i) => i.product_id !== productId);
      save(items);
      return items;
    },

    clear() {
      localStorage.removeItem(KEY);
      this.updateBadge();
    },

    updateBadge() {
      const count = this.count();
      const $badge = $('#cart-count');
      if (!$badge.length) return;
      $badge.text(count);
      $badge.toggle(count > 0);
    },

    toOrderItems() {
      return this.get().map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price
      }));
    }
  };
})();
