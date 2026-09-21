/**
 * auth.js — session state plus the register/login form handlers.
 */
const Auth = (() => {
  let currentUser = null;
  let checked = false;

  async function loadCurrentUser() {
    if (!Api.getToken()) {
      currentUser = null;
      checked = true;
      return null;
    }
    try {
      const res = await Api.auth.me();
      currentUser = res.data.user;
    } catch {
      Api.setToken(null);
      currentUser = null;
    }
    checked = true;
    return currentUser;
  }

  function getUser() {
    return currentUser;
  }

  function isLoggedIn() {
    return !!currentUser;
  }

  async function logout() {
    try {
      await Api.auth.logout();
    } catch {
      /* ignore network errors on logout */
    }
    Api.setToken(null);
    currentUser = null;
    window.location.href = "index.html";
  }

  function updateAccountLink() {
    const link = document.querySelector("[data-account-link]");
    if (link) {
      if (isLoggedIn()) {
        link.setAttribute("href", "account.html");
        link.setAttribute("aria-label", `Account — ${currentUser.name}`);
      } else {
        link.setAttribute("href", "login.html");
        link.setAttribute("aria-label", "Log in");
      }
    }

    // The "Sell" nav link only ever appears for logged-in seller accounts.
    document.querySelectorAll("[data-seller-link]").forEach((el) => {
      el.hidden = !(isLoggedIn() && currentUser.role === "SELLER");
    });
  }

  /** Redirects to login if not authenticated, or to the shop if logged in
   *  but not a seller. Returns the user or null. */
  async function requireSellerOrRedirect() {
    if (!checked) await loadCurrentUser();
    if (!isLoggedIn()) {
      window.location.href = "login.html?next=sell-dashboard.html";
      return null;
    }
    if (currentUser.role !== "SELLER") {
      window.location.href = "shop.html";
      return null;
    }
    return currentUser;
  }

  /** Redirects to login if not authenticated. Returns the user or null. */
  async function requireAuthOrRedirect() {
    if (!checked) await loadCurrentUser();
    if (!isLoggedIn()) {
      const next = encodeURIComponent(window.location.pathname.split("/").pop());
      window.location.href = `login.html?next=${next}`;
      return null;
    }
    return currentUser;
  }

  function bindFieldErrors(form, details) {
    form.querySelectorAll(".field").forEach((f) => f.classList.remove("has-error"));
    form.querySelectorAll(".field-error").forEach((f) => (f.textContent = ""));
    if (!details) return;
    Object.entries(details).forEach(([key, msg]) => {
      const field = form.querySelector(`[data-field="${key}"]`);
      if (!field) return;
      field.classList.add("has-error");
      const errEl = field.querySelector(".field-error");
      if (errEl) errEl.textContent = msg;
    });
  }

  function showBanner(form, message, type) {
    const banner = form.querySelector(".form-banner");
    if (!banner) return;
    banner.textContent = message;
    banner.className = `form-banner is-visible ${type}`;
  }

  function initRegisterForm() {
    const form = document.querySelector("#register-form");
    if (!form) return;

    // Toggle the business-name field based on the selected account type.
    const roleRadios = form.querySelectorAll('input[name="role"]');
    const businessField = form.querySelector('[data-field="businessName"]');
    function syncBusinessField() {
      const selected = form.querySelector('input[name="role"]:checked');
      const isSeller = selected && selected.value === "SELLER";
      if (businessField) {
        businessField.hidden = !isSeller;
        businessField.querySelector("input")?.toggleAttribute("required", isSeller);
      }
    }
    roleRadios.forEach((r) => r.addEventListener("change", syncBusinessField));
    syncBusinessField();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const data = Object.fromEntries(new FormData(form).entries());

      submitBtn.disabled = true;
      submitBtn.textContent = "Creating your account…";

      try {
        const res = await Api.auth.register(data);
        Api.setToken(res.data.token);
        currentUser = res.data.user;
        UI.toast({ title: "Welcome to Nocturne Studio", message: "Your account is ready." });
        const params = new URLSearchParams(window.location.search);
        window.location.href = params.get("next") || "account.html";
      } catch (err) {
        if (err.status === 400 && err.details) {
          bindFieldErrors(form, err.details);
          showBanner(form, "Please fix the highlighted fields.", "error");
        } else {
          showBanner(form, err.message, "error");
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Create account";
      }
    });
  }

  function initLoginForm() {
    const form = document.querySelector("#login-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const data = Object.fromEntries(new FormData(form).entries());

      submitBtn.disabled = true;
      submitBtn.textContent = "Signing in…";

      try {
        const res = await Api.auth.login(data);
        Api.setToken(res.data.token);
        currentUser = res.data.user;
        UI.toast({ title: "Welcome back", message: `Signed in as ${currentUser.name}.` });
        const params = new URLSearchParams(window.location.search);
        window.location.href = params.get("next") || "account.html";
      } catch (err) {
        if (err.status === 400 && err.details) {
          bindFieldErrors(form, err.details);
        }
        showBanner(form, err.message || "Incorrect email or password.", "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign in";
      }
    });
  }

  function initLogoutButtons() {
    document.querySelectorAll("[data-logout]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        logout();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await loadCurrentUser();
    updateAccountLink();
    initRegisterForm();
    initLoginForm();
    initLogoutButtons();
    document.dispatchEvent(new CustomEvent("auth:ready", { detail: { user: currentUser } }));
  });

  return { getUser, isLoggedIn, loadCurrentUser, logout, requireAuthOrRedirect, requireSellerOrRedirect };
})();
