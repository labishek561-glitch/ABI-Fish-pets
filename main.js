import { State, Events } from './state.js';
import { $, $$, esc, npr, placeholderArt, storage, toast,
         attachRipple, attachMagnet, bubbleBurst } from './utils.js';
import {
  login, register, logout, setupListeners,
  addToCart, updateCartQty, removeFromCart, clearCart,
  toggleWishlist, clearWishlist, placeOrder
} from './firebase.js';
import { initThree, refreshThreeFishes, open3DViewer, Aquarium3D, detectQuality } from './three-scene.js';
import {
  setActionHandlers, productCard, wireCards, observeReveals, renderCatalog, renderFeatured,
  renderCatChips, renderShowroomGrid, renderCart, renderWishlist, applyFilterState
} from './render.js';
import {
  renderCare, renderDelivery, renderCompare, calc, renderOrders, initCounters
} from './section.js';

/* ---------- drawers / modals ---------- */
const scrim = $('#scrim');
let openDrawerEl = null;

export function openDrawer(id) {
  closeDrawers(false);
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
  scrim.classList.add('on');
  document.body.classList.add('locked');
  openDrawerEl = el;
  const first = el.querySelector('button, a, input');
  if (first) setTimeout(() => first.focus(), 260);
}
export function closeDrawers(release = true) {
  $$('.drawer-side').forEach(d => { d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); });
  if (release) { scrim.classList.remove('on'); document.body.classList.remove('locked'); openDrawerEl = null; }
}
scrim.addEventListener('click', () => { closeDrawers(); closeModals(); });
$$('[data-close]').forEach(b => b.addEventListener('click', () => closeDrawers()));

export function openModalEl(el) {
  el.classList.add('on'); el.setAttribute('aria-hidden', 'false');
  document.body.classList.add('locked');
}
export function closeModals() {
  $$('.modal').forEach(m => { m.classList.remove('on'); m.setAttribute('aria-hidden', 'true'); });
  document.body.classList.remove('locked');
  if (Aquarium3D.viewer) Aquarium3D.viewer.stop();
}
$('#modalClose').addEventListener('click', closeModals);
$$('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) closeModals(); }));
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModals(); closeDrawers(); closeMobileMenu(); } });

export function openGeneric(title, sub, html) {
  $('#modalTitle').textContent = title;
  $('#modalSub').textContent = sub || '';
  $('#modalContent').innerHTML = html;
  $('#modalBox').className = 'modal-box';
  openModalEl($('#modal'));
  wireNav($('#modalContent'));
}

