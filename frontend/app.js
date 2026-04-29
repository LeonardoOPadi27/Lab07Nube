/**
 * app.js — LabSystem Frontend
 * ─────────────────────────────────────────────
 * Organizado por módulos:
 *   1. Config & Utils
 *   2. Toast (mensajes visuales)
 *   3. Auth  (login, register, logout)
 *   4. Products CRUD
 *   5. Dashboard UI helpers
 *   6. Init
 */

/* ═══════════════════════════════════════════
   1. CONFIG & UTILS
═══════════════════════════════════════════ */

const APP_ORIGIN = window.location.origin;
const API = `${APP_ORIGIN}/api`;

function goTo(page) {
  window.location.href = `${APP_ORIGIN}/${page}`;
}

/** Obtiene el token JWT de localStorage */
function getToken() {
  return localStorage.getItem("token");
}

/** Verifica si hay sesión activa */
function isLoggedIn() {
  return !!getToken();
}

/**
 * Wrapper de fetch con headers de autorización y manejo de errores.
 * @param {string} endpoint  - ruta relativa, ej: "/auth/login"
 * @param {object} options   - opciones fetch adicionales
 * @returns {Promise<any>}   - datos JSON de la respuesta
 */
async function request(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API}${endpoint}`, { ...options, headers });

  // Si la respuesta es 401, el token expiró → redirigir al login
  if (res.status === 401) {
    localStorage.removeItem("token");
    goTo("login.html");
    return;
  }

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    // Lanzar error con el mensaje del servidor
    throw new Error(typeof data === "string" ? data : data.message || "Error en la solicitud");
  }

  return data;
}


/* ═══════════════════════════════════════════
   2. TOAST — mensajes visuales
═══════════════════════════════════════════ */

let _toastTimer = null;

/**
 * Muestra un toast no-intrusivo en la parte inferior.
 * @param {string} msg     - mensaje a mostrar
 * @param {'success'|'error'|'info'} type
 * @param {number} duration - ms que permanece visible (default 3000)
 */
function showToast(msg, type = "info", duration = 3000) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  const icons = { success: "✓", error: "✕", info: "ℹ" };

  toast.className = "";
  toast.classList.add(type);
  toast.innerHTML = `<span>${icons[type] || "•"}</span> ${msg}`;

  // Forzar reflow para reiniciar la animación
  void toast.offsetWidth;
  toast.classList.add("show");

  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

/** Alias convenientes */
const toast = {
  ok:   (msg) => showToast(msg, "success"),
  err:  (msg) => showToast(msg, "error"),
  info: (msg) => showToast(msg, "info"),
};


/* ═══════════════════════════════════════════
   3. AUTH — login, register, logout
═══════════════════════════════════════════ */

/**
 * Login: envía credenciales, guarda token y redirige al dashboard.
 */
async function login() {
  const emailEl    = document.getElementById("email");
  const passwordEl = document.getElementById("password");
  const btn        = document.getElementById("loginBtn");

  const email    = emailEl?.value.trim();
  const password = passwordEl?.value;

  // Validación básica
  if (!email || !password) {
    toast.err("Completa todos los campos");
    return;
  }

  btn && setLoading(btn, true);

  try {
    const data = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (!data?.token) throw new Error("Respuesta inesperada del servidor");

    localStorage.setItem("token", data.token);
    toast.ok("Sesión iniciada ✓");

    // Pequeño delay para que el toast se vea antes de redirigir
    setTimeout(() => { goTo("dashboard.html"); }, 500);

  } catch (err) {
    toast.err(err.message || "Credenciales incorrectas");
    btn && setLoading(btn, false);
  }
}


/**
 * Registro: crea usuario y redirige al login.
 */
async function register() {
  const nameEl     = document.getElementById("name");
  const emailEl    = document.getElementById("email");
  const passwordEl = document.getElementById("password");
  const btn        = document.getElementById("registerBtn");

  const name     = nameEl?.value.trim();
  const email    = emailEl?.value.trim();
  const password = passwordEl?.value;

  // Validaciones
  if (!name || !email || !password) {
    toast.err("Completa todos los campos");
    return;
  }
  if (password.length < 6) {
    toast.err("La contraseña debe tener al menos 6 caracteres");
    return;
  }

  btn && setLoading(btn, true);

  try {
    await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });

    toast.ok("Cuenta creada con éxito");
    setTimeout(() => { goTo("login.html"); }, 700);

  } catch (err) {
    toast.err(err.message || "No se pudo crear la cuenta");
    btn && setLoading(btn, false);
  }
}


/**
 * Logout: limpia el token y redirige al login.
 */
function logout() {
  localStorage.removeItem("token");
  goTo("login.html");
}


/* ═══════════════════════════════════════════
   4. PRODUCTS — CRUD completo
═══════════════════════════════════════════ */

/** Almacena los productos en memoria para evitar fetches innecesarios */
let _products = [];

/**
 * Carga todos los productos desde la API y renderiza la tabla.
 */
async function loadProducts() {
  const tbody = document.getElementById("productTableBody");
  if (!tbody) return;

  tbody.innerHTML = buildSkeletonRows(5);
  document.getElementById("emptyState").style.display = "none";

  try {
    const res = await fetch(`${API}/products`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });

    // Token inválido → logout
    if (res.status === 401 || res.status === 403) {
      logout();
      return;
    }

    if (!res.ok) throw new Error(`Error del servidor (${res.status})`);

    const data = await res.json();

    // Garantizar que sea array aunque el servidor devuelva otra cosa
    _products = Array.isArray(data) ? data : [];

    renderProducts(_products);
    updateStats(_products);

  } catch (err) {
    toast.err("Error al cargar productos: " + err.message);
    tbody.innerHTML = "";
    document.getElementById("emptyState").style.display = "block";
  }
}


/**
 * Agrega un nuevo producto.
 */
async function addProduct() {
  const nameEl  = document.getElementById("prodName");
  const priceEl = document.getElementById("prodPrice");

  const name  = nameEl?.value.trim();
  const price = parseFloat(priceEl?.value);

  if (!name) {
    toast.err("Ingresa el nombre del producto");
    nameEl?.focus();
    return;
  }
  if (isNaN(price) || price < 0) {
    toast.err("Ingresa un precio válido");
    priceEl?.focus();
    return;
  }

  try {
    await request("/products", {
      method: "POST",
      body: JSON.stringify({ name, price }),
    });

    // Limpiar inputs
    nameEl.value  = "";
    priceEl.value = "";
    nameEl.focus();

    toast.ok(`"${name}" agregado correctamente`);
    await loadProducts();

  } catch (err) {
    toast.err(err.message || "Error al agregar producto");
  }
}


/**
 * Elimina un producto por ID (con animación de salida).
 * @param {number} id
 * @param {string} name - para el mensaje de feedback
 */
async function deleteProduct(id, name = "Producto") {
  const row = document.querySelector(`tr[data-id="${id}"]`);

  try {
    row?.classList.add("removing");
    await new Promise(r => setTimeout(r, 200)); // esperar animación

    await request(`/products/${id}`, { method: "DELETE" });

    toast.ok(`"${name}" eliminado`);
    await loadProducts();

  } catch (err) {
    row?.classList.remove("removing");
    toast.err(err.message || "Error al eliminar producto");
  }
}


/**
 * Abre el modal de edición.
 * @param {number} id
 */
function editProduct(id) {
  const product = _products.find(p => p.id === id);
  if (!product) return;
  openEditModal(product.id, product.name, product.price);
}


/**
 * Guarda los cambios de edición (llamado desde el modal).
 */
async function saveEdit() {
  const id    = document.getElementById("editId")?.value;
  const name  = document.getElementById("editName")?.value.trim();
  const price = parseFloat(document.getElementById("editPrice")?.value);

  if (!name || isNaN(price) || price < 0) {
    toast.err("Datos inválidos");
    return;
  }

  try {
    await request(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name, price }),
    });

    closeEditModal();
    toast.ok("Producto actualizado");
    await loadProducts();

  } catch (err) {
    toast.err(err.message || "Error al actualizar producto");
  }
}


/* ═══════════════════════════════════════════
   5. DASHBOARD UI HELPERS
═══════════════════════════════════════════ */

/**
 * Renderiza las filas de la tabla de productos.
 * @param {Array} products
 */
function renderProducts(products) {
  const tbody = document.getElementById("productTableBody");
  const empty = document.getElementById("emptyState");
  if (!tbody) return;

  if (!products || products.length === 0) {
    tbody.innerHTML = "";
    empty && (empty.style.display = "block");
    return;
  }

  empty && (empty.style.display = "none");

  tbody.innerHTML = products.map((p, i) => `
    <tr data-id="${p.id}">
      <td><span class="badge">${String(i + 1).padStart(2, "0")}</span></td>
      <td class="product-name">${escapeHtml(p.name)}</td>
      <td class="product-price">$${Number(p.price).toFixed(2)}</td>
      <td><span class="badge">Activo</span></td>
      <td>
        <div class="actions">
          <button class="btn btn-edit" onclick="editProduct(${p.id})">✎ Editar</button>
          <button class="btn btn-danger" onclick="deleteProduct(${p.id}, '${escapeHtml(p.name).replace(/'/g, "\\'")}')">✕ Eliminar</button>
        </div>
      </td>
    </tr>
  `).join("");
}


/**
 * Actualiza las tarjetas de estadísticas.
 * @param {Array} products
 */
function updateStats(products) {
  const total = products.length;
  const prices = products.map(p => Number(p.price)).filter(n => !isNaN(n));
  const avg = prices.length ? (prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  const max = prices.length ? Math.max(...prices) : 0;

  const el = id => document.getElementById(id);
  if (el("statTotal")) el("statTotal").textContent = total;
  if (el("statAvg"))   el("statAvg").textContent   = `$${avg.toFixed(2)}`;
  if (el("statMax"))   el("statMax").textContent   = `$${max.toFixed(2)}`;
}


/**
 * Construye filas de skeleton loader.
 * @param {number} count
 * @returns {string} HTML
 */
function buildSkeletonRows(count) {
  return Array.from({ length: count }, (_, i) => `
    <tr style="animation-delay:${i * 0.05}s">
      <td><div class="skeleton" style="width:30px"></div></td>
      <td><div class="skeleton" style="width:${120 + (i % 3) * 30}px"></div></td>
      <td><div class="skeleton" style="width:60px"></div></td>
      <td><div class="skeleton" style="width:50px"></div></td>
      <td><div class="skeleton" style="width:120px"></div></td>
    </tr>
  `).join("");
}


/**
 * Activa/desactiva estado de carga en un botón.
 * @param {HTMLElement} btn
 * @param {boolean} loading
 */
function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn._originalText = btn._originalText || btn.textContent;
  btn.textContent = loading ? "Cargando…" : btn._originalText;
}


/**
 * Escapa caracteres HTML para evitar XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}


/* ═══════════════════════════════════════════
   6. INIT — ejecutar al cargar la página
═══════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {
  const page    = window.location.pathname.split("/").pop() || "";

  const enDashboard = page === "dashboard.html";
  const enLogin     = page === "login.html" || page === "" || page === "/";
  const enRegister  = page === "register.html";

  if (enDashboard) {
    if (!isLoggedIn()) {
      goTo("login.html");
      return;
    }
    loadProducts();
  }

  if (enLogin || enRegister) {
    if (isLoggedIn()) {
      goTo("dashboard.html");
    }
  }
});