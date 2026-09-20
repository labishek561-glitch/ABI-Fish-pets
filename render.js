import { State } from './state.js';
import { $, $$, esc, npr, placeholderArt, attachGlow } from './utils.js';

let handlers = {
  addToCart: () => {},
  toggleWishlist: () => {},
  view3D: () => {},
  viewDetail: () => {}
};
export function setActionHandlers(h) { handlers = { ...handlers, ...h }; }

/* ---------- helpers ---------- */
export function normalizedCategory(p) {
  return (p.type || p.category || 'Fish');
}
export function normalizedImage(p) {
  return p.imageUrl || p.image || placeholderArt(p.id + '|' + (p.name || ''));
}
function availabilityPill(p) {
  const inStock = p.availability !== false && p.status !== 'out_of_stock';
  return inStock ? `<span class="pill good">In stock</span>` : `<span class="pill hard">Out of stock</span>`;
}
function carePill(level) {
  if (!level) return '';
  const cls = level === 'Beginner' ? 'good' : level === 'Medium' ? 'mid' : 'hard';
  return `<span class="pill ${cls}">${esc(level)} care</span>`;
}

/* ---------- card ---------- */
export function productCard(p) {
  const liked = !!State.wishlistData[p.id];
  const cat = normalizedCategory(p);
  const img = normalizedImage(p);
  const placeholder = placeholderArt(p.id + '|' + (p.name || ''));
  return `<article class="card p-card reveal" data-id="${p.id}">
    <div class="p-media">
      <img src="${esc(img)}" alt="${esc(p.name || 'Fish')} — ABI Fish Pets"
           loading="lazy" data-ph="${esc(placeholder)}" />
      <span class="glow"></span>
      <div class="p-badges">
        <span class="badge badge-3d">● 3D</span>
        ${p.live ? '<span class="badge badge-live">Live</span>' : ''}
        ${(p.availability === false || p.status === 'out_of_stock') ? '<span class="badge badge-out">Sold out</span>' : ''}
      </div>
      <button class="wish ${liked ? 'on' : ''}" data-wish="${p.id}" aria-label="${liked ? 'Remove from' : 'Add to'} wishlist" aria-pressed="${liked}">
        <svg viewBox="0 0 24 24" fill="${liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20s-7-4.6-7-9.4A4.1 4.1 0 0 1 12 7.7a4.1 4.1 0 0 1 7 3.9c0 4.8-7 8.4-7 8.4z"/></svg>
      </button>
    </div>
    <div class="p-body">
      <h3 class="p-name">${esc(p.name || 'Unnamed Fish')}</h3>
      <p class="p-sci">${esc(cat)}${p.breed ? ' · ' + esc(p.breed) : ''}</p>
      <div class="p-specs">
        ${carePill(p.careLevel)}
        ${p.size ? `<span class="pill">${esc(p.size)}</span>` : ''}
        ${p.age ? `<span class="pill">${esc(p.age)} mo</span>` : ''}
        ${availabilityPill(p)}
      </div>
      <div class="p-price">${npr(p.price || 0)}</div>
      <div class="p-actions">
        <button class="btn btn-primary" data-add="${p.id}">Add to Cart</button>
        <button class="btn btn-ghost" data-view3d="${p.id}" aria-label="View ${esc(p.name)} in 3D">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5M12 22V12"/></svg>
        </button>
      </div>
      <button class="btn btn-ghost btn-sm" data-detail="${p.id}" style="width:100%">View Details</button>
    </div>
  </article>`;
}

/* ---------- wire card interactions + image fallback ---------- */
export function wireCards(root) {
  root.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); handlers.addToCart(b.dataset.add);
  }));
  root.querySelectorAll('[data-wish]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); handlers.toggleWishlist(b.dataset.wish);
  }));
  root.querySelectorAll('[data-view3d]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); handlers.view3D(b.dataset.view3d);
  }));
  root.querySelectorAll('[data-detail]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); handlers.viewDetail(b.dataset.detail);
  }));
  root.querySelectorAll('.p-card').forEach(c => {
    c.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      handlers.viewDetail(c.dataset.id);
    });
    attachGlow(c);
  });
  root.querySelectorAll('img[data-ph]').forEach(img => {
    img.addEventListener('error', () => {
      if (img.dataset.fixed) return;
      img.dataset.fixed = '1';
      img.src = img.dataset.ph;
    });
  });
}