/* ---------- navigation ---------- */
export function wireNav(root = document) {
  root.querySelectorAll('[data-nav]').forEach(el => {
    if (el.__navWired) return; el.__navWired = true;
    el.addEventListener('click', e => { e.preventDefault(); goSection(el.dataset.nav); });
  });
}
export function goSection(id) {
  const target = document.getElementById(id);
  if (!target) return;
  const r = target.getBoundingClientRect();
  bubbleBurst(r.left + r.width / 2, Math.max(40, r.top + 40), 10);
  const veil = $('#veil');
  veil.classList.add('on');
  closeMobileMenu(); closeDrawers(); closeModals();
  setTimeout(() => {
    const y = target.getBoundingClientRect().top + window.pageYOffset - 66;
    window.scrollTo({ top: y, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, 190);
  setTimeout(() => veil.classList.remove('on'), 620);
}
wireNav(document);

/* ---------- mobile menu ---------- */
function openMobileMenu() {
  $('#mobileMenu').classList.add('open'); $('#mobileMenu').setAttribute('aria-hidden', 'false');
  $('#burger').classList.add('open'); $('#burger').setAttribute('aria-expanded', 'true');
  document.body.classList.add('locked');
  $$('#mobileMenu a').forEach((a, i) => a.style.animationDelay = (0.05 + i * 0.05) + 's');
}
function closeMobileMenu() {
  $('#mobileMenu').classList.remove('open'); $('#mobileMenu').setAttribute('aria-hidden', 'true');
  $('#burger').classList.remove('open'); $('#burger').setAttribute('aria-expanded', 'false');
  if (!openDrawerEl && !$('.modal.on')) document.body.classList.remove('locked');
}
$('#burger').addEventListener('click', () => {
  $('#mobileMenu').classList.contains('open') ? closeMobileMenu() : openMobileMenu();
});

/* ---------- scroll bar + progress ---------- */
const navLinks = $$('.nav-links a[data-nav]');
function onScroll() {
  const y = window.pageYOffset;
  $('#nav').classList.toggle('scrolled', y > 40);
  const h = document.documentElement.scrollHeight - window.innerHeight;
  $('#progress').style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
  let current = 'hero';
  $$('main section[id]').forEach(s => { if (s.getBoundingClientRect().top <= 140) current = s.id; });
  navLinks.forEach(a => a.classList.toggle('active', a.dataset.nav === current));
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- theme ---------- */
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  storage.set('abi_theme', t);
}
$('#themeToggle').addEventListener('click', () => {
  setTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
});

/* ---------- performance mode ---------- */
let perfMode = storage.get('abi_perf', false);
function setPerf(on, silent) {
  perfMode = on;
  storage.set('abi_perf', on);
  ['#perfState', '#perfStateMobile', '#perfStateFoot'].forEach(s => { const el = $(s); if (el) el.textContent = on ? 'ON' : 'OFF'; });
  const q = on ? 'low' : detectQuality();
  if (Aquarium3D.hero) Aquarium3D.hero.applyQuality(q);
  if (Aquarium3D.showroom) Aquarium3D.showroom.applyQuality(q);
  if (!silent) toast('Performance mode ' + (on ? 'enabled' : 'disabled'),
    on ? 'Reduced particles for smoother mobile use.' : 'Full visual quality restored.', 'info');
}
['#perfPill', '#perfToggleMobile', '#perfToggleFoot'].forEach(s => $(s)?.addEventListener('click', () => setPerf(!perfMode)));

/* ---------- product detail modal ---------- */
export function openProductDetail(productId) {
  const p = State.allProducts.find(x => x.id === productId);
  if (!p) return;
  const liked = !!State.wishlistData[p.id];
  const img = p.imageUrl || p.image || placeholderArt(p.id + '|' + p.name);
  const cat = p.type || p.category || 'Fish';
  const placeholder = placeholderArt(p.id + '|' + p.name);

  $('#modalTitle').textContent = p.name || 'Fish';
  $('#modalSub').textContent = `${cat}${p.breed ? ' · ' + p.breed : ''}`;
  $('#modalBox').className = 'modal-box full';
  $('#modalContent').innerHTML = `
    <div class="two-col">
      <div>
        <div class="detail-img" style="position:relative">
          <img src="${esc(img)}" alt="${esc(p.name)}" data-ph="${esc(placeholder)}"
               style="width:100%;aspect-ratio:1/1;object-fit:cover" />
          <span class="badge badge-3d" style="position:absolute;top:12px;left:12px">● 3D READY</span>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" id="dAdd" ${p.availability === false ? 'disabled style="opacity:.5"' : ''}>Add to Cart</button>
          <button class="btn btn-ghost" id="d3D">View in 3D</button>
          <button class="btn btn-ghost" id="dWish">${liked ? '❤️ Saved' : '🤍 Add to Wishlist'}</button>
        </div>
      </div>
      <div>
        <div class="p-price" style="margin-top:0;font-size:1.7rem">${npr(p.price || 0)}</div>
        <p style="color:var(--text-2);font-size:.9rem;margin:12px 0 18px">${esc(p.description || 'No description provided by the seller.')}</p>
        <div class="spec-grid">
          ${p.size ? `<div class="spec"><small>Size</small><b>${esc(p.size)}</b></div>` : ''}
          ${p.age ? `<div class="spec"><small>Age</small><b>${esc(p.age)} months</b></div>` : ''}
          ${p.weight ? `<div class="spec"><small>Weight</small><b>${esc(p.weight)} kg</b></div>` : ''}
          ${p.vaccination ? `<div class="spec"><small>Vaccination</small><b>${esc(p.vaccination)}</b></div>` : ''}
          ${p.careLevel ? `<div class="spec"><small>Care level</small><b>${esc(p.careLevel)}</b></div>` : ''}
          ${p.temperature ? `<div class="spec"><small>Temperature</small><b>${esc(p.temperature)}</b></div>` : ''}
          <div class="spec"><small>Availability</small><b style="color:${p.availability === false ? 'var(--coral)' : 'var(--green)'}">${p.availability === false ? 'Out of stock' : 'In stock'}</b></div>
          <div class="spec"><small>Category</small><b>${esc(cat)}</b></div>
        </div>
        <div style="margin-top:18px;padding:14px 16px;border-radius:14px;background:rgba(34,211,238,.07);border:1px solid var(--line)">
          <b style="font-size:.85rem">Included with every order</b>
          <p style="font-size:.8rem;color:var(--text-2);margin-top:6px">Acclimation guide · oxygen-packed bag · insulated box · live arrival guarantee.</p>
        </div>
      </div>
    </div>`;
  openModalEl($('#modal'));
  const img_el = $('#modalContent').querySelector('img[data-ph]');
  if (img_el) img_el.onerror = () => { img_el.dataset.fixed = '1'; img_el.src = img_el.dataset.ph; };
  $('#dAdd').onclick = () => addToCart(p.id);
  $('#d3D').onclick = () => open3DViewer(p.id);
  $('#dWish').onclick = () => { toggleWishlist(p.id); openProductDetail(p.id); };
}
/* ---------- auth modal ---------- */
let authMode = 'login';
export function openAuthModal() {
  $('#modalTitle').textContent = authMode === 'login' ? '🔐 Login' : '🔐 Register';
  $('#modalSub').textContent = authMode === 'login' ? 'Access your ABI Fish Pets account' : 'Create a new account';
  $('#modalBox').className = 'modal-box';
  $('#modalContent').innerHTML = `
    <form id="authForm">
      <div style="display:grid;gap:14px">
        <div><label class="lbl" for="authEmail">Email</label><input class="inp" type="email" id="authEmail" placeholder="email@example.com" required /></div>
        <div><label class="lbl" for="authPassword">Password</label><input class="inp" type="password" id="authPassword" placeholder="••••••••" required /></div>
        ${authMode === 'register' ? `<div><label class="lbl" for="authConfirm">Confirm Password</label><input class="inp" type="password" id="authConfirm" placeholder="••••••••" required /></div>` : ''}
        <button type="submit" class="btn btn-primary btn-block" id="authSubmit">${authMode === 'login' ? 'Login' : 'Create Account'}</button>
        <div id="authMsg" style="display:none;padding:10px 14px;border-radius:12px;font-size:.85rem"></div>
      </div>
    </form>
    <div style="text-align:center;margin-top:16px;padding-top:14px;border-top:1px solid var(--line);font-size:.9rem;color:var(--text-2)">
      ${authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
      <a id="authToggleLink" style="color:var(--cyan);font-weight:600;cursor:pointer">${authMode === 'login' ? 'Register' : 'Login'}</a>
    </div>`;
  openModalEl($('#modal'));
  $('#authToggleLink').addEventListener('click', () => { authMode = authMode === 'login' ? 'register' : 'login'; openAuthModal(); });
  $('#authForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('#authEmail').value.trim();
    const password = $('#authPassword').value;
    const msg = $('#authMsg');
    msg.style.display = 'none';
    const btn = $('#authSubmit');
    btn.disabled = true; btn.textContent = 'Processing…';
    try {
      if (authMode === 'login') {
        await login(email, password);
        toast('Welcome!', 'Login successful.', 'ok');
        closeModals();
      } else {
        const confirm = $('#authConfirm').value;
        if (password !== confirm) throw new Error('Passwords do not match.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        await register(email, password);
        toast('Welcome!', 'Account created successfully.', 'ok');
        closeModals();
      }
    } catch (err) {
      msg.style.display = 'block';
      msg.style.background = 'rgba(239,68,68,.08)';
      msg.style.color = 'var(--coral)';
      msg.style.border = '1px solid rgba(239,68,68,.18)';
      msg.textContent = err.message || 'Authentication failed.';
    } finally {
      btn.disabled = false;
      btn.textContent = authMode === 'login' ? 'Login' : 'Create Account';
    }
  });
}
async function handleLogout() {
  await logout();
  toast('Logged out', 'See you soon!', 'info');
  goSection('hero');
}

          /* ---------- checkout modal ---------- */
function openCheckout() {
  if (!State.currentUser) { toast('Please login', 'Login to place an order.', 'warn'); openAuthModal(); return; }
  const ids = Object.keys(State.cartData);
  if (!ids.length) { toast('Cart empty', 'Add fish before checkout.', 'warn'); return; }
  closeDrawers();

  let subtotal = 0;
  const lines = ids.map(id => {
    const p = State.allProducts.find(x => x.id === id);
    if (!p) return '';
    const q = State.cartData[id].quantity || 1;
    subtotal += Number(p.price || 0) * q;
    return `<div class="sum-row"><span>${esc(p.name)} × ${q}</span><span>${npr(Number(p.price || 0) * q)}</span></div>`;
  }).join('');
  const ship = subtotal > 5000 ? 0 : 350;

  $('#modalTitle').textContent = 'Checkout';
  $('#modalSub').textContent = 'Demo checkout — order saved to Firebase';
  $('#modalBox').className = 'modal-box wide';
  $('#modalContent').innerHTML = `
    <form id="checkoutForm" novalidate>
      <div class="two-col">
        <div style="display:grid;gap:14px">
          <div><label class="lbl" for="ckName">Full name</label><input class="inp" id="ckName" required placeholder="Your full name" /></div>
          <div><label class="lbl" for="ckPhone">Mobile number</label><input class="inp" id="ckPhone" required inputmode="numeric" placeholder="98XXXXXXXX" /></div>
          <div><label class="lbl" for="ckAddr">Full address</label><textarea class="inp" id="ckAddr" required placeholder="Ward, street, landmark"></textarea></div>
        </div>
        <div>
          <div class="card" style="padding:18px">
            <h3 style="font-size:.95rem;margin-bottom:12px">Order summary</h3>
            ${lines}
            <div class="sum-row"><span>Delivery</span><span>${ship === 0 ? 'Free' : npr(ship)}</span></div>
            <div class="sum-row total"><span>Total</span><span>${npr(subtotal + ship)}</span></div>
          </div>
          <button class="btn btn-primary btn-block" type="submit" style="margin-top:16px">Place Order</button>
          <p style="font-size:.72rem;color:var(--muted);margin-top:12px">Your order is written to <code>orders/${State.currentUser.uid}</code> in Firebase.</p>
        </div>
      </div>
    </form>`;
  openModalEl($('#modal'));

  $('#checkoutForm').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#ckName').value.trim();
    const phone = $('#ckPhone').value.trim();
    const address = $('#ckAddr').value.trim();
    if (!name || !phone || !address) { toast('Missing details', 'Please complete all fields.', 'warn'); return; }
    if (!/^[0-9+\-\s]{7,15}$/.test(phone)) { toast('Invalid number', 'Enter a valid mobile number.', 'warn'); return; }
    try {
      await placeOrder({ name, phone, address });
      closeModals();
      toast('Order placed!', 'Track it in the Orders section below.', 'ok');
      setTimeout(() => goSection('track'), 500);
    } catch (err) {
      console.error('[ABI] order failed:', err);
      toast('Order failed', 'Could not reach Firebase. Try again.', 'err');
    }
  });
}

/* ---------- search modal ---------- */
function renderSearchResults(q) {
  const query = q.trim().toLowerCase();
  const list = !query
    ? State.allProducts.slice(0, 6)
    : State.allProducts.filter(p =>
        String(p.name || '').toLowerCase().includes(query) ||
        String(p.type || '').toLowerCase().includes(query) ||
        String(p.category || '').toLowerCase().includes(query) ||
        String(p.breed || '').toLowerCase().includes(query) ||
        String(p.careLevel || '').toLowerCase().includes(query) ||
        String(p.price || '').includes(query));
  const grid = $('#modalSearchResults');
  grid.innerHTML = list.length
    ? list.map(productCard).join('')
    : `<p style="color:var(--muted);font-size:.88rem;grid-column:1/-1">No fish found for “${esc(q)}”.</p>`;
  wireCards(grid);
}
$('#modalSearchInput').addEventListener('input', e => renderSearchResults(e.target.value));
$('#searchQuickChips').innerHTML = ['Ranchu', 'Oranda', 'Betta', 'Guppy', 'Beginner']
  .map(c => `<button class="chip" data-q="${c}">${c}</button>`).join('');
$$('#searchQuickChips .chip').forEach(b => b.addEventListener('click', () => {
  $('#modalSearchInput').value = b.dataset.q;
  renderSearchResults(b.dataset.q);
}));

/* ---------- filter / sort / search input ---------- */
let searchTimer;
$('#fishSearch').addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { State.filters.q = e.target.value; renderCatalog(); }, 160);
});
$('#sortSelect').addEventListener('change', e => { State.filters.sort = e.target.value; renderCatalog(); });
$('#fMax').addEventListener('input', e => { $('#fMaxLabel').textContent = npr(e.target.value); });
$('#applyFilters').addEventListener('click', () => {
  State.filters.cat = $('#fCat').value || 'All';
  State.filters.care = $('#fCare').value;
  State.filters.size = $('#fSize').value;
  State.filters.max = +$('#fMax').value;
  State.filters.avail = $('#fAvail').checked;
  State.filters.beg = $('#fBeg').checked;
  renderCatChips(); renderCatalog(); closeDrawers();
  toast('Filters applied', `${applyFilterState().length} fish match.`, 'ok');
});
$('#resetFilters').addEventListener('click', () => {
  $('#fCat').value = ''; $('#fCare').value = ''; $('#fSize').value = '';
  $('#fMax').value = 20000; $('#fMaxLabel').textContent = npr(20000);
  $('#fAvail').checked = false; $('#fBeg').checked = false;
  State.filters = { q: '', cat: 'All', care: '', size: '', max: 20000, avail: false, beg: false, sort: State.filters.sort };
  renderCatChips(); renderCatalog();
});

