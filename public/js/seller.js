/**
 * seller.js — the seller dashboard: add/edit/deactivate/delete your own
 * products, and see orders that contain them. Every request here hits
 * /api/seller/*, which the backend guards with requireAuth + requireSeller
 * — this file only controls what the UI *shows*, not who's allowed to do
 * what; the real enforcement lives on the server.
 */
(() => {
  let myProducts = [];
  let editingId = null;

  function productRowHTML(p) {
    return `
      <div class="order-row" data-product-row="${p.id}">
        <div class="order-row-head">
          <div style="display:flex; align-items:center; gap:14px;">
            <img src="${p.image}" alt="" style="width:52px;height:64px;object-fit:cover;border-radius:4px;background:var(--ink);">
            <div>
              <strong>${UI.escapeHtml(p.name)}</strong>
              <div class="text-muted" style="font-size:.82rem;">${UI.escapeHtml(p.category)} · ${UI.formatPrice(p.price)} · ${p.stock} in stock</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            ${p.isActive ? '<span class="badge badge-brass">Active</span>' : '<span class="badge badge-out">Inactive</span>'}
          </div>
        </div>
        <div class="order-row-items" style="display:flex; gap:10px;">
          <button type="button" class="btn btn-ghost btn-sm" data-action="edit" data-id="${p.id}">Edit</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="toggle-active" data-id="${p.id}">${p.isActive ? "Deactivate" : "Reactivate"}</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="delete" data-id="${p.id}" style="color:var(--danger);">Delete</button>
        </div>
      </div>`;
  }

  async function loadProducts() {
    const list = document.querySelector("#seller-products-list");
    const countEl = document.querySelector("#seller-product-count");
    try {
      const res = await Api.seller.listProducts();
      myProducts = res.data;
      countEl.textContent = `${myProducts.length} product${myProducts.length === 1 ? "" : "s"}`;

      if (myProducts.length === 0) {
        list.innerHTML = `
          <div class="state-block">
            <h3>No products yet</h3>
            <p>Add your first product to start selling on Nocturne Studio.</p>
          </div>`;
        return;
      }
      list.innerHTML = myProducts.map(productRowHTML).join("");
    } catch (err) {
      list.innerHTML = `<div class="state-block"><h3>Couldn't load your products</h3><p>${UI.escapeHtml(err.message)}</p></div>`;
      UI.toastError(err);
    }
  }

  function orderRowHTML(order) {
    const itemsList = order.items
      .map((i) => `${i.quantity} × ${UI.escapeHtml(i.productName)} — ${UI.formatPrice(i.lineTotal)}`)
      .join("<br>");
    const date = new Date(order.createdAt).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    return `
      <div class="order-row">
        <div class="order-row-head">
          <div>
            <strong>Order #${order.orderId}</strong>
            <span class="text-muted" style="margin-left:10px;font-size:.85rem;">${date}</span>
          </div>
          <div style="display:flex;align-items:center;gap:14px;">
            <span class="order-status ${order.status}">${order.status.toLowerCase()}</span>
            <strong>${UI.formatPrice(order.subtotalForSeller)}</strong>
          </div>
        </div>
        <div class="order-row-items">
          ${itemsList}<br>
          <span style="margin-top:8px;display:inline-block;">
            Ship to: ${UI.escapeHtml(order.customerName)}, ${UI.escapeHtml(order.shippingAddress)}, ${UI.escapeHtml(order.city)} ${UI.escapeHtml(order.postalCode)}
          </span>
        </div>
      </div>`;
  }

  async function loadOrders() {
    const list = document.querySelector("#seller-orders-list");
    try {
      const res = await Api.seller.listOrders();
      if (res.data.length === 0) {
        list.innerHTML = `
          <div class="state-block">
            <h3>No orders yet</h3>
            <p>Once a customer buys one of your products, it'll show up here — only your items, even if their cart included other sellers' products too.</p>
          </div>`;
        return;
      }
      list.innerHTML = res.data.map(orderRowHTML).join("");
    } catch (err) {
      list.innerHTML = `<div class="state-block"><h3>Couldn't load your orders</h3><p>${UI.escapeHtml(err.message)}</p></div>`;
      UI.toastError(err);
    }
  }

  // ---------- Add/edit product form (lives in a modal) ----------
  function resetForm() {
    const form = document.querySelector("#product-form");
    form.reset();
    editingId = null;
    document.querySelector("#product-form-id").value = "";
    document.querySelector("#product-form-title").textContent = "Add a product";
    document.querySelector("#product-form-submit").textContent = "Add product";
    form.querySelectorAll(".field").forEach((f) => f.classList.remove("has-error"));
    form.querySelectorAll(".field-error").forEach((f) => (f.textContent = ""));
    const banner = form.querySelector(".form-banner");
    if (banner) banner.className = "form-banner";
    document.querySelector("#pf-upload-status").textContent = "";
    const preview = document.querySelector("#pf-image-preview");
    preview.style.display = "none";
    preview.src = "";
  }

  function openModal() {
    document.querySelector("#product-modal").classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeForm() {
    document.querySelector("#product-modal").classList.remove("is-open");
    document.body.style.overflow = "";
    resetForm();
  }

  function openFormForCreate() {
    resetForm();
    openModal();
    document.querySelector("#pf-name").focus();
  }

  function openFormForEdit(product) {
    resetForm();
    editingId = product.id;
    document.querySelector("#product-form-id").value = product.id;
    document.querySelector("#product-form-title").textContent = `Edit "${product.name}"`;
    document.querySelector("#product-form-submit").textContent = "Save changes";
    document.querySelector("#pf-name").value = product.name;
    document.querySelector("#pf-description").value = product.description;
    document.querySelector("#pf-price").value = product.price;
    document.querySelector("#pf-stock").value = product.stock;
    document.querySelector("#pf-category").value = product.category;
    document.querySelector("#pf-image").value = product.image;
    const preview = document.querySelector("#pf-image-preview");
    preview.src = product.image;
    preview.style.display = "block";
    openModal();
    document.querySelector("#pf-name").focus();
  }

  // ---------- Upload-from-device ----------
  async function handleFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;

    const status = document.querySelector("#pf-upload-status");
    const preview = document.querySelector("#pf-image-preview");
    const imageField = document.querySelector("#pf-image");
    const imageFieldWrap = imageField.closest("[data-field]");

    // Instant local preview while the upload is in flight — no need to
    // wait on the server round-trip just to see the picture picked.
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";
    status.textContent = "Uploading…";
    imageFieldWrap.classList.remove("has-error");
    imageFieldWrap.querySelector(".field-error").textContent = "";

    try {
      const res = await Api.seller.uploadImage(file);
      imageField.value = res.data.url;
      status.textContent = "Uploaded ✓";
    } catch (err) {
      status.textContent = "";
      preview.style.display = "none";
      UI.toastError(err);
      e.target.value = ""; // let them try again with the same file if needed
    }
  }

  function showFieldErrors(form, details) {
    Object.entries(details || {}).forEach(([key, msg]) => {
      const field = form.querySelector(`[data-field="${key}"]`);
      if (!field) return;
      field.classList.add("has-error");
      const err = field.querySelector(".field-error");
      if (err) err.textContent = msg;
    });
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = document.querySelector("#product-form-submit");
    const banner = form.querySelector(".form-banner");

    const data = {
      name: document.querySelector("#pf-name").value,
      description: document.querySelector("#pf-description").value,
      price: document.querySelector("#pf-price").value,
      stock: document.querySelector("#pf-stock").value,
      category: document.querySelector("#pf-category").value,
      image: document.querySelector("#pf-image").value,
    };

    if (!data.image) {
      const imageField = document.querySelector("#pf-image").closest("[data-field]");
      imageField.classList.add("has-error");
      imageField.querySelector(".field-error").textContent = "Please upload a product image.";
      imageField.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = editingId ? "Saving…" : "Adding…";

    try {
      if (editingId) {
        await Api.seller.updateProduct(editingId, data);
        UI.toast({ title: "Product updated.", message: data.name });
      } else {
        await Api.seller.createProduct(data);
        UI.toast({ title: "Product added.", message: `${data.name} is now live in the shop.` });
      }
      closeForm();
      await loadProducts();
    } catch (err) {
      if (err.status === 400 && err.details) {
        showFieldErrors(form, err.details);
      }
      if (banner) {
        banner.textContent = err.message;
        banner.className = "form-banner is-visible error";
      }
      UI.toastError(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  }

  // ---------- Product row actions (delegated) ----------
  async function handleProductListClick(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const product = myProducts.find((p) => p.id === id);
    if (!product) return;

    if (btn.dataset.action === "edit") {
      openFormForEdit(product);
      document.querySelector("#product-form").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (btn.dataset.action === "toggle-active") {
      try {
        await Api.seller.updateProduct(id, { isActive: !product.isActive });
        UI.toast({
          title: product.isActive ? "Product deactivated." : "Product reactivated.",
          message: product.isActive ? "It's hidden from the shop until you turn it back on." : "It's visible in the shop again.",
        });
        await loadProducts();
      } catch (err) {
        UI.toastError(err);
      }
      return;
    }

    if (btn.dataset.action === "delete") {
      if (!confirm(`Delete "${product.name}"? This can't be undone.`)) return;
      try {
        await Api.seller.deleteProduct(id);
        UI.toast({ title: "Product deleted.", message: product.name });
        await loadProducts();
      } catch (err) {
        if (err.status === 409) {
          // Real order history exists — the backend refused the hard
          // delete on purpose. Offer the deactivate path instead.
          UI.toast({
            title: "Can't delete this one",
            message: `${err.message} Use "Deactivate" instead.`,
            type: "error",
            duration: 6000,
          });
        } else {
          UI.toastError(err);
        }
      }
    }
  }

  // ---------- Tabs ----------
  function initTabs() {
    const tabs = document.querySelectorAll("[data-seller-tab]");
    const panels = document.querySelectorAll("[data-seller-panel]");
    tabs.forEach((tab) =>
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("is-active"));
        tab.classList.add("is-active");
        panels.forEach((p) => (p.hidden = p.dataset.sellerPanel !== tab.dataset.sellerTab));
      })
    );
  }

  async function init() {
    const root = document.querySelector("#seller-root");
    if (!root) return;

    const user = await Auth.requireSellerOrRedirect();
    if (!user) return;

    document.querySelector("#seller-business-name").textContent =
      user.businessName ? `Selling as ${user.businessName}` : "";

    initTabs();

    document.querySelector("#show-add-product").addEventListener("click", openFormForCreate);
    document.querySelector("#product-form-cancel").addEventListener("click", closeForm);
    document.querySelector("#product-form").addEventListener("submit", handleFormSubmit);
    document.querySelector("#pf-image-file").addEventListener("change", handleFileSelected);
    document.querySelector("#seller-products-list").addEventListener("click", handleProductListClick);

    // Close the modal on backdrop click or Escape, same pattern as the
    // cart drawer and search overlay elsewhere in the app.
    const modal = document.querySelector("#product-modal");
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeForm();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) closeForm();
    });

    await Promise.all([loadProducts(), loadOrders()]);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