/* ---------- reveal observer (self-contained) ---------- */
let revealObserver;
export function observeReveals(root = document) {
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealObserver.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .06 });
  }
  root.querySelectorAll('.reveal:not(.in)').forEach(el => revealObserver.observe(el));
}

/* ---------- filter state helper ---------- */
export function applyFilterState() {
  const F = State.filters;
  let list = State.allProducts.slice();
  if (F.q) {
    const q = F.q.toLowerCase();
    list = list.filter(p =>
      String(p.name || '').toLowerCase().includes(q) ||
      String(p.type || '').toLowerCase().includes(q) ||
      String(p.category || '').toLowerCase().includes(q) ||
      String(p.breed || '').toLowerCase().includes(q) ||
      String(p.careLevel || '').toLowerCase().includes(q) ||
      String(p.size || '').toLowerCase().includes(q) ||
      String(p.description || '').toLowerCase().includes(q) ||
      String(p.price || '').includes(q));
  }
  if (F.cat !== 'All') list = list.filter(p => normalizedCategory(p) === F.cat);
  if (F.care) list = list.filter(p => p.careLevel === F.care);
  if (F.size === 'small')  list = list.filter(p => parseFloat(p.size || p.sizeCm || 0) < 3 || (p.size && /(1|2|3)-?\s*(inch)/i.test(p.size)));
  if (F.size === 'medium') list = list.filter(p => { const s = parseFloat(p.size || 0); return s >= 3 && s <= 5; });
  if (F.size === 'large')  list = list.filter(p => { const s = parseFloat(p.size || 0); return s > 5; });
  list = list.filter(p => Number(p.price || 0) <= F.max);
  if (F.avail) list = list.filter(p => p.availability !== false && p.status !== 'out_of_stock');
  if (F.beg)   list = list.filter(p => p.careLevel === 'Beginner');

  switch (F.sort) {
    case 'low':  list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0)); break;
    case 'high': list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0)); break;
    case 'az':   list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))); break;
    default:     list.sort((a, b) => Number(b.createdAt || b.updatedAt || 0) - Number(a.createdAt || a.updatedAt || 0));
  }
  return list;
}

/* ---------- categories / chips ---------- */
export function computeCategories() {
  const set = new Set();
  State.allProducts.forEach(p => set.add(normalizedCategory(p)));
  State.knownCategories = ['All', ...set];
}

export function renderCatChips() {
  computeCategories();
  const host = $('#catChips');
  if (!host) return;
  host.innerHTML = State.knownCategories.map(c =>
    `<button class="chip ${State.filters.cat === c ? 'on' : ''}" data-cat="${c}">${c === 'All' ? '🐟 All Fish' : esc(c)}</button>`).join('');
  host.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => {
    State.filters.cat = b.dataset.cat;
    renderCatChips(); renderCatalog();
  }));
const fcat = $('#fCat');
  if (fcat) fcat.innerHTML = ['<option value="">All categories</option>',
    ...State.knownCategories.filter(c => c !== 'All').map(c => `<option value="${esc(c)}">${esc(c)}</option>`)].join('');
}

/* ---------- catalog ---------- */
export function renderCatalog() {
  const list = applyFilterState();
  const grid = $('#catalogGrid');
  if (!grid) return;
  grid.innerHTML = list.length
    ? list.map(productCard).join('')
    : `<div class="empty" style="grid-column:1/-1">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
         <h4>${State.allProducts.length ? 'No fish match your filters' : 'Loading live stock…'}</h4>
         <p>${State.allProducts.length ? 'Try widening the price range or clearing filters.' : 'Waiting for the seller panel to publish listings.'}</p>
       </div>`;
  wireCards(grid);
  observeReveals(grid);
  const rc = $('#resultCount');
  if (rc) rc.textContent = `${list.length} of ${State.allProducts.length} live listings`;
  const active = [State.filters.care, State.filters.size, State.filters.avail, State.filters.beg, State.filters.max < 20000].filter(Boolean).length;
  const fc = $('#filterCount');
  if (fc) { fc.hidden = active === 0; fc.textContent = active; }
}