/* ---------- calculator / contact ---------- */
['#calcL', '#calcW', '#calcH', '#calcFish'].forEach(s => $(s).addEventListener('input', calc));
$('#contactForm').addEventListener('submit', e => {
  e.preventDefault();
  const n = $('#cName').value.trim(), c = $('#cEmail').value.trim(), m = $('#cMsg').value.trim();
  if (!n || !c || !m) { toast('Missing details', 'Please fill in all three fields.', 'warn'); return; }
  toast('Message ready to send', 'Demo form — connect an email service to deliver it.', 'ok');
  e.target.reset();
});
/* ---------- immersive aquarium ---------- */
$('#enterAquarium').addEventListener('click', () => {
  if (!Aquarium3D.hero || !Aquarium3D.heroControls) {
    goSection('showroom');
    toast('3D unavailable', 'Showing the showroom gallery instead.', 'warn');
    return;
  }
  document.body.classList.add('immersive');
  Aquarium3D.heroControls.enabled = true;
  Aquarium3D.heroControls.autoRotate = true;
  toast('Welcome to the aquarium', 'Drag to look around. Press Exit or Esc to leave.', 'ok');
});
$('#exitAquarium').addEventListener('click', () => {
  document.body.classList.remove('immersive');
  if (Aquarium3D.heroControls) { Aquarium3D.heroControls.enabled = false; Aquarium3D.heroControls.autoRotate = false; }
  toast('Exited aquarium', '', 'info');
});
$('#showroomReset')?.addEventListener('click', () => {
  if (Aquarium3D.showroom) {
    Aquarium3D.showroom.camera.position.set(0, .6, 5.4);
    Aquarium3D.showroom.camera.lookAt(0, -.3, 0);
    toast('View reset', '', 'info');
  }
});
let showroomRotating = true;
$('#showroomToggle')?.addEventListener('click', e => {
  showroomRotating = !showroomRotating;
  e.currentTarget.textContent = showroomRotating ? 'Pause rotation' : 'Resume rotation';
  if (Aquarium3D.showroom) Aquarium3D.showroom.fishes.forEach(f => f.userData.speed = showroomRotating ? .5 : .06);
});

