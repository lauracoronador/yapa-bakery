/* ============================================================
   YAPA BAKERY — main.js
   ============================================================
   SETUP CHECKLIST:
  1. Replace stripePaymentLink with your Stripe Payment Link URL
      (Create at: dashboard.stripe.com → Payment Links)
  2. Replace googleFormUrl with your Google Form URL
  3. Update menu prices as needed
   ============================================================ */

const SITE_CONFIG = {
  // ==========================================================
  // ADMIN CHEAT SHEET (copy/paste examples)
  // ==========================================================
  // 1) Skip one Saltenas pickup Saturday:
  // skipPickupDates: ['2026-07-18'],
  //
  // 2) Force-close one Saltenas pickup (for capacity):
  // orderStatusOverrides: { '2026-05-30': 'closed' },
  // pickupStatusNotes: { '2026-05-30': 'This pickup is at capacity.' },
  //
  // 3) Skip one Baked Goods date:
  // bakedGoodsSkipDates: ['2026-06-12'],
  //
  // 4) Force-close one Baked Goods date (for capacity):
  // bakedGoodsStatusOverrides: { '2026-06-13': 'closed' },
  // bakedGoodsStatusNotes: { '2026-06-13': 'At capacity for this date.' },
  //
  // 5) Re-open a date manually (rare):
  // orderStatusOverrides: { '2026-05-30': 'open' },
  // bakedGoodsStatusOverrides: { '2026-06-13': 'open' },
  // ==========================================================
  // END OF ADMIN CHEAT SHEET
  // ==========================================================

  // ── Salteñas schedule: every 2 Saturdays, starting March 21, 2026 ──
  pickupStartDate: '2026-03-21',
  pickupIntervalDays: 14,
  scheduleHorizonDays: 548, // Precompute ~18 months of dates.

  // Optional exceptions. Leave empty until needed.
  // Add dates to SKIP specific pickup Saturdays.
  // Example: skipPickupDates: ['2026-07-18']
  skipPickupDates: [],

  // Optional per-date force status. Override calendar logic for that pickup date.
  // Values: 'open' or 'closed'
  // Example (capacity reached): orderStatusOverrides: { '2026-05-30': 'closed' }
  orderStatusOverrides: {},

  // Optional note shown when a pickup is force-closed.
  // Key must match the pickup date in orderStatusOverrides.
  // Example: pickupStatusNotes: { '2026-05-30': 'This pickup is at capacity.' }
  pickupStatusNotes: {},

  // Optional Baked Goods exceptions. Leave empty until needed.
  // Add dates to SKIP specific baked-goods pickup dates (Tue-Sat).
  // Example: bakedGoodsSkipDates: ['2026-06-12']
  bakedGoodsSkipDates: [],

  // Optional Baked Goods per-date force status.
  // Values: 'open' or 'closed'
  // Example: bakedGoodsStatusOverrides: { '2026-06-13': 'closed' }
  bakedGoodsStatusOverrides: {},

  // Optional note shown when a baked-goods date is force-closed.
  // Example: bakedGoodsStatusNotes: { '2026-06-13': 'At capacity for this date.' }
  bakedGoodsStatusNotes: {},

  pickupWindow:   '11am – 1pm',
  pickupLocation: 'Santa Clara County (address shared after payment)',
  orderCloseDays: 5, // Orders close at 11:59 PM PT, 5 days before pickup.

  // ── Stripe Payment Link ── (replace with your link)
  stripePaymentLink: 'https://buy.stripe.com/REPLACE_WITH_YOUR_LINK',

  // ── Google Form for bulk/event orders ── (replace with your form)
  googleFormUrl: 'https://forms.gle/REPLACE_WITH_YOUR_FORM',

  // ── Menu ── update prices, add/remove items as needed
  menu: [
    {
      category: 'Salteñas',
      items: [
        { id: 'saltena-1',  name: 'Salteña',         desc: 'Traditional Bolivian savory pastry, baked fresh',       price: 7.00 },
        { id: 'saltena-6',  name: 'Salteñas × 6',    desc: 'Half dozen',                                            price: 42.00 },
        { id: 'saltena-12', name: 'Salteñas × 12',   desc: 'Full dozen — perfect for a gathering',                  price: 84.00 },
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

function getAllMenuItems() {
  return SITE_CONFIG.menu.flatMap(cat => cat.items);
}

function getItemById(itemId) {
  return getAllMenuItems().find(item => item.id === itemId) || null;
}

function getBakedGoodsItems() {
  return SITE_CONFIG.menu
    .filter(cat => cat.category !== 'Salteñas')
    .flatMap(cat => cat.items);
}

function getSaltenasItems() {
  return SITE_CONFIG.menu
    .filter(cat => cat.category === 'Salteñas')
    .flatMap(cat => cat.items);
}

function getDraftItemCount() {
  const draft = getOrderDraft();
  return Object.values(draft).reduce((sum, qty) => sum + (parseInt(qty, 10) || 0), 0);
}

// ── Cart Type Detection ────────────────────────────────────
function getCartType() {
  const draft = getOrderDraft();
  const saltenasIds = getSaltenasItems().map(item => item.id);
  const bakedGoodsIds = getBakedGoodsItems().map(item => item.id);

  let hasSaltenas = false;
  let hasBakedGoods = false;

  Object.keys(draft).forEach(itemId => {
    const qty = parseInt(draft[itemId], 10) || 0;
    if (qty > 0) {
      if (saltenasIds.includes(itemId)) hasSaltenas = true;
      if (bakedGoodsIds.includes(itemId)) hasBakedGoods = true;
    }
  });

  if (hasSaltenas && hasBakedGoods) return 'mixed';
  if (hasSaltenas) return 'saltenas';
  if (hasBakedGoods) return 'baked-goods';
  return 'empty';
}

// ── Salteñas Pickup Date Logic ─────────────────────────────
// Returns next eligible Salteña Saturday with Monday 11:59 PM cutoff (America/Los_Angeles)
function getNextSaltenasPickupDate() {
  const schedule = getSaltenasScheduleContext();
  return schedule.nextOpenPickup || null;
}

// ── Baked Goods Allowed Dates ──────────────────────────────
// Returns array of allowed pickup dates for Baked Goods:
// - Tuesday to Saturday
// - Minimum 5 full days lead time (order placed at least 5*24 hours before pickup)
function getAvailableBakedGoodsDates() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const ptMap = {};
  parts.forEach(({ type, value }) => {
    ptMap[type] = value;
  });
  const currentYear = parseInt(ptMap.year, 10);
  const currentMonth = parseInt(ptMap.month, 10) - 1;
  const currentDay = parseInt(ptMap.day, 10);

  const todayPT = new Date(currentYear, currentMonth, currentDay);

  // Generate available dates: Tue-Sat for next 3 months (approximately 13 weeks)
  const availableDates = [];
  for (let i = 1; i <= 91; i++) {
    const d = new Date(todayPT);
    d.setDate(d.getDate() + i);

    const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, 2=Tue, ..., 6=Sat
    
    // Only Tue (2) through Sat (6)
    if (dayOfWeek < 2 || dayOfWeek > 6) continue;

    // Check 5-day lead time: order placed + 5 days <= pickup date
    const minPickupDate = new Date(todayPT);
    minPickupDate.setDate(minPickupDate.getDate() + 5);

    const dateKey = toDateKey(d);
    const availability = getBakedGoodsDateAvailability(dateKey);

    if (d >= minPickupDate && availability.allowed) {
      availableDates.push(d);
    }
  }

  return availableDates;
}

function getBakedGoodsMinPickupDateKey() {
  const minDate = new Date(getTodayPT());
  minDate.setDate(minDate.getDate() + 5);
  return toDateKey(minDate);
}

function isAllowedBakedGoodsPickupDate(dateKey) {
  return getBakedGoodsDateAvailability(dateKey).allowed;
}

function getBakedGoodsOverrideStatus(dateKey) {
  const value = SITE_CONFIG.bakedGoodsStatusOverrides?.[dateKey];
  if (value === 'open' || value === 'closed') return value;
  return null;
}

function getBakedGoodsStatusNote(dateKey) {
  return String(SITE_CONFIG.bakedGoodsStatusNotes?.[dateKey] || '').trim();
}

function getBakedGoodsDateAvailability(dateKey) {
  if (!dateKey) {
    return {
      allowed: false,
      message: 'Please choose a pickup date.',
    };
  }

  const selected = parseDate(dateKey);
  const minDate = parseDate(getBakedGoodsMinPickupDateKey());
  const dayOfWeek = selected.getDay();

  const isAllowedWeekday = dayOfWeek >= 2 && dayOfWeek <= 6; // Tue-Sat
  if (!isAllowedWeekday || selected < minDate) {
    return {
      allowed: false,
      message: 'Please choose a Tuesday-Saturday pickup date at least 5 days from today.',
    };
  }

  const skipped = new Set((SITE_CONFIG.bakedGoodsSkipDates || []).map(String));
  if (skipped.has(dateKey)) {
    return {
      allowed: false,
      message: 'That baked-goods pickup date is unavailable. Please choose another date.',
    };
  }

  const override = getBakedGoodsOverrideStatus(dateKey);
  if (override === 'closed') {
    const note = getBakedGoodsStatusNote(dateKey);
    return {
      allowed: false,
      message: note || 'That baked-goods pickup date is closed. Please choose another date.',
    };
  }

  return {
    allowed: true,
    message: '',
  };
}

function renderNavCartCount() {
  const count = getDraftItemCount();
  const countEl = document.getElementById('nav-cart-count');
  if (countEl) countEl.textContent = String(count);
}

function getNextPickup() {
  const schedule = getSaltenasScheduleContext();
  return schedule.currentPickup;
}

function getOrderStatus() {
  const schedule = getSaltenasScheduleContext();
  if (!schedule.nextOpenPickup) return { status: 'none' };

  const closeDate = getPickupCloseDate(schedule.nextOpenPickup);
  const nextPickupAfterOpen = schedule.upcomingDates.find(d => d > schedule.nextOpenPickup) || null;
  const closedPickup = schedule.currentPickup && schedule.nextOpenPickup &&
    toDateKey(schedule.currentPickup) !== toDateKey(schedule.nextOpenPickup)
    ? schedule.currentPickup
    : null;
  const closedPickupReason = getPickupStatusNote(closedPickup);

  return {
    status: 'open',
    pickup: schedule.nextOpenPickup,
    closeDate,
    nextPickup: nextPickupAfterOpen,
    closedPickup,
    closedPickupReason,
  };
}

function fmt(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}
function fmtShort(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getNowPT() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const ptMap = {};
  parts.forEach(({ type, value }) => {
    ptMap[type] = value;
  });

  return new Date(
    parseInt(ptMap.year, 10),
    parseInt(ptMap.month, 10) - 1,
    parseInt(ptMap.day, 10),
    parseInt(ptMap.hour, 10),
    parseInt(ptMap.minute, 10),
    parseInt(ptMap.second, 10),
    0
  );
}

function getTodayPT() {
  const d = getNowPT();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getGeneratedSaltenasPickupDates() {
  const start = parseDate(SITE_CONFIG.pickupStartDate);
  const interval = Math.max(1, SITE_CONFIG.pickupIntervalDays || 14);
  const horizon = Math.max(interval, SITE_CONFIG.scheduleHorizonDays || 365);
  const end = new Date(getTodayPT());
  end.setDate(end.getDate() + horizon);
  const skipped = new Set((SITE_CONFIG.skipPickupDates || []).map(String));

  const dates = [];
  let cursor = new Date(start);
  while (cursor <= end) {
    const key = toDateKey(cursor);
    if (!skipped.has(key)) {
      dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + interval);
  }
  return dates;
}

function getPickupOverrideStatus(pickupDate) {
  const dateKey = toDateKey(pickupDate);
  const value = SITE_CONFIG.orderStatusOverrides?.[dateKey];
  if (value === 'open' || value === 'closed') return value;
  return null;
}

function isPickupOpenForOrdering(pickupDate, nowPT) {
  const forced = getPickupOverrideStatus(pickupDate);
  if (forced === 'open') return true;
  if (forced === 'closed') return false;
  return nowPT <= getPickupCloseDate(pickupDate);
}

function getPickupStatusNote(pickupDate) {
  if (!pickupDate) return '';
  const dateKey = toDateKey(pickupDate);
  return String(SITE_CONFIG.pickupStatusNotes?.[dateKey] || '').trim();
}

function getPickupCloseDate(pickupDate) {
  const closeDate = new Date(pickupDate);
  closeDate.setDate(closeDate.getDate() - SITE_CONFIG.orderCloseDays);
  closeDate.setHours(23, 59, 59, 999);
  return closeDate;
}

function getSaltenasScheduleContext() {
  const nowPT = getNowPT();
  const todayPT = new Date(nowPT);
  todayPT.setHours(0, 0, 0, 0);

  const upcomingDates = getGeneratedSaltenasPickupDates()
    .filter(d => d >= todayPT)
    .sort((a, b) => a - b);

  const currentPickup = upcomingDates[0] || null;
  const nextOpenPickup = upcomingDates.find(d => isPickupOpenForOrdering(d, nowPT)) || null;

  return {
    nowPT,
    upcomingDates,
    currentPickup,
    nextOpenPickup,
  };
}

// ── Pickup Banner ──────────────────────────────────────────
function renderBanner() {
  const banner = document.getElementById('pickup-banner');
  if (!banner) return;

  const page = location.pathname.split('/').pop() || 'index.html';
  const isCartPage = page === 'cart.html';
  const cartType = getCartType();
  const cartHasSaltenas = cartType === 'saltenas' || cartType === 'mixed';

  if (isCartPage && !cartHasSaltenas) {
    banner.style.display = 'none';
    return;
  }

  banner.style.display = '';

  const s = getOrderStatus();

  if (s.status === 'none') {
    banner.textContent = 'No upcoming pickups scheduled — follow us on Instagram for updates.';
    return;
  }

  const dateStr = fmt(s.pickup);

  if (s.status === 'open' && s.closedPickup) {
    const reason = s.closedPickupReason ? ` ${s.closedPickupReason}` : '';
    banner.innerHTML =
      `Orders for ${fmtShort(s.closedPickup)} pickup closed.${reason}` +
      ` &nbsp;Orders for <strong>${fmtShort(s.pickup)} pickup are OPEN</strong> until ${fmtShort(s.closeDate)}.` +
      ` &nbsp;<a href="saltenas.html">Order Now →</a>`;
  } else if (s.status === 'open') {
    banner.innerHTML =
      `<strong>Next Salteñas Pickup: ${dateStr} &nbsp;·&nbsp; ${SITE_CONFIG.pickupWindow}</strong>
       &nbsp;·&nbsp; Orders close ${fmtShort(s.closeDate)}
       &nbsp;<a href="saltenas.html">Order Now →</a>`;
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
  const saltenasHeroDateEl = document.getElementById('saltenas-hero-pickup-date');

  const s = getOrderStatus();

  // Hero pill
  if (heroDateEl) {
    heroDateEl.textContent = s.pickup ? fmt(s.pickup) : 'Coming soon';
  }
  if (saltenasHeroDateEl) {
    saltenasHeroDateEl.textContent = s.pickup ? fmt(s.pickup) : 'Coming soon';
  }

  if (!dateEl) return;

  if (s.status === 'none') {
    dateEl.textContent = 'Coming Soon';
    if (msgEl) msgEl.textContent = 'Follow us on Instagram for the next pickup announcement.';
    return;
  }

  dateEl.textContent = fmt(s.pickup);

  if (s.status === 'open' && msgEl) {
    if (s.closedPickup) {
      msgEl.textContent = `Orders for ${fmtShort(s.closedPickup)} are closed. ${fmtShort(s.pickup)} pickup is now open.`;
    } else {
      msgEl.textContent = `Orders close ${fmtShort(s.closeDate)} — don't wait!`;
    }
  } else if (msgEl) {
    const nextMsg = s.nextPickup ? `Next pickup: ${fmt(s.nextPickup)}` : 'Stay tuned for the next date.';
    msgEl.textContent = `Orders closed for this pickup. ${nextMsg}`;
  }
}

function renderOpenPickupStatus() {
  const s = getOrderStatus();
  const saltenasStatusEl = document.getElementById('saltenas-open-status');
  const cartStatusEl = document.getElementById('cart-open-status');

  if (s.status === 'none') {
    if (saltenasStatusEl) saltenasStatusEl.textContent = 'No upcoming pickups scheduled right now.';
    if (cartStatusEl) cartStatusEl.textContent = 'No upcoming pickups scheduled right now.';
    return;
  }

  let statusText = `Currently taking orders for ${fmt(s.pickup)} pickup.`;
  if (s.closedPickup) {
    const reason = s.closedPickupReason ? ` ${s.closedPickupReason}` : '';
    statusText = `Orders for ${fmtShort(s.closedPickup)} closed.${reason} Currently taking orders for ${fmt(s.pickup)} pickup.`;
  }

  if (saltenasStatusEl) {
    saltenasStatusEl.textContent = `${statusText} Orders close ${fmtShort(s.closeDate)}.`;
  }
  if (cartStatusEl) {
    cartStatusEl.textContent = statusText;
  }
}

// ── Navigation ─────────────────────────────────────────────
function initNav() {
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('nav-links');

  // Safety fallback: convert any legacy "Order Now" nav CTA into the cart link.
  const legacyCta = document.querySelector('.nav-links .nav-cta');
  if (legacyCta) {
    legacyCta.className = 'nav-cart';
    legacyCta.innerHTML = '<a href="cart.html" aria-label="View cart">🛒 <span id="nav-cart-count">0</span></a>';
  }

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

  renderNavCartCount();
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
      if (s.status === 'closed') {
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
  const totalEl = document.getElementById('baked-cart-total');
  const toastEl = document.getElementById('baked-cart-toast');
  const viewCartBtn = document.getElementById('baked-view-cart');
  const drawer = document.getElementById('mini-cart-drawer');
  const drawerOverlay = document.getElementById('mini-cart-overlay');
  const closeDrawerBtn = document.getElementById('mini-cart-close');
  const drawerItemsEl = document.getElementById('mini-cart-items');
  const drawerTotalEl = document.getElementById('mini-cart-total');
  const qtyInputs = [...document.querySelectorAll('.quick-qty-input[data-order-id]')];
  if (qtyInputs.length === 0) return;

  let draft = getOrderDraft();
  let toastTimer = null;

  function normalizeQty(value) {
    const n = parseInt(value, 10);
    if (Number.isNaN(n) || n < 0) return 0;
    return Math.min(30, n);
  }

  function calculateSummary() {
    let totalItems = 0;
    let subtotal = 0;

    qtyInputs.forEach(input => {
      const itemId = input.dataset.orderId;
      const qty = normalizeQty(input.value);
      const item = itemId ? getItemById(itemId) : null;
      totalItems += qty;
      subtotal += qty * (item?.price || 0);
    });

    return { totalItems, subtotal };
  }

  function bumpQtyInput(input, delta) {
    const current = normalizeQty(input.value);
    const next = Math.max(0, Math.min(30, current + delta));
    if (next === current) return;
    input.value = String(next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function decorateQuickQtyInput(input) {
    if (input.closest('.qty-stepper')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'qty-stepper';

    const decBtn = document.createElement('button');
    decBtn.type = 'button';
    decBtn.className = 'qty-stepper-btn';
    decBtn.setAttribute('aria-label', 'Decrease quantity');
    decBtn.textContent = '-';

    const incBtn = document.createElement('button');
    incBtn.type = 'button';
    incBtn.className = 'qty-stepper-btn';
    incBtn.setAttribute('aria-label', 'Increase quantity');
    incBtn.textContent = '+';

    const parent = input.parentNode;
    if (!parent) return;

    parent.insertBefore(wrapper, input);
    wrapper.appendChild(decBtn);
    wrapper.appendChild(input);
    wrapper.appendChild(incBtn);

    decBtn.addEventListener('click', () => bumpQtyInput(input, -1));
    incBtn.addEventListener('click', () => bumpQtyInput(input, 1));
  }

  function renderMiniCart() {
    if (!drawerItemsEl) return;

    const entries = Object.entries(draft)
      .map(([itemId, qty]) => ({ itemId, qty: normalizeQty(qty), item: getItemById(itemId) }))
      .filter(entry => entry.qty > 0 && entry.item);

    if (entries.length === 0) {
      drawerItemsEl.innerHTML = '<p class="mini-cart-empty">Your cart is empty. Add items to get started.</p>';
      return;
    }

    drawerItemsEl.innerHTML = entries.map(({ itemId, qty, item }) => `
      <div class="mini-cart-item" data-drawer-item-id="${itemId}">
        <div class="mini-cart-item-name">${item.name}</div>
        <div class="mini-cart-item-price">$${(item.price * qty).toFixed(2)}</div>
        <div class="mini-cart-item-controls">
          <div class="qty-stepper qty-stepper-sm">
            <button type="button" class="qty-stepper-btn" data-drawer-dec-id="${itemId}" aria-label="Decrease quantity for ${item.name}">-</button>
            <input type="number" min="0" max="30" value="${qty}" data-drawer-qty-id="${itemId}" aria-label="Quantity for ${item.name}">
            <button type="button" class="qty-stepper-btn" data-drawer-inc-id="${itemId}" aria-label="Increase quantity for ${item.name}">+</button>
          </div>
          <button type="button" class="mini-cart-item-remove" data-drawer-remove-id="${itemId}">Remove</button>
        </div>
      </div>
    `).join('');

    drawerItemsEl.querySelectorAll('[data-drawer-dec-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.drawerDecId;
        if (!itemId) return;
        const input = drawerItemsEl.querySelector(`[data-drawer-qty-id="${itemId}"]`);
        if (!input) return;
        bumpQtyInput(input, -1);
      });
    });

    drawerItemsEl.querySelectorAll('[data-drawer-inc-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.drawerIncId;
        if (!itemId) return;
        const input = drawerItemsEl.querySelector(`[data-drawer-qty-id="${itemId}"]`);
        if (!input) return;
        bumpQtyInput(input, 1);
      });
    });

    drawerItemsEl.querySelectorAll('[data-drawer-qty-id]').forEach(input => {
      input.addEventListener('input', () => {
        const itemId = input.dataset.drawerQtyId;
        if (!itemId) return;

        const previousQty = normalizeQty(draft[itemId] || 0);
        const nextQty = normalizeQty(input.value);
        input.value = String(nextQty);
        if (nextQty === 0) {
          delete draft[itemId];
        } else {
          draft[itemId] = nextQty;
        }

        if (nextQty > previousQty) {
          const item = getItemById(itemId);
          const addedQty = nextQty - previousQty;
          if (item) showAddToast(item.name, addedQty);
        }

        saveOrderDraft(draft);
        syncQuickInputsFromDraft();
        refreshSummary();
      });
    });

    drawerItemsEl.querySelectorAll('[data-drawer-remove-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.drawerRemoveId;
        if (!itemId) return;

        delete draft[itemId];
        saveOrderDraft(draft);
        syncQuickInputsFromDraft();
        refreshSummary();
      });
    });
  }

  function refreshSummary() {
    const { totalItems, subtotal } = calculateSummary();
    if (countEl) countEl.textContent = String(totalItems);
    if (totalEl) totalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (drawerTotalEl) drawerTotalEl.textContent = `$${subtotal.toFixed(2)}`;
    cartBar.classList.toggle('has-items', totalItems > 0);
    renderMiniCart();
    renderNavCartCount();
  }

  function showAddToast(itemName, qtyAdded) {
    if (!toastEl || qtyAdded <= 0) return;

    toastEl.textContent = `Added ${qtyAdded} ${itemName}${qtyAdded > 1 ? 's' : ''} to cart`;
    toastEl.hidden = false;
    toastEl.classList.add('show');

    if (toastTimer) {
      window.clearTimeout(toastTimer);
    }
    toastTimer = window.setTimeout(() => {
      toastEl.classList.remove('show');
      window.setTimeout(() => {
        toastEl.hidden = true;
      }, 200);
    }, 1700);
  }

  function syncQuickInputsFromDraft() {
    qtyInputs.forEach(input => {
      const itemId = input.dataset.orderId;
      if (!itemId) return;
      input.value = String(normalizeQty(draft[itemId] || 0));
    });
  }

  function openDrawer() {
    if (!drawer || !drawerOverlay) return;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    drawerOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (!drawer || !drawerOverlay) return;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    drawerOverlay.hidden = true;
    document.body.style.overflow = '';
  }

  qtyInputs.forEach(input => {
    const itemId = input.dataset.orderId;
    if (!itemId) return;

    decorateQuickQtyInput(input);

    if (draft[itemId]) {
      input.value = normalizeQty(draft[itemId]);
    }

    const syncDraft = () => {
      const previousQty = normalizeQty(draft[itemId] || 0);
      const qty = normalizeQty(input.value);
      input.value = qty;
      if (qty === 0) {
        delete draft[itemId];
      } else {
        draft[itemId] = qty;
      }

      if (qty > previousQty) {
        const item = getItemById(itemId);
        const addedQty = qty - previousQty;
        if (item) showAddToast(item.name, addedQty);
      }

      saveOrderDraft(draft);
      refreshSummary();
    };

    input.addEventListener('input', syncDraft);
    input.addEventListener('change', syncDraft);
  });

  if (viewCartBtn) {
    viewCartBtn.addEventListener('click', openDrawer);
  }
  if (closeDrawerBtn) {
    closeDrawerBtn.addEventListener('click', closeDrawer);
  }
  if (drawerOverlay) {
    drawerOverlay.addEventListener('click', closeDrawer);
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDrawer();
  });

  syncQuickInputsFromDraft();
  refreshSummary();
}

