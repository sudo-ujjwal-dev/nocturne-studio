/**
 * checkout.js — renders the order summary from the cart and submits a
 * real order to POST /api/orders. All totals shown here are estimates;
 * the order actually created reflects whatever the server calculates.
 */
(() => {
  async function init() {
    const root = document.querySelector("#checkout-root");
    if (!root) return;

    const user = await Auth.requireAuthOrRedirect();
    if (!user) return; // already redirecting to login

    const items = Cart.getItems();
    if (items.length === 0) {
      root.innerHTML = `
        <div class="state-block centered" style="margin-inline:auto;">
          <h3>Your cart is empty</h3>
          <p>Add something to your cart before checking out.</p>
          <a href="shop.html" class="btn btn-primary">Browse the shop</a>
        </div>`;
      return;
    }

    renderOrderLines(items);
    renderSummary();
    prefillContactFields(user);

    const form = document.querySelector("#checkout-form");
    form.addEventListener("submit", handleSubmit);
  }

  function renderOrderLines(items) {
    const list = document.querySelector("#checkout-order-lines");
    list.innerHTML = items
      .map(
        (i) => `
        <div class="checkout-order-line">
          <img src="${i.image}" alt="" loading="lazy">
          <div>
            <div class="name">${UI.escapeHtml(i.name)}</div>
            <div class="qty">Qty ${i.quantity}</div>
          </div>
          <div class="price">${UI.formatPrice(i.price * i.quantity)}</div>
        </div>`
      )
      .join("");
  }

  function renderSummary() {
    const sub = Cart.subtotal();
    const ship = Cart.shippingEstimate();
    document.querySelector("#checkout-summary").innerHTML = `
      <div class="cart-summary-row"><span>Subtotal</span><span>${UI.formatPrice(sub)}</span></div>
      <div class="cart-summary-row"><span>Estimated shipping</span><span>${ship === 0 ? "Free" : UI.formatPrice(ship)}</span></div>
      <div class="cart-summary-row total"><span>Estimated total</span><span>${UI.formatPrice(sub + ship)}</span></div>
      <p class="text-muted" style="font-size:.8rem;margin-top:14px;">
        The final total is calculated by the server when your order is placed.
      </p>
    `;
  }

  function prefillContactFields(user) {
    const nameField = document.querySelector('[name="customerName"]');
    const emailField = document.querySelector('[name="customerEmail"]');
    if (nameField && !nameField.value) nameField.value = user.name;
    if (emailField && !emailField.value) emailField.value = user.email;
  }

  function clearErrors(form) {
    form.querySelectorAll(".field").forEach((f) => f.classList.remove("has-error"));
    form.querySelectorAll(".field-error").forEach((f) => (f.textContent = ""));
    const banner = form.querySelector(".form-banner");
    if (banner) banner.className = "form-banner";
  }

  function showFieldErrors(form, details) {
    Object.entries(details).forEach(([key, msg]) => {
      const field = form.querySelector(`[data-field="${key}"]`);
      if (!field) return;
      field.classList.add("has-error");
      const err = field.querySelector(".field-error");
      if (err) err.textContent = msg;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    clearErrors(form);

    const submitBtn = form.querySelector('button[type="submit"]');
    const data = Object.fromEntries(new FormData(form).entries());

    const items = Cart.getItems().map((i) => ({ productId: i.productId, quantity: i.quantity }));

    submitBtn.disabled = true;
    submitBtn.textContent = "Placing your order…";

    try {
      const res = await Api.orders.create({ ...data, items });
      Cart.clear();
      window.location.href = `order-success.html?orderId=${res.data.id}`;
    } catch (err) {
      const banner = form.querySelector(".form-banner");
      if (err.status === 400 && err.details) {
        showFieldErrors(form, err.details);
        if (banner) {
          banner.textContent = "Please fix the highlighted fields.";
          banner.className = "form-banner is-visible error";
        }
      } else if (err.status === 409) {
        // Stock changed between browsing and checkout — a real
        // concurrency case, not a fake validation message.
        if (banner) {
          banner.textContent = err.message;
          banner.className = "form-banner is-visible error";
        }
        UI.toastError(err);
      } else {
        if (banner) {
          banner.textContent = err.message || "We couldn't place your order. Please try again.";
          banner.className = "form-banner is-visible error";
        }
        UI.toastError(err);
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Place order";
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