/* ---------- wire action handlers into the render layer ---------- */
setActionHandlers({
  addToCart,
  toggleWishlist,
  view3D: open3DViewer,
  viewDetail: openProductDetail
});

/* ---------- event listeners from Firebase → re-render ---------- */
Events.addEventListener('products-updated', () => {
  renderCatChips(); renderCatalog(); renderFeatured(); renderCompare();
  renderShowroomGrid();
  refreshThreeFishes();
});
Events.addEventListener('cart-updated', () => {
  renderCart(cartActionHandler);
  renderCatalog();
});
Events.addEventListener('wishlist-updated', () => {
  renderWishlist(wishHandler);
  renderCatalog(); renderFeatured(); renderShowroomGrid();
});
Events.addEventListener('orders-updated', renderOrders);
Events.addEventListener('auth-changed', () => {
  const authFoot = $('#authFoot');
  if (authFoot) authFoot.textContent = State.currentUser ? 'Logout (' + (State.currentUser.email || '').split('@')[0] + ')' : 'Login / Register';
  renderCatalog();
  renderCart(cartActionHandler);
  renderWishlist(wishHandler);
  renderOrders();
});
Events.addEventListener('highlights-updated', ({ detail }) => {
  $('#highlightsWrap').hidden = false;
  $('#highlights').innerHTML = detail.items.map(x => {
    const url = typeof x === 'string' ? x : x.downloadURL;
    const title = (typeof x === 'object' && (x.title || x.subtitle)) || 'ABI Fish Pets';
    return `<figure><img src="${esc(url)}" alt="${esc(title)}" loading="lazy" onerror="this.parentElement.style.display='none'"/>
      <figcaption>${esc(title)}</figcaption></figure>`;
  }).join('');
});
Events.addEventListener('need-auth', openAuthModal);

