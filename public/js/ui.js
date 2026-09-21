/**
 * ui.js — cross-page UI plumbing: header behavior, mobile menu, toasts,
 * and small formatting helpers reused everywhere else.
 */
const UI = (() => {
  function formatPrice(n) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
      Number(n) || 0
    );
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
  }

  function debounce(fn, wait = 300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function starRating(rating) {
    const r = Math.round(Number(rating) || 0);
    let svgs = "";
    for (let i = 0; i < 5; i++) {
      svgs += i < r
        ? '<svg viewBox="0 0 20 20"><path d="M10 1l2.6 5.8 6.2.6-4.7 4.2 1.4 6.2L10 14.9 4.5 17.8l1.4-6.2L1.2 7.4l6.2-.6z"/></svg>'
        : '<svg viewBox="0 0 20 20" style="fill:none;stroke:var(--muted);stroke-width:1"><path d="M10 1l2.6 5.8 6.2.6-4.7 4.2 1.4 6.2L10 14.9 4.5 17.8l1.4-6.2L1.2 7.4l6.2-.6z"/></svg>';
    }
    return svgs;
  }

  function initHeader() {
    const header = document.querySelector(".site-header");
    if (!header) return;

    const onScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const hamburger = document.querySelector(".hamburger");
    const mobileMenu = document.querySelector(".mobile-menu");
    const mobileClose = document.querySelector(".mobile-menu-close");

    if (hamburger && mobileMenu) {
      const open = () => {
        mobileMenu.classList.add("is-open");
        document.body.style.overflow = "hidden";
      };
      const close = () => {
        mobileMenu.classList.remove("is-open");
        document.body.style.overflow = "";
      };
      hamburger.addEventListener("click", open);
      mobileClose?.addEventListener("click", close);
      mobileMenu.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
    }
  }

  function initHeroEntrance() {
    const hero = document.querySelector(".hero");
    if (!hero) return;
    // One orchestrated entrance on load, not a scroll-triggered fade per card.
    requestAnimationFrame(() => hero.classList.add("hero-ready"));
  }

  // ---------- Toasts ----------
  function ensureToastStack() {
    let stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    return stack;
  }

  function toast({ title, message, type = "default", duration = 3400 }) {
    const stack = ensureToastStack();
    const el = document.createElement("div");
    el.className = `toast${type === "error" ? " toast-error" : ""}`;
    el.innerHTML = `
      <div class="toast-msg">
        ${title ? `<strong>${escapeHtml(title)}</strong>` : ""}
        ${message ? escapeHtml(message) : ""}
      </div>
    `;
    stack.appendChild(el);

    const remove = () => {
      el.classList.add("is-leaving");
      setTimeout(() => el.remove(), 220);
    };
    setTimeout(remove, duration);
    el.addEventListener("click", remove);
  }

  function toastError(err) {
    toast({
      title: "Something went wrong",
      message: err?.message || "Please try again.",
      type: "error",
      duration: 4500,
    });
  }

  // ---------- Reveal-on-scroll (used sparingly, for the editorial section only) ----------
  function initScrollReveal() {
    const targets = document.querySelectorAll("[data-reveal]");
    if (!targets.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    targets.forEach((t) => io.observe(t));
  }

  function skeletonCards(container, count = 8) {
    container.innerHTML = Array.from({ length: count })
      .map(() => `<div class="skeleton skeleton-card"></div>`)
      .join("");
  }

  // ---------- Search overlay ----------
  function initSearchOverlay() {
    const overlay = document.querySelector("#search-overlay");
    if (!overlay) return;

    const input = overlay.querySelector("input");
    const results = overlay.querySelector(".search-results");
    const openers = document.querySelectorAll("[data-open-search]");
    const closer = overlay.querySelector(".search-overlay-close");

    function open() {
      overlay.classList.add("is-open");
      document.body.style.overflow = "hidden";
      setTimeout(() => input.focus(), 60);
    }
    function close() {
      overlay.classList.remove("is-open");
      document.body.style.overflow = "";
    }

    openers.forEach((el) => el.addEventListener("click", (e) => {
      e.preventDefault();
      open();
    }));
    closer?.addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement.tagName !== "INPUT" && !overlay.classList.contains("is-open")) {
        e.preventDefault();
        open();
      }
      if (e.key === "Escape") close();
    });

    async function runSearch(term) {
      if (!term) {
        results.innerHTML = `<p class="text-muted">Start typing to search the collection — products, categories, or descriptions.</p>`;
        return;
      }
      results.innerHTML = `<p class="text-muted">Searching…</p>`;
      try {
        const res = await window.Api.products.list({ search: term, limit: 10 });
        if (res.data.length === 0) {
          results.innerHTML = `<p class="text-muted">No products match "${escapeHtml(term)}".</p>`;
          return;
        }
        results.innerHTML = res.data
          .map(
            (p) => `
            <a class="search-result-row" href="product.html?slug=${encodeURIComponent(p.slug)}">
              <img src="${p.image}" alt="" loading="lazy">
              <span>
                <span class="search-result-name">${escapeHtml(p.name)}</span><br>
                <span class="search-result-cat">${escapeHtml(p.category)} · ${formatPrice(p.price)}</span>
              </span>
            </a>`
          )
          .join("");
      } catch (err) {
        results.innerHTML = `<p class="text-muted">Couldn't search right now — ${escapeHtml(err.message)}</p>`;
      }
    }

    input?.addEventListener("input", debounce((e) => runSearch(e.target.value.trim()), 300));
    runSearch("");
  }

  document.addEventListener("DOMContentLoaded", () => {
    initHeader();
    initHeroEntrance();
    initScrollReveal();
    initSearchOverlay();
  });

  return { formatPrice, escapeHtml, debounce, starRating, toast, toastError, skeletonCards };
})();