function initSaltenasQuickOrder() {
  // Enhanced quick-order UX (sticky bar + drawer) handles Saltenas when present.
  if (document.getElementById('baked-view-cart')) return;

  const qtyInputs = [...document.querySelectorAll('.saltenas-quick-order .quick-qty-input[data-order-id]')];
  if (qtyInputs.length === 0) return;

  const draft = getOrderDraft();

  function normalizeQty(value) {
    const n = parseInt(value, 10);
    if (Number.isNaN(n) || n < 0) return 0;
    return Math.min(30, n);
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
      renderNavCartCount();
    };

    input.addEventListener('input', syncDraft);
    input.addEventListener('change', syncDraft);
  });

  renderNavCartCount();
}

function initCartPage() {
  const form = document.getElementById('cart-form');
  if (!form) return;

  const cartOpen = document.getElementById('cart-open');
  const cartClosed = document.getElementById('cart-closed');
  const cartEmpty = document.getElementById('cart-empty');
  const cartItemsEl = document.getElementById('cart-items');
  const cartInfoBar = document.querySelector('#cart-open .order-info-bar');
  const missingSelect = document.getElementById('missing-item-select');
  const missingQty = document.getElementById('missing-item-qty');
  const addMissingBtn = document.getElementById('add-missing-item');

  const s = getOrderStatus();
  if (s.status !== 'open') {
    if (cartOpen) cartOpen.classList.add('hidden');
    if (cartClosed) cartClosed.classList.remove('hidden');

    const msgEl = document.getElementById('closed-msg');
    if (msgEl) {
      if (s.status === 'closed') {
        const nextMsg = s.nextPickup ? ` Next pickup: ${fmt(s.nextPickup)}.` : '';
        msgEl.textContent = `Orders are closed for the ${fmt(s.pickup)} pickup.${nextMsg}`;
      } else {
        msgEl.textContent = 'No upcoming pickups scheduled. Follow us on Instagram for updates.';
      }
    }
    return;
  }

  const pdEl = document.getElementById('pickup-date-display');
  if (pdEl) pdEl.textContent = `${fmt(s.pickup)}, ${SITE_CONFIG.pickupWindow}`;
  const cdEl = document.getElementById('close-date-display');
  if (cdEl) cdEl.textContent = fmt(s.closeDate);

  function renderCartPickupInfoBar() {
    const cartType = getCartType();
    const hasSaltenas = cartType === 'saltenas' || cartType === 'mixed';

    if (cartInfoBar) {
      cartInfoBar.style.display = hasSaltenas ? 'block' : 'none';
    }

    renderBanner();
  }

  function renderMissingItemOptions() {
    if (!missingSelect) return;

    const draft = getOrderDraft();
    const selectedIds = new Set(
      Object.entries(draft)
        .filter(([, qty]) => (parseInt(qty, 10) || 0) > 0)
        .map(([itemId]) => itemId)
    );

    const availableItems = bakedGoodsItems.filter(item => !selectedIds.has(item.id));
    const previousValue = missingSelect.value;

    const defaultLabel = availableItems.length > 0
      ? 'Select a baked good to add'
      : 'All baked goods are already in your cart';

    missingSelect.innerHTML = `<option value="">${defaultLabel}</option>` + availableItems
      .map(item => `<option value="${item.id}">${item.name} — $${item.price.toFixed(2)}</option>`)
      .join('');

    if (availableItems.some(item => item.id === previousValue)) {
      missingSelect.value = previousValue;
    }

    if (addMissingBtn) addMissingBtn.disabled = availableItems.length === 0;
  }

  const bakedGoodsItems = getBakedGoodsItems();

  function renderPickupDateSection() {
    const cartType = getCartType();
    const pickupDateSection = document.getElementById('pickup-date-section');
    const saltenaNotice = document.getElementById('saltenas-pickup-notice');
    const bakedGoodsPicker = document.getElementById('baked-goods-date-picker');
    const dateInput = document.getElementById('pickup-date-select');
    const dateError = document.getElementById('pickup-date-error');
    const pickupDateField = document.getElementById('pickup-date');

    const clearDateError = () => {
      if (!dateError) return;
      dateError.classList.add('hidden');
    };

    const showDateError = () => {
      if (!dateError) return;
      dateError.classList.remove('hidden');
    };

    if (!pickupDateSection) return;

    if (cartType === 'empty') {
      pickupDateSection.style.display = 'none';
      if (pickupDateField) pickupDateField.value = '';
      return;
    }

    pickupDateSection.style.display = 'block';

    if (cartType === 'baked-goods') {
      // Show date picker for Baked Goods
      if (saltenaNotice) saltenaNotice.style.display = 'none';
      if (bakedGoodsPicker) bakedGoodsPicker.style.display = 'block';
      if (pickupDateField) pickupDateField.value = '';
      clearDateError();

      if (dateInput) {
        dateInput.min = getBakedGoodsMinPickupDateKey();

        if (!dateInput.dataset.bound) {
          const syncPickupDate = () => {
            if (!pickupDateField) return;

            if (!dateInput.value) {
              pickupDateField.value = '';
              clearDateError();
              return;
            }

            if (!isAllowedBakedGoodsPickupDate(dateInput.value)) {
              // On mobile, date inputs can emit intermediate values while the picker opens.
              // Avoid disruptive alerts here; submit-time validation will still enforce rules.
              pickupDateField.value = '';
              showDateError();
              return;
            }

            pickupDateField.value = dateInput.value;
            clearDateError();
          };

          dateInput.addEventListener('change', syncPickupDate);
          dateInput.dataset.bound = 'true';
        }
      }
    } else {
      // Show Salteñas notice for Salteñas or Mixed cart
      if (bakedGoodsPicker) bakedGoodsPicker.style.display = 'none';
      if (saltenaNotice) saltenaNotice.style.display = 'block';
      clearDateError();

      if (dateInput) {
        dateInput.value = '';
      }

      const nextSaltenaDate = getNextSaltenasPickupDate();
      const saltenaDateDisplay = document.getElementById('saltenas-next-date');
      if (saltenaDateDisplay && nextSaltenaDate) {
        const dateKey = toDateKey(nextSaltenaDate);
        saltenaDateDisplay.textContent = `Next available Saturday: ${fmt(nextSaltenaDate)}`;

        if (pickupDateField) {
          pickupDateField.value = dateKey;
        }
      }
    }
  }

  function renderCartItems() {
    const draft = getOrderDraft();
    const entries = Object.entries(draft)
      .map(([itemId, qty]) => ({ itemId, qty: parseInt(qty, 10) || 0 }))
      .filter(entry => entry.qty > 0)
      .map(entry => ({ ...entry, item: getItemById(entry.itemId) }))
      .filter(entry => !!entry.item);

    if (entries.length === 0) {
      if (cartItemsEl) cartItemsEl.innerHTML = '<p style="color: var(--muted);">No items selected yet.</p>';
      if (cartEmpty) cartEmpty.classList.remove('hidden');
      if (cartOpen) cartOpen.classList.add('hidden');
      updateTotal();
      renderNavCartCount();
      renderCartPickupInfoBar();
      return;
    }

    if (cartEmpty) cartEmpty.classList.add('hidden');
    if (cartOpen) cartOpen.classList.remove('hidden');

    if (cartItemsEl) {
      cartItemsEl.innerHTML = entries.map(({ item, qty }) => `
        <div class="item-row">
          <div class="item-info">
            <div class="item-name">${item.name}</div>
            <div class="item-desc">${item.desc}</div>
          </div>
          <div class="item-price-tag">$${item.price.toFixed(2)}</div>
          <div class="qty-wrap">
            <div class="qty-stepper qty-stepper-sm">
              <button type="button" class="qty-stepper-btn" data-cart-dec-id="${item.id}" aria-label="Decrease quantity for ${item.name}">-</button>
              <input
                type="number"
                class="qty-input form-group"
                name="${item.id}"
                id="qty-${item.id}"
                value="${qty}" min="0" max="30"
                data-price="${item.price}"
                data-name="${item.name}"
                aria-label="Quantity for ${item.name}"
              >
              <button type="button" class="qty-stepper-btn" data-cart-inc-id="${item.id}" aria-label="Increase quantity for ${item.name}">+</button>
            </div>
          </div>
        </div>
      `).join('');

      function bumpCartQtyInput(input, delta) {
        const current = Math.max(0, Math.min(30, parseInt(input.value, 10) || 0));
        const next = Math.max(0, Math.min(30, current + delta));
        if (next === current) return;
        input.value = String(next);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }

      cartItemsEl.querySelectorAll('[data-cart-dec-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const itemId = btn.dataset.cartDecId;
          if (!itemId) return;
          const input = cartItemsEl.querySelector(`#qty-${itemId}`);
          if (!input) return;
          bumpCartQtyInput(input, -1);
        });
      });

      cartItemsEl.querySelectorAll('[data-cart-inc-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const itemId = btn.dataset.cartIncId;
          if (!itemId) return;
          const input = cartItemsEl.querySelector(`#qty-${itemId}`);
          if (!input) return;
          bumpCartQtyInput(input, 1);
        });
      });

      cartItemsEl.querySelectorAll('.qty-input').forEach(input => {
        const sync = () => {
          const nextDraft = getOrderDraft();
          const nextQty = Math.max(0, Math.min(30, parseInt(input.value, 10) || 0));
          input.value = String(nextQty);
          if (nextQty === 0) {
            delete nextDraft[input.name];
          } else {
            nextDraft[input.name] = nextQty;
          }
          saveOrderDraft(nextDraft);
          renderNavCartCount();
          updateTotal();
          renderPickupDateSection();

          if (nextQty === 0) {
            renderCartItems();
          }
        };

        input.addEventListener('input', sync);
        input.addEventListener('change', sync);
      });
    }

    renderPickupDateSection();
    renderMissingItemOptions();
    renderCartPickupInfoBar();
    updateTotal();
    renderNavCartCount();
  }

  if (addMissingBtn && missingSelect && missingQty) {
    addMissingBtn.addEventListener('click', () => {
      const itemId = missingSelect.value;
      const qtyToAdd = Math.max(1, Math.min(30, parseInt(missingQty.value, 10) || 1));
      if (!itemId) return;

      const draft = getOrderDraft();
      const current = parseInt(draft[itemId], 10) || 0;
      draft[itemId] = Math.min(30, current + qtyToAdd);
      saveOrderDraft(draft);
      missingQty.value = '1';
      renderCartItems();
    });
  }

  renderCartItems();
  form.addEventListener('submit', handleOrderSubmit);
}

