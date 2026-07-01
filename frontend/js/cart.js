(() => {
  const KEY = 'officeone_cart';

  const save = (items) => {
    localStorage.setItem(KEY, JSON.stringify(items));
    Cart.updateBadge();
  };

  const tracksStock = (product) => (product.category || 'Product') !== 'Service';

  const stockQty = (product) => parseInt(product.stock_quantity, 10) || 0;

  window.Cart = {
    tracksStock,

    isOutOfStock(product) {
      return tracksStock(product) && stockQty(product) <= 0;
    },

    maxQuantity(product, currentInCart = 0) {
      if (!tracksStock(product)) return 9999;
      return Math.max(0, stockQty(product) - currentInCart);
    },

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
      const currentQty = existing ? existing.quantity : 0;
      const newTotal = currentQty + quantity;

      if (this.isOutOfStock(product)) {
        return { ok: false, message: `${product.name} is out of stock.` };
      }

      if (tracksStock(product) && newTotal > stockQty(product)) {
        const available = stockQty(product) - currentQty;
        if (available <= 0) {
          return { ok: false, message: `No more stock available for ${product.name}.` };
        }
        return { ok: false, message: `Only ${available} left in stock for ${product.name}.` };
      }

      if (existing) {
        existing.quantity = newTotal;
        existing.stock_quantity = product.stock_quantity;
        existing.category = product.category || 'Product';
      } else {
        items.push({
          product_id: product.id,
          name: product.name,
          item_code: product.item_code,
          unit_price: parseFloat(product.unit_price),
          stock_quantity: product.stock_quantity,
          category: product.category || 'Product',
          image_url: product.image_url || null,
          ProductPhotos: product.ProductPhotos || [],
          quantity
        });
      }
      save(items);
      return { ok: true };
    },

    updateQty(productId, qty) {
      const quantity = parseInt(qty, 10);
      let items = this.get();
      if (quantity <= 0) {
        items = items.filter((i) => i.product_id !== productId);
        save(items);
        return { ok: true };
      }

      const item = items.find((i) => i.product_id === productId);
      if (!item) return { ok: false, message: 'Item not found in cart.' };

      const product = {
        id: item.product_id,
        name: item.name,
        category: item.category || 'Product',
        stock_quantity: item.stock_quantity
      };

      if (this.isOutOfStock(product)) {
        items = items.filter((i) => i.product_id !== productId);
        save(items);
        return { ok: false, message: `${item.name} is out of stock and was removed from your cart.` };
      }

      if (tracksStock(product) && quantity > stockQty(product)) {
        return { ok: false, message: `Only ${stockQty(product)} available for ${item.name}.` };
      }

      item.quantity = quantity;
      save(items);
      return { ok: true };
    },

    syncStock(productMap) {
      let items = this.get();
      let removed = [];

      items = items.filter((item) => {
        const p = productMap[item.product_id];
        if (!p) return true;

        item.stock_quantity = p.stock_quantity;
        item.category = p.category || item.category || 'Product';

        if (this.isOutOfStock(p)) {
          removed.push(item.name);
          return false;
        }

        if (tracksStock(p) && item.quantity > stockQty(p)) {
          item.quantity = stockQty(p);
        }
        return true;
      });

      save(items);
      return { removed };
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
