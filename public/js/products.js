/**
 * products.js — everything that turns product API data into markup:
 * the shared product-card partial, homepage rails, the shop grid with
 * search/filter/sort/pagination, and the product detail page.
 */
const Products = (() => {
  function cardHTML(p, { feature = false } = {}) {
    const badges = [];
    if (p.isNew) badges.push('<span class="badge badge-brass">New</span>');
    if (p.featured && !feature) badges.push('<span class="badge">Featured</span>');
    if (!p.inStock) badges.push('<span class="badge badge-out">Out of stock</span>');

    return `
      <article class="product-card${feature ? " is-feature" : ""}" data-product-id="${p.id}">
        <a href="product.html?slug=${encodeURIComponent(p.slug)}" class="product-card-media" aria-label="${UI.escapeHtml(p.name)}">
          <div class="product-card-badges">${badges.join("")}</div>
          <img src="${p.image}" alt="${UI.escapeHtml(p.name)}" loading="lazy">
        </a>
        <button type="button" class="btn btn-sm btn-primary product-card-quickadd" data-quick-add="${p.id}" ${!p.inStock ? "disabled" : ""}>
          ${p.inStock ? "Add to cart" : "Sold out"}
        </button>
        <a href="product.html?slug=${encodeURIComponent(p.slug)}" class="product-card-body">
          <span>
            <div class="product-card-title">${UI.escapeHtml(p.name)}</div>
            <div class="product-card-cat">${UI.escapeHtml(p.category)}${p.seller?.name ? ` · ${UI.escapeHtml(p.seller.name)}` : ""}</div>
          </span>
          <span class="product-card-price">${UI.formatPrice(p.price)}</span>
        </a>
      </article>`;
  }

  function bindQuickAdd(container) {
    container.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-quick-add]");
      if (!btn) return;
      e.preventDefault();
      const id = Number(btn.dataset.quickAdd);
      const card = btn.closest("[data-product-id]");
      // Card render doesn't carry full product payload, so pull it back
      // out of the last fetched list cached on the container.
      const product = container.__productsById?.get(id);
      if (!product) return;
      Cart.add(product, 1);
      UI.toast({ title: "Added to your collection.", message: product.name });
    });
  }

  function cacheProducts(container, products) {
    container.__productsById = new Map(products.map((p) => [p.id, p]));
  }

  // ---------- Homepage rails ----------
  async function initHomepage() {
    const featuredEl = document.querySelector("#featured-grid");
    const trendingEl = document.querySelector("#trending-grid");
    const arrivalsEl = document.querySelector("#arrivals-grid");
    const heroImgEl = document.querySelector("#hero-product-image");
    const heroNameEl = document.querySelector("#hero-product-name");
    const heroPriceEl = document.querySelector("#hero-product-price");

    if (!featuredEl && !trendingEl && !arrivalsEl) return;

    try {
      const [featuredRes, trendingRes, arrivalsRes] = await Promise.all([
        Api.products.list({ featured: "true", limit: 4 }),
        Api.products.list({ sort: "rating", limit: 4 }),
        Api.products.list({ isNew: "true", limit: 4 }),
      ]);

      if (featuredEl) {
        cacheProducts(featuredEl, featuredRes.data);
        featuredEl.innerHTML = featuredRes.data
          .map((p, i) => cardHTML(p, { feature: i === 0 }))
          .join("");
        bindQuickAdd(featuredEl);

        if (heroImgEl && featuredRes.data[0]) {
          const hero = featuredRes.data[0];
          heroImgEl.src = hero.image;
          heroImgEl.alt = hero.name;
          if (heroNameEl) heroNameEl.textContent = hero.name;
          if (heroPriceEl) heroPriceEl.textContent = UI.formatPrice(hero.price);
          heroImgEl.closest("a")?.setAttribute("href", `product.html?slug=${hero.slug}`);
        }
      }

      if (trendingEl) {
        cacheProducts(trendingEl, trendingRes.data);
        trendingEl.innerHTML = trendingRes.data.map((p) => cardHTML(p)).join("");
        bindQuickAdd(trendingEl);
      }

      if (arrivalsEl) {
        cacheProducts(arrivalsEl, arrivalsRes.data);
        arrivalsEl.innerHTML = arrivalsRes.data.map((p) => cardHTML(p)).join("");
        bindQuickAdd(arrivalsEl);
      }
    } catch (err) {
      UI.toastError(err);
      [featuredEl, trendingEl, arrivalsEl].forEach((el) => {
        if (el) {
          el.innerHTML = `<div class="state-block"><h3>Couldn't load products</h3><p>${UI.escapeHtml(err.message)}</p></div>`;
        }
      });
    }
  }

  // ---------- Shop page ----------
  function initShopPage() {
    const grid = document.querySelector("#shop-grid");
    if (!grid) return;

    const toolbarCount = document.querySelector("#shop-result-count");
    const categoryList = document.querySelector("#category-filters");
    const priceMin = document.querySelector("#price-min");
    const priceMax = document.querySelector("#price-max");
    const sortSelect = document.querySelector("#sort-select");
    const pagination = document.querySelector("#pagination");
    const searchInputs = document.querySelectorAll("[data-shop-search]");

    const state = {
      page: 1,
      limit: 12,
      sort: "newest",
      category: "all",
      search: "",
      minPrice: "",
      maxPrice: "",
      isNew: false,
    };

    // Seed state from the URL so links (e.g. a category tile) work.
    const params = new URLSearchParams(window.location.search);
    if (params.get("category")) state.category = params.get("category");
    if (params.get("search")) state.search = params.get("search");
    if (params.get("q")) state.search = params.get("q");
    if (params.get("isNew") === "true") state.isNew = true;

    function syncUrl() {
      const p = new URLSearchParams();
      if (state.category !== "all") p.set("category", state.category);
      if (state.search) p.set("search", state.search);
      if (state.page > 1) p.set("page", state.page);
      const qs = p.toString();
      history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
    }

    async function load() {
      grid.setAttribute("aria-busy", "true");
      UI.skeletonCards(grid, state.limit);

      try {
        const res = await Api.products.list({
          page: state.page,
          limit: state.limit,
          sort: state.sort,
          category: state.category,
          search: state.search || undefined,
          minPrice: state.minPrice || undefined,
          maxPrice: state.maxPrice || undefined,
          isNew: state.isNew ? "true" : undefined,
        });

        renderCategoryFilters(res.meta.categories);

        if (res.data.length === 0) {
          grid.innerHTML = `
            <div class="state-block">
              <h3>No products match those filters</h3>
              <p>Try a broader search term or clear a filter to see more of the collection.</p>
              <button type="button" class="btn btn-ghost" id="clear-filters">Clear filters</button>
            </div>`;
          document.querySelector("#clear-filters")?.addEventListener("click", () => {
            state.category = "all";
            state.search = "";
            state.minPrice = "";
            state.maxPrice = "";
            state.page = 1;
            searchInputs.forEach((i) => (i.value = ""));
            if (priceMin) priceMin.value = "";
            if (priceMax) priceMax.value = "";
            categoryList?.querySelectorAll(".filter-option").forEach((el) => {
              el.classList.toggle("is-active", el.dataset.catOption === "all");
              const input = el.querySelector("input");
              if (input) input.checked = el.dataset.catOption === "all";
            });
            load();
          });
        } else {
          cacheProducts(grid, res.data);
          grid.innerHTML = res.data.map((p) => cardHTML(p)).join("");
        }

        if (toolbarCount) {
          toolbarCount.textContent = `${res.meta.total} product${res.meta.total === 1 ? "" : "s"}`;
        }

        renderPagination(res.meta);
        syncUrl();
      } catch (err) {
        grid.innerHTML = `<div class="state-block"><h3>Couldn't load the shop</h3><p>${UI.escapeHtml(err.message)}</p></div>`;
        UI.toastError(err);
      } finally {
        grid.setAttribute("aria-busy", "false");
      }
    }

    function renderCategoryFilters(categories) {
      if (!categoryList || categoryList.dataset.rendered) return;
      categoryList.dataset.rendered = "true";
      const options = ["all", ...categories];
      categoryList.innerHTML = options
        .map(
          (c) => `
          <label class="filter-option${state.category === c ? " is-active" : ""}" data-cat-option="${c}">
            <input type="radio" name="category" value="${c}" ${state.category === c ? "checked" : ""}>
            ${c === "all" ? "All categories" : UI.escapeHtml(c)}
          </label>`
        )
        .join("");

      categoryList.addEventListener("change", (e) => {
        if (e.target.name !== "category") return;
        state.category = e.target.value;
        state.page = 1;
        categoryList.querySelectorAll(".filter-option").forEach((el) => {
          el.classList.toggle("is-active", el.dataset.catOption === state.category);
        });
        load();
      });
    }

    function renderPagination(meta) {
      if (!pagination) return;
      if (meta.totalPages <= 1) {
        pagination.innerHTML = "";
        return;
      }
      let html = "";
      for (let i = 1; i <= meta.totalPages; i++) {
        html += `<button type="button" class="${i === meta.page ? "is-active" : ""}" data-page="${i}">${i}</button>`;
      }
      pagination.innerHTML = html;
      pagination.querySelectorAll("[data-page]").forEach((btn) =>
        btn.addEventListener("click", () => {
          state.page = Number(btn.dataset.page);
          load();
          grid.scrollIntoView({ behavior: "smooth", block: "start" });
        })
      );
    }

    sortSelect?.addEventListener("change", () => {
      state.sort = sortSelect.value;
      state.page = 1;
      load();
    });

    [priceMin, priceMax].forEach((input) =>
      input?.addEventListener(
        "change",
        UI.debounce(() => {
          state.minPrice = priceMin.value;
          state.maxPrice = priceMax.value;
          state.page = 1;
          load();
        }, 250)
      )
    );

    searchInputs.forEach((input) => {
      if (state.search) input.value = state.search;
      input.addEventListener(
        "input",
        UI.debounce(() => {
          state.search = input.value.trim();
          state.page = 1;
          load();
        }, 350)
      );
    });

    // Bound once — the delegated handler reads container.__productsById
    // fresh at click time, so a single binding stays correct across the
    // many re-renders load() performs as filters change.
    bindQuickAdd(grid);

    load();
  }

  // ---------- Product detail page ----------
  async function initProductPage() {
    const root = document.querySelector("#pdp-root");
    if (!root) return;

    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");

    if (!slug) {
      document.querySelector("#pdp-loading")?.remove();
      root.hidden = false;
      root.innerHTML = `<div class="state-block centered"><h3>No product specified</h3><p>Head back to the shop to pick something out.</p><a href="shop.html" class="btn btn-primary">Back to shop</a></div>`;
      return;
    }

    try {
      const res = await Api.products.getBySlug(slug);
      renderProduct(res.data);
    } catch (err) {
      document.querySelector("#pdp-loading")?.remove();
      root.hidden = false;
      root.innerHTML = `
        <div class="state-block centered">
          <h3>Product not found</h3>
          <p>${UI.escapeHtml(err.message)}</p>
          <a href="shop.html" class="btn btn-primary">Back to shop</a>
        </div>`;
    }
  }

  function renderProduct(p) {
    document.title = `${p.name} — Nocturne Studio`;

    const gallery = [p.image, ...(p.gallery || [])].filter(Boolean);
    let activeIndex = 0;
    let quantity = 1;

    const mainImg = document.querySelector("#pdp-main-image");
    const mainWrap = document.querySelector("#pdp-gallery-main");
    const thumbsWrap = document.querySelector("#pdp-thumbs");
    const nameEl = document.querySelector("#pdp-name");
    const catEl = document.querySelector("#pdp-category");
    const priceEl = document.querySelector("#pdp-price");
    const ratingEl = document.querySelector("#pdp-rating");
    const descEl = document.querySelector("#pdp-description");
    const stockEl = document.querySelector("#pdp-stock");
    const qtyValueEl = document.querySelector("#pdp-qty-value");
    const addBtn = document.querySelector("#pdp-add-to-cart");
    const buyBtn = document.querySelector("#pdp-buy-now");
    const specsEl = document.querySelector("#pdp-specs");
    const relatedEl = document.querySelector("#related-grid");
    const relatedSection = document.querySelector("#related-section");

    nameEl.textContent = p.name;
    catEl.textContent = p.category;
    catEl.setAttribute("href", `shop.html?category=${encodeURIComponent(p.category)}`);
    const sellerEl = document.querySelector("#pdp-seller");
    if (sellerEl) {
      sellerEl.innerHTML = p.seller?.name
        ? `${p.seller.avatar ? `<img src="${p.seller.avatar}" alt="" style="width:18px;height:18px;border-radius:50%;object-fit:cover;vertical-align:-4px;margin-right:6px;">` : ""}Sold by ${UI.escapeHtml(p.seller.name)}`
        : "";
    }
    priceEl.textContent = UI.formatPrice(p.price);
    ratingEl.innerHTML = `${UI.starRating(p.rating)} <span>${Number(p.rating).toFixed(1)}</span>`;
    descEl.textContent = p.description;

    function renderStock() {
      if (p.stock <= 0) {
        stockEl.textContent = "Out of stock";
        stockEl.className = "pdp-stock out";
        addBtn.disabled = true;
        buyBtn.disabled = true;
      } else if (p.stock <= 5) {
        stockEl.textContent = `Only ${p.stock} left`;
        stockEl.className = "pdp-stock low";
      } else {
        stockEl.textContent = "In stock, ready to ship";
        stockEl.className = "pdp-stock in";
      }
    }
    renderStock();

    function renderGallery() {
      mainImg.src = gallery[activeIndex];
      mainImg.alt = p.name;
      thumbsWrap.innerHTML = gallery
        .map(
          (src, i) =>
            `<button type="button" class="pdp-thumb${i === activeIndex ? " is-active" : ""}" data-idx="${i}" aria-label="Photo ${i + 1}"><img src="${src}" alt=""></button>`
        )
        .join("");
    }
    renderGallery();

    thumbsWrap.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-idx]");
      if (!btn) return;
      activeIndex = Number(btn.dataset.idx);
      renderGallery();
    });

    mainWrap.addEventListener("mouseenter", () => mainWrap.classList.add("is-zoomed"));
    mainWrap.addEventListener("mouseleave", () => mainWrap.classList.remove("is-zoomed"));

    document.querySelector("#pdp-qty-dec")?.addEventListener("click", () => {
      quantity = Math.max(1, quantity - 1);
      qtyValueEl.textContent = quantity;
    });
    document.querySelector("#pdp-qty-inc")?.addEventListener("click", () => {
      quantity = Math.min(p.stock, quantity + 1);
      qtyValueEl.textContent = quantity;
    });

    addBtn.addEventListener("click", () => {
      Cart.add(p, quantity);
      UI.toast({ title: "Added to your collection.", message: `${p.name} × ${quantity}` });
    });

    buyBtn.addEventListener("click", () => {
      Cart.add(p, quantity);
      window.location.href = "checkout.html";
    });

    const specs = p.specs || {};
    if (Object.keys(specs).length > 0) {
      specsEl.innerHTML = `<dl>${Object.entries(specs)
        .map(([k, v]) => `<dt>${UI.escapeHtml(k)}</dt><dd>${UI.escapeHtml(v)}</dd>`)
        .join("")}</dl>`;
    } else {
      specsEl.style.display = "none";
    }

    if (p.related && p.related.length > 0) {
      cacheProducts(relatedEl, p.related);
      relatedEl.innerHTML = p.related.map((rp) => cardHTML(rp)).join("");
      bindQuickAdd(relatedEl);
    } else {
      relatedSection.style.display = "none";
    }

    document.querySelector("#pdp-root").hidden = false;
    document.querySelector("#pdp-loading")?.remove();

    initReviews(p.id);
  }

  // ---------- Reviews ----------
  function avatarOrInitial(author) {
    if (author.avatar) {
      return `<img class="review-row-avatar" src="${author.avatar}" alt="">`;
    }
    const initial = (author.name || "?").trim().charAt(0).toUpperCase();
    return `<span class="review-row-avatar-fallback">${UI.escapeHtml(initial)}</span>`;
  }

  function reviewRowHTML(r) {
    const date = new Date(r.createdAt).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    return `
      <div class="review-row">
        ${avatarOrInitial(r.author)}
        <div>
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <strong>${UI.escapeHtml(r.author.name)}</strong>
            ${r.verifiedPurchase ? '<span class="badge badge-brass" style="font-size:.62rem;">Verified buyer</span>' : ""}
            <span class="text-muted" style="font-size:.78rem;">${date}</span>
          </div>
          <div class="rating" style="margin-top:6px;">${UI.starRating(r.rating)}</div>
          ${r.comment ? `<p style="margin-top:8px; color:var(--paper-dim);">${UI.escapeHtml(r.comment)}</p>` : ""}
        </div>
      </div>`;
  }

  function initStarPicker(container, initial = 0) {
    let selected = initial;
    function render() {
      container.innerHTML = Array.from({ length: 5 })
        .map(
          (_, i) => `
          <button type="button" class="star-picker-btn${i < selected ? " is-filled" : ""}" data-star="${i + 1}" aria-label="${i + 1} star${i === 0 ? "" : "s"}">
            <svg viewBox="0 0 20 20"><path d="M10 1l2.6 5.8 6.2.6-4.7 4.2 1.4 6.2L10 14.9 4.5 17.8l1.4-6.2L1.2 7.4l6.2-.6z"/></svg>
          </button>`
        )
        .join("");
    }
    container.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-star]");
      if (!btn) return;
      selected = Number(btn.dataset.star);
      render();
    });
    render();
    return { get: () => selected };
  }

  async function initReviews(productId) {
    const list = document.querySelector("#reviews-list");
    const summary = document.querySelector("#reviews-summary");
    const form = document.querySelector("#review-form");
    const loginPrompt = document.querySelector("#review-login-prompt");
    if (!list) return;

    async function renderList() {
      try {
        const res = await Api.products.listReviews(productId);
        if (res.data.length === 0) {
          summary.textContent = "No reviews yet — be the first.";
          list.innerHTML = "";
          return;
        }
        const avg = res.data.reduce((sum, r) => sum + r.rating, 0) / res.data.length;
        summary.textContent = `${avg.toFixed(1)} average · ${res.data.length} review${res.data.length === 1 ? "" : "s"}`;
        list.innerHTML = res.data.map(reviewRowHTML).join("");
      } catch (err) {
        list.innerHTML = `<p class="text-muted">Couldn't load reviews — ${UI.escapeHtml(err.message)}</p>`;
      }
    }

    await renderList();

    if (!Auth.isLoggedIn()) {
      loginPrompt.style.display = "block";
      return;
    }

    form.style.display = "block";
    const starPicker = initStarPicker(document.querySelector("#review-star-picker"));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const banner = form.querySelector(".form-banner");
      form.querySelectorAll(".field").forEach((f) => f.classList.remove("has-error"));
      form.querySelectorAll(".field-error").forEach((f) => (f.textContent = ""));

      const rating = starPicker.get();
      if (!rating) {
        const ratingField = document.querySelector('[data-field="rating"]');
        ratingField.classList.add("has-error");
        ratingField.querySelector(".field-error").textContent = "Pick a star rating.";
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting…";
      try {
        await Api.products.submitReview(productId, {
          rating,
          comment: document.querySelector("#review-comment").value,
        });
        UI.toast({ title: "Thanks for the review!" });
        document.querySelector("#review-comment").value = "";
        await renderList();
      } catch (err) {
        banner.textContent = err.message;
        banner.className = "form-banner is-visible error";
        UI.toastError(err);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit review";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initHomepage();
    initShopPage();
    initProductPage();
  });

  return { cardHTML, bindQuickAdd, cacheProducts };
})();