/* ---------- cart/wishlist handlers exposed to the drawers ---------- */
async function cartActionHandler(op, id) {
  if (op === 'inc') await updateCartQty(id, 1);
  else if (op === 'dec') await updateCartQty(id, -1);
  else if (op === 'del') await removeFromCart(id);
  else if (op === 'clear') await clearCart();
  else if (op === 'checkout') openCheckout();
}
async function wishHandler(op, id) {
  if (op === 'toggle') await toggleWishlist(id);
  else if (op === 'add-cart') { await addToCart(id); await toggleWishlist(id); }
  else if (op === 'clear') await clearWishlist();
}

/* ---------- top-level buttons ---------- */
$('#searchOpen').addEventListener('click', () => { openModalEl($('#searchModal')); setTimeout(() => $('#modalSearchInput').focus(), 200); });
$('#wishOpen').addEventListener('click', () => openDrawer('wishDrawer'));
$('#cartOpen').addEventListener('click', () => openDrawer('cartDrawer'));
$('#wishFoot')?.addEventListener('click', () => openDrawer('wishDrawer'));
$('#cartFoot')?.addEventListener('click', () => openDrawer('cartDrawer'));
$('#filterToggle').addEventListener('click', () => openDrawer('filterDrawer'));
$('#authOpen')?.addEventListener('click', () => { State.currentUser ? handleLogout() : openAuthModal(); });
$('#authFoot')?.addEventListener('click', () => { State.currentUser ? handleLogout() : openAuthModal(); });

