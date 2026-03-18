/* ============================================================
   YAPA BAKERY — main.js
   ============================================================
   SETUP CHECKLIST:
   1. Update pickupDates array with your actual Saturday dates
   2. Replace stripePaymentLink with your Stripe Payment Link URL
      (Create at: dashboard.stripe.com → Payment Links)
   3. Replace googleFormUrl with your Google Form URL
   4. Update menu prices as needed
   ============================================================ */

const SITE_CONFIG = {
  // ── Upcoming Saturday pickup dates (YYYY-MM-DD) ──
  pickupDates: [
    '2026-03-21',
    '2026-04-11',
    '2026-04-25',
    '2026-05-09',
    '2026-05-23',
    '2026-06-13',
    '2026-06-27',
  ],

  pickupWindow:   '11am – 1pm',
  pickupLocation: 'Santa Clara County (address shared after payment)',
  orderOpenDays:  10,  // days before pickup that orders open
  orderCloseDays: 5,   // days before pickup that orders close (Monday)

  // Optional per-pickup status override: use when you need to keep a date open past the normal cutoff.
  // Supported values: 'open', 'closed'
  orderStatusOverrides: {
    '2026-03-21': 'open',
  },

  // ── Stripe Payment Link ── (replace with your link)
  stripePaymentLink: 'https://buy.stripe.com/REPLACE_WITH_YOUR_LINK',

  // ── Google Form for bulk/event orders ── (replace with your form)
  googleFormUrl: 'https://forms.gle/REPLACE_WITH_YOUR_FORM',

  // ── Menu ── update prices, add/remove items as needed
  menu: [
    {
      category: 'Salteñas',
      items: [
        { id: 'saltena-1',  name: 'Salteña',         desc: 'Traditional Bolivian savory pastry, baked fresh',       price: 4.50 },
        { id: 'saltena-6',  name: 'Salteñas × 6',    desc: 'Half dozen',                                            price: 25.00 },
        { id: 'saltena-12', name: 'Salteñas × 12',   desc: 'Full dozen — perfect for a gathering',                  price: 48.00 },
      ],
    },
    {
      category: 'Cookies & Sweets',
      items: [
        { id: 'alfajores-1',  name: 'Alfajores (each)',       desc: 'Dulce de leche sandwich cookies',               price: 3.50 },
        { id: 'alfajores-6',  name: 'Alfajores × 6',          desc: 'Half dozen box',                                price: 19.00 },
        { id: 'vegan-cookies',name: 'Vegan Butter Cookies',   desc: 'Box of 6 — buttery plant-based shortbread',     price: 18.00 },
        { id: 'evie-cookies', name: "Evie's Cookies",         desc: "Box of 6 — classic homestyle",                  price: 18.00 },
      ],
    },
    {
      category: 'Cakes & Desserts',
      items: [
        { id: 'tres-leches',  name: 'Tres Leches Cake',   desc: 'Whole cake — serves 8–10',                          price: 55.00 },
        { id: 'tartufo',      name: 'Tartufo',             desc: 'Italian-style ice cream truffle',                   price: 9.00 },
        { id: 'truffle-slice',name: 'Truffle Cake Slice',  desc: 'Rich chocolate truffle',                            price: 8.00 },
        { id: 'red-velvet',   name: 'Red Velvet Cake',     desc: 'Whole cake — serves 8–10',                          price: 60.00 },
        { id: 'marble-cake',  name: 'Marble Cake',         desc: 'Classic vanilla/chocolate swirl — whole',           price: 50.00 },
        { id: 'cheese-flan',  name: 'Cheese Flan',         desc: 'Silky baked custard with caramelized topping',      price: 8.00 },
      ],
    },
  ],
};

// ── Date Utilities ─────────────────────────────────────────
function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const MS_DAY = 86400000;
const ORDER_DRAFT_KEY = 'yapa-order-draft';