function handleOrderSubmit(e) {
  e.preventDefault();

  // Validate pickup date for Baked Goods orders
  const cartType = getCartType();
  const pickupDateSelect = document.getElementById('pickup-date-select');
  const pickupDateError = document.getElementById('pickup-date-error');
  const pickupDateField = document.getElementById('pickup-date');
  
  if (cartType === 'baked-goods') {
    const selectedDate = pickupDateSelect?.value || '';
    const selectedFieldDate = pickupDateField?.value || '';
    const availability = getBakedGoodsDateAvailability(selectedDate);
    const validDate = selectedDate && availability.allowed;

    if (!selectedDate || !selectedFieldDate || !validDate) {
      if (pickupDateError) pickupDateError.classList.remove('hidden');
      alert(availability.message || 'That pickup date is unavailable. Please choose another date.');
      return;
    }
  }

  // Build order summary
  const lines = [];
  document.querySelectorAll('.qty-input').forEach(inp => {
    const qty = parseInt(inp.value) || 0;
    if (qty > 0) lines.push(`${qty}× ${inp.dataset.name}`);
  });
  if (lines.length === 0) return;

  // Add pickup date to summary
  let summary = lines.join(', ') + ` | Total: ${document.getElementById('order-total-amount')?.textContent || ''}`;
  const pickupDate = pickupDateField?.value || '';
  if (pickupDate) {
    const d = parseDate(pickupDate);
    summary += ` | Pickup: ${fmt(d)}`;
  }

  // Write summary into hidden field so Netlify Forms captures it
  const summaryField = document.getElementById('order-details');
  if (summaryField) {
    summaryField.value = summary;
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
      renderNavCartCount();
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

// ── Homepage Instagram Local Media Grid ───────────────────
async function initInstagramLocalFeed() {
  const feedEl = document.getElementById('insta-feed');
  if (!feedEl) return;

  const slotNames = ['insta-1', 'insta-2', 'insta-3', 'insta-4', 'insta-5', 'insta-6'];
  const imageExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  const videoExts = ['mp4', 'webm', 'mov'];

  const allCandidates = [
    ...videoExts.map(ext => ({ ext, type: 'video' })),
    ...imageExts.map(ext => ({ ext, type: 'image' })),
  ];

  const cacheBuster = `v=${Date.now()}`;

  const canLoadImage = (url) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });

  const canLoadVideo = (url) => new Promise(resolve => {
    const video = document.createElement('video');
    const cleanup = () => {
      video.removeAttribute('src');
      video.load();
    };

    const timer = window.setTimeout(() => {
      cleanup();
      resolve(false);
    }, 3500);

    video.onloadeddata = () => {
      window.clearTimeout(timer);
      cleanup();
      resolve(true);
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      cleanup();
      resolve(false);
    };

    video.preload = 'metadata';
    video.src = url;
    video.load();
  });

  const findFirstMediaForSlot = async (slotName) => {
    for (const candidate of allCandidates) {
      const path = `Images/${slotName}.${candidate.ext}`;
      const testUrl = `${path}?${cacheBuster}`;
      const isLoadable = candidate.type === 'video'
        ? await canLoadVideo(testUrl)
        : await canLoadImage(testUrl);

      if (isLoadable) {
        return {
          path,
          type: candidate.type,
          slotName,
        };
      }
    }
    return null;
  };

  const createPlaceholder = () => {
    const placeholder = document.createElement('div');
    placeholder.className = 'insta-item';
    placeholder.setAttribute('aria-label', 'Upload a media file to this slot');
    placeholder.textContent = '📸';
    return placeholder;
  };

  const createMediaCard = (media) => {
    const item = document.createElement('a');
    item.className = `insta-item${media.type === 'video' ? ' is-video' : ''}`;
    item.href = 'https://instagram.com/YapaPatisserie';
    item.target = '_blank';
    item.rel = 'noopener noreferrer';
    item.setAttribute('aria-label', `Open ${media.slotName} on Instagram profile`);

    if (media.type === 'video') {
      const video = document.createElement('video');
      video.src = `${media.path}?${cacheBuster}`;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.autoplay = true;
      video.preload = 'metadata';
      item.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = `${media.path}?${cacheBuster}`;
      img.alt = `Yapa Instagram post ${media.slotName}`;
      item.appendChild(img);
    }

    return item;
  };

  const mediaItems = await Promise.all(slotNames.map(findFirstMediaForSlot));
  feedEl.innerHTML = '';

  mediaItems.forEach(media => {
    feedEl.appendChild(media ? createMediaCard(media) : createPlaceholder());
  });
}

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderBanner();
  renderCallout();
  renderOpenPickupStatus();
  initNav();
  initBakedGoodsQuickOrder();
  initSaltenasQuickOrder();
  initCartPage();
  initOrderForm();
  initFAQ();
  initInstagramLocalFeed();
});
