/**
 * cart.js — client-side cart state (localStorage) plus the cart drawer
 * and full cart-page rendering. The totals shown here are an estimate
 * for the shopper; the server recalculates everything from scratch at
 * checkout and is the only source of truth for what gets charged.
 */
const Cart = (() => {
  const STORAGE_KEY = "nocturne_cart";
  // Mirrors the server defaults purely for a live estimate in the UI.
  const FLAT_SHIPPING = 12;
  const FREE_SHIPPING_THRESHOLD = 150;

  function read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function write(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    updateBadge();
    document.dispatchEvent(new CustomEvent("cart:changed", { detail: { items } }));
  }

  function getItems() {
    return read();
  }

  function count() {
    return read().reduce((sum, i) => sum + i.quantity, 0);
  }

  function subtotal() {
    return read().reduce((sum, i) => sum + i.price * i.quantity, 0);
  }

  function shippingEstimate() {
    const sub = subtotal();
    if (sub === 0) return 0;
    return sub >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
  }

  function total() {
    return subtotal() + shippingEstimate();
  }

  function add(product, quantity = 1) {
    const items = read();
    const existing = items.find((i) => i.productId === product.id);
    const maxQty = product.stock;

    if (existing) {
      existing.quantity = Math.min(existing.quantity + quantity, maxQty);
    } else {
      items.push({
        productId: product.id,
        name: product.name,
        slug: product.slug,
        image: product.image,
        category: product.category,
        price: product.price,
        stock: product.stock,
        quantity: Math.min(quantity, maxQty),
      });
    }
    write(items);
  }

  function setQuantity(productId, quantity) {
    let items = read();
    if (quantity <= 0) {
      items = items.filter((i) => i.productId !== productId);
    } else {
      const item = items.find((i) => i.productId === productId);
      if (item) item.quantity = Math.min(quantity, item.stock);
    }
    write(items);
  }

  function remove(productId) {
    write(read().filter((i) => i.productId !== productId));
  }

  function clear() {
    write([]);
  }

  function updateBadge() {
    const n = count();
    document.querySelectorAll("[data-cart-count]").forEach((el) => {
      el.textContent = n;
      el.classList.toggle("is-visible", n > 0);
    });
  }

  // ---------- Cart drawer ----------
  function drawerLineTemplate(item) {
    return `
      <div class="cart-line" data-line="${item.productId}">
        <div class="cart-line-media"><img src="${item.image}" alt="" loading="lazy"></div>
        <div>
          <div class="cart-line-name">${UI.escapeHtml(item.name)}</div>
          <div class="cart-line-cat">${UI.escapeHtml(item.category)}</div>
          <div class="qty-control">
            <button type="button" data-action="dec" aria-label="Decrease quantity">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-action="inc" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="cart-line-price">
          <span>${UI.formatPrice(item.price * item.quantity)}</span>
          <button type="button" class="cart-line-remove" data-action="remove">Remove</button>
        </div>
      </div>`;
  }

  function renderDrawer() {
    const drawer = document.querySelector("#cart-drawer");
    if (!drawer) return;
    const body = drawer.querySelector(".cart-drawer-body");
    const foot = drawer.querySelector(".cart-drawer-foot");
    const items = read();

    if (items.length === 0) {
      body.innerHTML = `
        <div class="cart-empty">
          <p>Your cart is empty. Nothing in here yet but quiet.</p>
          <a href="shop.html" class="btn btn-primary">Browse the shop</a>
        </div>`;
      foot.style.display = "none";
      return;
    }

    foot.style.display = "block";
    body.innerHTML = items.map(drawerLineTemplate).join("");

    const sub = subtotal();
    const ship = shippingEstimate();
    foot.innerHTML = `
      <div class="cart-summary-row"><span>Subtotal</span><span>${UI.formatPrice(sub)}</span></div>
      <div class="cart-summary-row"><span>Shipping</span><span>${ship === 0 ? "Free" : UI.formatPrice(ship)}</span></div>
      <div class="cart-summary-row total"><span>Total</span><span>${UI.formatPrice(sub + ship)}</span></div>
      <a href="checkout.html" class="btn btn-primary btn-block" style="margin-top:20px;">Checkout</a>
      <a href="cart.html" class="btn btn-ghost btn-block" style="margin-top:10px;">View cart</a>
    `;
  }

  function bindLineEvents(container) {
    container.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const line = btn.closest("[data-line]");
      const productId = Number(line.dataset.line);
      const items = read();
      const item = items.find((i) => i.productId === productId);
      if (!item) return;

      if (btn.dataset.action === "inc") setQuantity(productId, item.quantity + 1);
      if (btn.dataset.action === "dec") setQuantity(productId, item.quantity - 1);
      if (btn.dataset.action === "remove") remove(productId);
    });
  }

  function openDrawer() {
    document.querySelector("#cart-drawer")?.classList.add("is-open");
    document.querySelector("#cart-overlay")?.classList.add("is-visible");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    document.querySelector("#cart-drawer")?.classList.remove("is-open");
    document.querySelector("#cart-overlay")?.classList.remove("is-visible");
    document.body.style.overflow = "";
  }

  function initDrawer() {
    const drawer = document.querySelector("#cart-drawer");
    if (!drawer) return;

    renderDrawer();
    bindLineEvents(drawer);
    document.addEventListener("cart:changed", renderDrawer);

    document.querySelectorAll("[data-open-cart]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.preventDefault();
        openDrawer();
      })
    );
    document.querySelector("#cart-overlay")?.addEventListener("click", closeDrawer);
    drawer.querySelector(".cart-drawer-close")?.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer();
    });
  }

  // ---------- Full cart page ----------
  function pageLineTemplate(item) {
    return `
      <div class="cart-line" data-line="${item.productId}">
        <div class="cart-line-media"><img src="${item.image}" alt="" loading="lazy"></div>
        <div>
          <div class="cart-line-name">${UI.escapeHtml(item.name)}</div>
          <div class="cart-line-cat">${UI.escapeHtml(item.category)}</div>
          <div class="qty-control">
            <button type="button" data-action="dec" aria-label="Decrease quantity">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-action="inc" aria-label="Increase quantity">+</button>
          </div>
          ${item.quantity >= item.stock ? '<div class="text-muted" style="font-size:.78rem;margin-top:6px;">Max available stock reached</div>' : ""}
        </div>
        <div class="cart-line-price">
          <span>${UI.formatPrice(item.price * item.quantity)}</span>
          <button type="button" class="cart-line-remove" data-action="remove">Remove</button>
        </div>
      </div>`;
  }

  function renderCartPage() {
    const list = document.querySelector("#cart-page-list");
    const summary = document.querySelector("#cart-page-summary");
    if (!list) return;

    const items = read();

    if (items.length === 0) {
      document.querySelector("#cart-page-layout").innerHTML = `
        <div class="state-block">
          <h3>Your cart is empty</h3>
          <p>Nothing saved for later yet. Explore the current collection and add something to your cart.</p>
          <a href="shop.html" class="btn btn-primary">Browse the shop</a>
        </div>`;
      return;
    }

    list.innerHTML = items.map(pageLineTemplate).join("");

    const sub = subtotal();
    const ship = shippingEstimate();
    summary.innerHTML = `
      <h3>Order summary</h3>
      <div class="cart-summary-row"><span>Subtotal</span><span>${UI.formatPrice(sub)}</span></div>
      <div class="cart-summary-row"><span>Estimated shipping</span><span>${ship === 0 ? "Free" : UI.formatPrice(ship)}</span></div>
      <div class="cart-summary-row total"><span>Estimated total</span><span>${UI.formatPrice(sub + ship)}</span></div>
      <a href="checkout.html" class="btn btn-primary btn-block" style="margin-top:22px;">Proceed to checkout</a>
    `;
  }

  function initCartPage() {
    const layout = document.querySelector("#cart-page-layout");
    if (!layout) return;
    // Delegate from the outer container, which is never replaced wholesale
    // (only its children are, between the empty state and the item list),
    // so this binds exactly once no matter how many times the cart changes.
    bindLineEvents(layout);
    renderCartPage();
    document.addEventListener("cart:changed", renderCartPage);
  }

  // ---------- Cross-tab and back/forward-cache sync ----------
  // write() already updates this tab's own UI. Two more cases need
  // covering: (1) the cart changed in a *different* tab of this same
  // site — the native `storage` event fires here when that happens,
  // unlike our custom "cart:changed" event which is page-local; and
  // (2) this page was restored from the browser's back/forward cache
  // (pressing Back), which skips re-running DOMContentLoaded entirely,
  // so the badge/drawer could still show whatever was true when the
  // page was left rather than the cart's current contents.
  function refreshFromExternalChange() {
    updateBadge();
    document.dispatchEvent(new CustomEvent("cart:changed", { detail: { items: read() } }));
  }

  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) refreshFromExternalChange();
  });

  window.addEventListener("pageshow", (e) => {
    if (e.persisted) refreshFromExternalChange();
  });

  document.addEventListener("DOMContentLoaded", () => {
    updateBadge();
    initDrawer();
    initCartPage();
  });

  return {
    getItems,
    count,
    subtotal,
    shippingEstimate,
    total,
    add,
    setQuantity,
    remove,
    clear,
    openDrawer,
    closeDrawer,
    FLAT_SHIPPING,
    FREE_SHIPPING_THRESHOLD,
  };
})();