function getOrderDraft() {
  try {
    return JSON.parse(localStorage.getItem(ORDER_DRAFT_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveOrderDraft(draft) {
  try {
    localStorage.setItem(ORDER_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Ignore storage failures (private mode, blocked storage, etc.)
  }
}

function clearOrderDraft() {
  try {
    localStorage.removeItem(ORDER_DRAFT_KEY);
  } catch {
    // Ignore storage failures
  }
}

function getNextPickup() {
  const t = today();
  return SITE_CONFIG.pickupDates
    .map(parseDate)
    .filter(d => d >= t)
    .sort((a, b) => a - b)[0] || null;
}

function getOrderStatus() {
  const pickup = getNextPickup();
  if (!pickup) return { status: 'none' };

  const t = today();
  const daysUntil = Math.round((pickup - t) / MS_DAY);
  const pickupKey = toDateKey(pickup);
  const forcedStatus = SITE_CONFIG.orderStatusOverrides?.[pickupKey];

  if (forcedStatus === 'open') {
    const closeDate = new Date(pickup - SITE_CONFIG.orderCloseDays * MS_DAY);
    return { status: 'open', pickup, daysUntil, closeDate };
  }
  if (forcedStatus === 'closed') {
    const next = SITE_CONFIG.pickupDates
      .map(parseDate)
      .filter(d => d > pickup)
      .sort((a, b) => a - b)[0] || null;
    return { status: 'closed', pickup, nextPickup: next };
  }

  if (daysUntil > SITE_CONFIG.orderOpenDays) {
    const opensOn = new Date(pickup - SITE_CONFIG.orderOpenDays * MS_DAY);
    return { status: 'not-open', pickup, daysUntil, opensOn };
  }
  if (daysUntil <= SITE_CONFIG.orderCloseDays) {
    const next = SITE_CONFIG.pickupDates
      .map(parseDate)
      .filter(d => d > pickup)
      .sort((a, b) => a - b)[0] || null;
    return { status: 'closed', pickup, nextPickup: next };
  }
  const closeDate = new Date(pickup - SITE_CONFIG.orderCloseDays * MS_DAY);
  return { status: 'open', pickup, daysUntil, closeDate };
}

function fmt(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}
function fmtShort(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Pickup Banner ──────────────────────────────────────────
function renderBanner() {
  const banner = document.getElementById('pickup-banner');
  if (!banner) return;

  const s = getOrderStatus();

  if (s.status === 'none') {
    banner.textContent = 'No upcoming pickups scheduled — follow us on Instagram for updates.';
    return;
  }

  const dateStr = fmt(s.pickup);

  if (s.status === 'open') {
    banner.innerHTML =
      `<strong>Next Salteñas Pickup: ${dateStr} &nbsp;·&nbsp; ${SITE_CONFIG.pickupWindow}</strong>
       &nbsp;·&nbsp; Orders close ${fmtShort(s.closeDate)}
       &nbsp;<a href="order.html">Order Now →</a>`;
  } else if (s.status === 'not-open') {
    banner.innerHTML =
      `<strong>Next Salteñas Pickup: ${dateStr}</strong>
       &nbsp;·&nbsp; Orders open ${fmtShort(s.opensOn)}`;
  } else {
    const nextMsg = s.nextPickup
      ? ` &nbsp;·&nbsp; Next pickup: ${fmt(s.nextPickup)}`
      : '';
    banner.innerHTML =
      `Orders are closed for ${fmtShort(s.pickup)} pickup.${nextMsg}`;
  }
}

// ── Homepage callout + hero date ───────────────────────────
function renderCallout() {
  const dateEl     = document.getElementById('callout-date');
  const msgEl      = document.getElementById('callout-msg');
  const heroDateEl = document.getElementById('hero-pickup-date');

  const s = getOrderStatus();

  // Hero pill
  if (heroDateEl) {
    heroDateEl.textContent = s.pickup ? fmt(s.pickup) : 'Coming soon';
  }

  if (!dateEl) return;

  if (s.status === 'none') {
    dateEl.textContent = 'Coming Soon';
    if (msgEl) msgEl.textContent = 'Follow us on Instagram for the next pickup announcement.';
    return;
  }

  dateEl.textContent = fmt(s.pickup);

  if (s.status === 'open' && msgEl) {
    msgEl.textContent = `Orders close ${fmtShort(s.closeDate)} — don't wait!`;
  } else if (s.status === 'not-open' && msgEl) {
    msgEl.textContent = `Orders open ${fmtShort(s.opensOn)}. Mark your calendar!`;
  } else if (msgEl) {
    const nextMsg = s.nextPickup ? `Next pickup: ${fmt(s.nextPickup)}` : 'Stay tuned for the next date.';
    msgEl.textContent = `Orders closed for this pickup. ${nextMsg}`;
  }
}

// ── Navigation ─────────────────────────────────────────────
function initNav() {
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('nav-links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      navLinks.classList.toggle('open');
    });
    // Close on outside click
    document.addEventListener('click', e => {
      if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
      }
    });
  }

  // Highlight active page
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
}

// ── Order Form ─────────────────────────────────────────────
function initOrderForm() {
  const form     = document.getElementById('order-form');
  const openWrap = document.getElementById('orders-open');
  const closedEl = document.getElementById('orders-closed');
  if (!form) return;

  const s = getOrderStatus();

  if (s.status !== 'open') {
    if (openWrap)  openWrap.classList.add('hidden');
    if (closedEl)  closedEl.classList.remove('hidden');

    const msgEl = document.getElementById('closed-msg');
    if (msgEl) {
      if (s.status === 'not-open') {
        msgEl.textContent = `Orders for the ${fmt(s.pickup)} pickup open on ${fmt(s.opensOn)}.`;
      } else if (s.status === 'closed') {
        const nextMsg = s.nextPickup ? ` Next pickup: ${fmt(s.nextPickup)}.` : '';
        msgEl.textContent = `Orders are closed for the ${fmt(s.pickup)} pickup.${nextMsg}`;
      } else {
        msgEl.textContent = 'No upcoming pickups scheduled. Follow us on Instagram for updates.';
      }
    }
    return;
  }

  // Show pickup details
  const pdEl = document.getElementById('pickup-date-display');
  if (pdEl) pdEl.textContent = `${fmt(s.pickup)}, ${SITE_CONFIG.pickupWindow}`;
  const cdEl = document.getElementById('close-date-display');
  if (cdEl) cdEl.textContent = fmt(s.closeDate);

  // Render menu items
  const menuEl = document.getElementById('menu-items');
  if (menuEl) {
    menuEl.innerHTML = SITE_CONFIG.menu.map(cat => `
      <div class="menu-section-title">${cat.category}</div>
      ${cat.items.map(item => `
        <div class="item-row">
          <div class="item-info">
            <div class="item-name">${item.name}</div>
            <div class="item-desc">${item.desc}</div>
          </div>
          <div class="item-price-tag">$${item.price.toFixed(2)}</div>
          <div class="qty-wrap">
            <input
              type="number"
              class="qty-input form-group"
              name="${item.id}"
              id="qty-${item.id}"
              value="0" min="0" max="30"
              data-price="${item.price}"
              data-name="${item.name}"
              aria-label="Quantity for ${item.name}"
            >
          </div>
        </div>`).join('')}
    `).join('');

    menuEl.querySelectorAll('.qty-input').forEach(inp => {
      inp.addEventListener('input', updateTotal);
      inp.addEventListener('change', updateTotal);
    });

    applyOrderDraftSelections();
  }

  updateTotal();
  form.addEventListener('submit', handleOrderSubmit);
}

function updateTotal() {
  let total = 0;
  document.querySelectorAll('.qty-input').forEach(inp => {
    total += (parseInt(inp.value) || 0) * (parseFloat(inp.dataset.price) || 0);
  });

  const amountEl = document.getElementById('order-total-amount');
  if (amountEl) amountEl.textContent = `$${total.toFixed(2)}`;

  const btn = document.getElementById('submit-order-btn');
  if (btn) {
    btn.disabled = total === 0;
    btn.textContent = total > 0
      ? `Place Order & Pay $${total.toFixed(2)}`
      : 'Add items to place order';
  }
}

function applyOrderDraftSelections() {
  const draft = getOrderDraft();

  document.querySelectorAll('.qty-input').forEach(inp => {
    const qty = parseInt(draft[inp.name], 10) || 0;
    if (qty > 0) inp.value = Math.min(30, qty);
  });
}

function initBakedGoodsQuickOrder() {
  const cartBar = document.getElementById('baked-cart-bar');
  if (!cartBar) return;

  const countEl = document.getElementById('baked-cart-count');
  const qtyInputs = [...document.querySelectorAll('.quick-qty-input[data-order-id]')];
  if (qtyInputs.length === 0) return;

  const draft = getOrderDraft();

  function normalizeQty(value) {
    const n = parseInt(value, 10);
    if (Number.isNaN(n) || n < 0) return 0;
    return Math.min(30, n);
  }

  function refreshCount() {
    const totalItems = qtyInputs.reduce((sum, input) => sum + normalizeQty(input.value), 0);
    if (countEl) countEl.textContent = String(totalItems);
  }

  qtyInputs.forEach(input => {
    const itemId = input.dataset.orderId;
    if (!itemId) return;

    if (draft[itemId]) {
      input.value = normalizeQty(draft[itemId]);
    }

    const syncDraft = () => {
      const qty = normalizeQty(input.value);
      input.value = qty;
      if (qty === 0) {
        delete draft[itemId];
      } else {
        draft[itemId] = qty;
      }
      saveOrderDraft(draft);
      refreshCount();
    };

    input.addEventListener('input', syncDraft);
    input.addEventListener('change', syncDraft);
  });

  refreshCount();
}

function handleOrderSubmit(e) {
  e.preventDefault();

  // Build order summary
  const lines = [];
  document.querySelectorAll('.qty-input').forEach(inp => {
    const qty = parseInt(inp.value) || 0;
    if (qty > 0) lines.push(`${qty}× ${inp.dataset.name}`);
  });
  if (lines.length === 0) return;

  // Write summary into hidden field so Netlify Forms captures it
  const summaryField = document.getElementById('order-details');
  if (summaryField) {
    const total = document.getElementById('order-total-amount')?.textContent || '';
    summaryField.value = lines.join(', ') + ` | Total: ${total}`;
  }

  // Submit to Netlify, then redirect to Stripe
  const formData = new FormData(e.target);
  fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(formData).toString(),
  })
    .finally(() => {
      clearOrderDraft();
      window.location.href = SITE_CONFIG.stripePaymentLink;
    });
}

// ── FAQ Accordion ──────────────────────────────────────────
function initFAQ() {
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item   = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
}

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderBanner();
  renderCallout();
  initNav();
  initBakedGoodsQuickOrder();
  initOrderForm();
  initFAQ();
});