$$('.btn-primary, .btn-ghost, .chip, .tab, .icon-btn, .loc').forEach(el => attachRipple(el));
$$('.magnet').forEach(el => attachMagnet(el));

/* ---------- preloader ---------- */
function plSet(pct) {
  $('#plBar').style.width = pct + '%';
  $('#plPct').textContent = Math.round(pct) + '%';
}
function buildPreloaderBubbles() {
  const host = $('#plBubbles');
  for (let i = 0; i < 12; i++) {
    const b = document.createElement('i');
    const s = 3 + Math.random() * 9;
    b.style.width = b.style.height = s + 'px';
    b.style.left = (Math.random() * 100) + '%';
    b.style.animationDuration = (2.4 + Math.random() * 2.4) + 's';
    b.style.animationDelay = (Math.random() * 2.2) + 's';
    host.appendChild(b);
  }
}
function buildFallbackFish() {
  const art = placeholderArt('fallback|fish');
  $$('.fb-fish').forEach(img => { img.src = art; });
}

/* ---------- BOOT ---------- */
async function boot() {
  buildPreloaderBubbles();
  buildFallbackFish();
  plSet(12);

  setTheme(storage.get('abi_theme', 'dark'));
  setPerf(storage.get('abi_perf', false), true);

  $('#year').textContent = new Date().getFullYear();

  /* static sections */
  renderCare(openGeneric);
  renderDelivery(openGeneric);
  calc();
  initCounters();
  observeReveals(document);
  plSet(38);

  /* three.js */
  await initThree();
  plSet(62);

  /* Firebase listeners — same data pipeline as before */
  setupListeners();
  plSet(84);

  /* empty-state renders while waiting for the first Firebase snapshot */
  renderCatalog();
  renderFeatured();
  renderCart(cartActionHandler);
  renderWishlist(wishHandler);
  renderOrders();
  renderCompare();
  renderShowroomGrid();
  plSet(100);

  setTimeout(() => {
    $('#preloader').classList.add('done');
    observeReveals(document);
  }, 700);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

/* expose helpers for debugging */
window.ABI = { goSection, openProductDetail, openAuthModal, addToCart, toggleWishlist };
               