/* ---------- featured ---------- */
export function renderFeatured() {
  const grid = $('#featuredGrid');
  if (!grid) return;
  const list = State.allProducts.slice(0, 8);
  grid.innerHTML = list.length
    ? list.map(productCard).join('')
    : `<p style="color:var(--muted);grid-column:1/-1;padding:20px 0">Waiting for listings from Firebase…</p>`;
  wireCards(grid);
  observeReveals(grid);
}

/* ---------- showroom grid ---------- */
export function renderShowroomGrid() {
  const cats = State.knownCategories.filter(c => c !== 'All');
  const tabsHost = $('#showroomTabs');
  if (!tabsHost) return;
  if (!cats.length) { tabsHost.innerHTML = ''; return; }
  if (!State.showroomCat || !cats.includes(State.showroomCat)) State.showroomCat = cats[0];
  tabsHost.innerHTML = cats.map(c =>
    `<button class="tab ${State.showroomCat === c ? 'on' : ''}" role="tab" aria-selected="${State.showroomCat === c}" data-scat="${esc(c)}">${esc(c)}</button>`).join('');
  tabsHost.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
    State.showroomCat = b.dataset.scat;
    renderShowroomGrid();
    import('./three-scene.js').then(m => {
      const p = State.allProducts.find(x => normalizedCategory(x) === State.showroomCat);
      if (p && m.Aquarium3D.showroom) m.Aquarium3D.showroom.setShowroomProduct(p);
    });
  }));

  const list = State.allProducts.filter(p => normalizedCategory(p) === State.showroomCat);
  const grid = $('#showroomGrid');
  grid.innerHTML = list.length ? list.map(productCard).join('')
    : `<p style="color:var(--muted);grid-column:1/-1">No listings in this category yet.</p>`;
  wireCards(grid);
  observeReveals(grid);

  const hero = list[0];
  const infoEl = $('#showroomInfo');
  if (hero && infoEl) {
    infoEl.textContent = `${hero.name} · ${npr(hero.price)}${hero.breed ? ' · ' + hero.breed : ''}`;
    const tag = $('#showroomTag');
    if (tag) tag.textContent = `${State.showroomCat.toUpperCase()} · LIVE 3D`;
  } else if (infoEl) {
    infoEl.textContent = 'No live products yet — sellers can add them via the seller panel.';
  }
}

/* ---------- cart ---------- */
export function renderCart(onUpdate) {
  const body = $('#cartBody'), foot = $('#cartFootArea');
  if (!body || !foot) return;
  const ids = Object.keys(State.cartData);
  const totalQty = ids.reduce((s, id) => s + (State.cartData[id].quantity || 0), 0);
  const cc = $('#cartCount');
  cc.textContent = totalQty;
  cc.classList.toggle('on', totalQty > 0);
  const hc = $('#cartHeadCount');
  if (hc) hc.textContent = totalQty ? `(${totalQty})` : '';

  if (!ids.length) {
    body.innerHTML = `<div class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h2l1.6 9.2a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 2-1.6L20 9H6.6"/><circle cx="10" cy="20" r="1.4"/><circle cx="17.5" cy="20" r="1.4"/></svg>
      <h4>Your cart is empty</h4><p>Add a fish and it will appear here.</p></div>`;
    foot.innerHTML = `<button class="btn btn-ghost btn-block" data-nav="fish">Browse fish</button>`;
    if (onUpdate) onUpdate();
    return;
  }

  let subtotal = 0;
  body.innerHTML = ids.map(id => {
    const p = State.allProducts.find(x => x.id === id);
    if (!p) return '';
    const q = State.cartData[id].quantity || 1;
    const price = Number(p.price || 0);
    subtotal += price * q;
    const img = normalizedImage(p);
    const placeholder = placeholderArt(p.id + '|' + p.name);
    return `<div class="row">
      <img src="${esc(img)}" alt="${esc(p.name)}" data-ph="${esc(placeholder)}" />
      <div class="info">
        <h4>${esc(p.name)}</h4>
        <p>${esc(normalizedCategory(p))}</p>
        <div class="pr">${npr(price * q)}</div>
        <div class="qty">
          <button data-dec="${p.id}" aria-label="Decrease quantity">−</button>
          <span>${q}</span>
          <button data-inc="${p.id}" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <button class="tiny-x" data-del="${p.id}" aria-label="Remove">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>`;
  }).join('');

  const ship = subtotal > 5000 ? 0 : 350;
  foot.innerHTML = `
    <div class="sum-row"><span>Subtotal</span><span>${npr(subtotal)}</span></div>
    <div class="sum-row"><span>Delivery</span><span>${ship === 0 ? 'Free' : npr(ship)}</span></div>
    <div class="sum-row total"><span>Total</span><span>${npr(subtotal + ship)}</span></div>
    <button class="btn btn-primary btn-block" id="goCheckout">Proceed to Checkout</button>
    <button class="btn btn-ghost btn-block btn-sm" id="clearCartBtn">Clear cart</button>`;

  body.querySelectorAll('img[data-ph]').forEach(img => {
    img.addEventListener('error', () => {
      if (img.dataset.fixed) return;
      img.dataset.fixed = '1';
      img.src = img.dataset.ph;
    });
  });
  body.querySelectorAll('[data-inc]').forEach(b => b.onclick = () => onUpdate && onUpdate('inc', b.dataset.inc));
  body.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => onUpdate && onUpdate('dec', b.dataset.dec));
  body.querySelectorAll('[data-del]').forEach(b => b.onclick = () => onUpdate && onUpdate('del', b.dataset.del));
  const gc = $('#goCheckout'); if (gc) gc.onclick = () => onUpdate && onUpdate('checkout');
  const ccBtn = $('#clearCartBtn'); if (ccBtn) ccBtn.onclick = () => onUpdate && onUpdate('clear');
}

