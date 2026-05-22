const CART_KEY = 'arco_cart';
window.dataLayer = window.dataLayer || [];

const Cart = {
  get() {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  },

  save(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    this.updateBadge();
  },

  add(productId, size, quantity = 1) {
    const items = this.get();
    const existing = items.findIndex(i => i.productId === productId && i.size === size);
    if (existing >= 0) {
      items[existing].quantity += quantity;
    } else {
      items.push({ productId, size, quantity });
    }
    this.save(items);

    const product = PRODUCTS.find(p => p.id === productId);
    if (product) {
      dataLayer.push({ ecommerce: null });
      dataLayer.push({
        event: 'add_to_cart',
        ecommerce: {
          currency: 'EUR',
          value: product.price * quantity,
          items: [{
            item_id: String(product.id),
            item_name: product.name,
            item_category: product.category,
            price: product.price,
            quantity: quantity,
            item_variant: size
          }]
        }
      });
    }
  },

  remove(index) {
    const items = this.get();
    const item = items[index];
    const product = PRODUCTS.find(p => p.id === item.productId);
    if (product) {
      dataLayer.push({ ecommerce: null });
      dataLayer.push({
        event: 'remove_from_cart',
        ecommerce: {
          currency: 'EUR',
          value: product.price * item.quantity,
          items: [{
            item_id: String(product.id),
            item_name: product.name,
            item_category: product.category,
            price: product.price,
            quantity: item.quantity,
            item_variant: item.size
          }]
        }
      });
    }
    items.splice(index, 1);
    this.save(items);
  },

  updateQuantity(index, quantity) {
    const items = this.get();
    if (quantity <= 0) {
      items.splice(index, 1);
    } else {
      items[index].quantity = quantity;
    }
    this.save(items);
  },

  count() {
    return this.get().reduce((sum, i) => sum + i.quantity, 0);
  },

  total() {
    return this.get().reduce((sum, i) => {
      const product = PRODUCTS.find(p => p.id === i.productId);
      return sum + (product ? product.price * i.quantity : 0);
    }, 0);
  },

  getItemsForDL() {
    return this.get().map(i => {
      const p = PRODUCTS.find(p => p.id === i.productId);
      return {
        item_id: String(p.id),
        item_name: p.name,
        item_category: p.category,
        price: p.price,
        quantity: i.quantity,
        item_variant: i.size
      };
    });
  },

  clear() {
    localStorage.removeItem(CART_KEY);
    this.updateBadge();
  },

  updateBadge() {
    const badge = document.getElementById('cart-count');
    if (badge) {
      const count = this.count();
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  }
};

// Format price helper
function formatPrice(n) {
  return '€' + n.toLocaleString('it-IT', { minimumFractionDigits: 0 });
}

document.addEventListener('DOMContentLoaded', () => {
  Cart.updateBadge();
});
