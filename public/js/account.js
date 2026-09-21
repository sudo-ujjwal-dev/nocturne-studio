/**
 * account.js — the account page (profile + order history) and the
 * order-success confirmation page. Both require a logged-in user, and
 * both only ever fetch orders that belong to that user (enforced
 * server-side too — this is UX, not the security boundary).
 */
(() => {
  function orderRowHTML(order) {
    const itemsSummary = order.items
      .map((i) => `${i.quantity} × ${UI.escapeHtml(i.product.name)}`)
      .join(", ");
    const date = new Date(order.createdAt).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    return `
      <div class="order-row">
        <div class="order-row-head">
          <div>
            <strong>Order #${order.id}</strong>
            <span class="text-muted" style="margin-left:10px;font-size:.85rem;">${date}</span>
          </div>
          <div style="display:flex;align-items:center;gap:14px;">
            <span class="order-status ${order.status}">${order.status.toLowerCase()}</span>
            <strong>${UI.formatPrice(order.total)}</strong>
          </div>
        </div>
        <div class="order-row-items">${itemsSummary}</div>
      </div>`;
  }

  function renderAvatar(user) {
    const img = document.querySelector("#account-avatar");
    if (!img) return;
    if (user.avatar) {
      img.src = user.avatar;
      img.style.display = "block";
    } else {
      img.style.display = "none";
    }
  }

  function initProfileForm(user) {
    const form = document.querySelector("#profile-form");
    if (!form) return;

    document.querySelector("#pf-profile-name").value = user.name;

    const fileInput = document.querySelector("#pf-avatar-file");
    const status = document.querySelector("#pf-avatar-status");
    let pendingAvatarUrl = undefined; // undefined = unchanged this session

    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      status.textContent = "Uploading…";
      try {
        const res = await Api.users.uploadAvatar(file);
        pendingAvatarUrl = res.data.url;
        renderAvatar({ avatar: pendingAvatarUrl });
        status.textContent = "Uploaded ✓";
      } catch (err) {
        status.textContent = "";
        UI.toastError(err);
        e.target.value = "";
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const banner = form.querySelector(".form-banner");
      form.querySelectorAll(".field").forEach((f) => f.classList.remove("has-error"));
      form.querySelectorAll(".field-error").forEach((f) => (f.textContent = ""));

      const data = { name: document.querySelector("#pf-profile-name").value };
      if (pendingAvatarUrl !== undefined) data.avatar = pendingAvatarUrl;

      submitBtn.disabled = true;
      submitBtn.textContent = "Saving…";

      try {
        const res = await Api.users.updateMe(data);
        document.querySelector("#account-name").textContent = res.data.user.name;
        renderAvatar(res.data.user);
        await Auth.loadCurrentUser(); // resync the cached session (header, seller-link visibility, etc.)
        UI.toast({ title: "Profile updated." });
        banner.className = "form-banner";
      } catch (err) {
        if (err.status === 400 && err.details) {
          Object.entries(err.details).forEach(([key, msg]) => {
            const field = form.querySelector(`[data-field="${key}"]`);
            if (!field) return;
            field.classList.add("has-error");
            const errEl = field.querySelector(".field-error");
            if (errEl) errEl.textContent = msg;
          });
        }
        banner.textContent = err.message;
        banner.className = "form-banner is-visible error";
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Save changes";
      }
    });
  }

  async function initAccountPage() {
    const root = document.querySelector("#account-root");
    if (!root) return;

    const user = await Auth.requireAuthOrRedirect();
    if (!user) return;

    document.querySelector("#account-name").textContent = user.name;
    document.querySelector("#account-email").textContent = user.email;
    const joined = new Date(user.createdAt).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
    });
    const joinedEl = document.querySelector("#account-joined");
    if (joinedEl) joinedEl.textContent = `Member since ${joined}`;
    renderAvatar(user);
    initProfileForm(user);

    const ordersList = document.querySelector("#orders-list");
    try {
      const res = await Api.orders.list();
      if (res.data.length === 0) {
        ordersList.innerHTML = `
          <div class="state-block">
            <h3>No orders yet</h3>
            <p>Once you place an order, it'll show up here with its status.</p>
            <a href="shop.html" class="btn btn-primary">Start shopping</a>
          </div>`;
      } else {
        ordersList.innerHTML = res.data.map(orderRowHTML).join("");
      }
    } catch (err) {
      ordersList.innerHTML = `<div class="state-block"><h3>Couldn't load your orders</h3><p>${UI.escapeHtml(err.message)}</p></div>`;
      UI.toastError(err);
    }

    // Simple tab switching between "Account" and "Orders" panels.
    const tabs = document.querySelectorAll("[data-account-tab]");
    const panels = document.querySelectorAll("[data-account-panel]");
    tabs.forEach((tab) =>
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("is-active"));
        tab.classList.add("is-active");
        panels.forEach((p) => (p.hidden = p.dataset.accountPanel !== tab.dataset.accountTab));
      })
    );
  }

  async function initOrderSuccessPage() {
    const root = document.querySelector("#order-success-root");
    if (!root) return;

    const user = await Auth.requireAuthOrRedirect();
    if (!user) return;

    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("orderId");
    if (!orderId) {
      root.innerHTML = `<div class="state-block centered"><h3>No order to show</h3><a href="shop.html" class="btn btn-primary">Back to shop</a></div>`;
      return;
    }

    try {
      const res = await Api.orders.getById(orderId);
      const order = res.data;
      document.querySelector("#order-success-id").textContent = `Order #${order.id}`;
      document.querySelector("#order-success-total").textContent = UI.formatPrice(order.total);
      document.querySelector("#order-success-email").textContent = order.customerEmail;
    } catch (err) {
      root.innerHTML = `
        <div class="state-block centered">
          <h3>We couldn't find that order</h3>
          <p>${UI.escapeHtml(err.message)}</p>
          <a href="account.html" class="btn btn-primary">Go to your account</a>
        </div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initAccountPage();
    initOrderSuccessPage();
  });
})();