/* ---------- wishlist ---------- */
export function renderWishlist(onUpdate) {
  const body = $('#wishBody'), foot = $('#wishFootArea');
  if (!body || !foot) return;
  const ids = Object.keys(State.wishlistData);
  const wc = $('#wishCount');
  wc.textContent = ids.length;
  wc.classList.toggle('on', ids.length > 0);
  const hc = $('#wishHeadCount');
  if (hc) hc.textContent = ids.length ? `(${ids.length})` : '';

  if (!ids.length) {
    body.innerHTML = `<div class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 20s-7-4.6-7-9.4A4.1 4.1 0 0 1 12 7.7a4.1 4.1 0 0 1 7 3.9c0 4.8-7 8.4-7 8.4z"/></svg>
      <h4>No saved fish yet</h4><p>Tap the heart on any fish to save it here.</p></div>`;
    foot.innerHTML = `<button class="btn btn-ghost btn-block" data-nav="fish">Find a fish</button>`;
    if (onUpdate) onUpdate();
    return;
  }

  body.innerHTML = ids.map(id => {
    const p = State.allProducts.find(x => x.id === id);
    if (!p) return '';
    const img = normalizedImage(p);
    const placeholder = placeholderArt(p.id + '|' + p.name);
    return `<div class="row">
      <img src="${esc(img)}" alt="${esc(p.name)}" data-ph="${esc(placeholder)}" />
      <div class="info">
        <h4>${esc(p.name)}</h4>
        <p>${esc(normalizedCategory(p))}${p.careLevel ? ' · ' + esc(p.careLevel) : ''}</p>
        <div class="pr">${npr(p.price || 0)}</div>
        <button class="btn btn-primary btn-sm" data-w2c="${p.id}" style="margin-top:8px">Add to Cart</button>
      </div>
      <button class="tiny-x" data-wdel="${p.id}" aria-label="Remove">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>`;
  }).join('');

  foot.innerHTML = `<button class="btn btn-ghost btn-block btn-sm" id="clearWishBtn">Clear wishlist</button>`;
  body.querySelectorAll('img[data-ph]').forEach(img => {
    img.addEventListener('error', () => {
      if (img.dataset.fixed) return;
      img.dataset.fixed = '1';
      img.src = img.dataset.ph;
    });
  });
  body.querySelectorAll('[data-w2c]').forEach(b => b.onclick = () => onUpdate && onUpdate('add-cart', b.dataset.w2c));
  body.querySelectorAll('[data-wdel]').forEach(b => b.onclick = () => onUpdate && onUpdate('toggle', b.dataset.wdel));
  const cw = $('#clearWishBtn'); if (cw) cw.onclick = () => onUpdate && onUpdate('clear');
    }

