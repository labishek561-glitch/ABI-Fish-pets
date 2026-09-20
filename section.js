import { CARE, DELIVERY, STAGES } from './config.js';
import { State } from './state.js';
import { $, $$, esc, npr } from './utils.js';

/* ---------- CARE CENTER ---------- */
export function renderCare(openGeneric) {
  const grid = $('#careGrid');
  if (!grid) return;
  grid.innerHTML = CARE.map((c, i) => `
    <button class="card care reveal d${i % 3 + 1}" data-care="${c.key}">
      <span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${c.icon}"/></svg></span>
      <h3>${esc(c.title)}</h3>
      <p>${esc(c.short)}</p>
      <span class="more">Read guide →</span>
    </button>`).join('');
  grid.querySelectorAll('[data-care]').forEach(b => b.addEventListener('click', () => {
    const c = CARE.find(x => x.key === b.dataset.care);
    if (c && openGeneric) openGeneric(c.title, 'ABI Aquarium Care Center', c.body + `
      <div class="modal-actions">
        <button class="btn btn-ghost" data-nav="tools">Open tank calculator</button>
        <button class="btn btn-primary" data-nav="fish">Browse fish</button>
      </div>`);
  }));
}

/* ---------- DELIVERY MAP ---------- */
export function renderDelivery(openGeneric) {
  const pins = $('#mapPins'), list = $('#locList');
  if (!pins || !list) return;
  pins.innerHTML = DELIVERY.map((d, i) => `
    <g class="pin" data-loc="${i}" tabindex="0" role="button" aria-label="Delivery info for ${esc(d.name)}">
      <circle class="ring" cx="${d.x}" cy="${d.y}" r="6" style="animation-delay:${(i * .32).toFixed(2)}s"/>
      <circle class="core" cx="${d.x}" cy="${d.y}" r="6"/>
      <text x="${d.x + 12}" y="${d.y + 5}">${esc(d.name)}</text>
    </g>`).join('');
  list.innerHTML = DELIVERY.map((d, i) => `
    <button class="loc" data-loc="${i}">
      <span><b>${esc(d.name)}</b><small>${esc(d.time)}</small></span>
      <span class="ok">${esc(d.fee)}</span>
    </button>`).join('');

  const open = i => {
    const d = DELIVERY[i];
    if (!d || !openGeneric) return;
    openGeneric(`Delivery · ${d.name}`, d.time, `
      <div class="spec-grid">
        <div class="spec"><small>Delivery window</small><b>${esc(d.time)}</b></div>
        <div class="spec"><small>Delivery fee</small><b>${esc(d.fee)}</b></div>
        <div class="spec"><small>Packing</small><b>Oxygen + insulated box</b></div>
        <div class="spec"><small>Guarantee</small><b>Live arrival</b></div>
      </div>
      <p style="margin-top:18px;color:var(--text-2);font-size:.9rem">${esc(d.note)}</p>
      <div class="modal-actions"><button class="btn btn-primary" data-nav="fish">Shop for ${esc(d.name)}</button></div>`);
  };
  $$('[data-loc]').forEach(el => {
    el.addEventListener('click', () => open(+el.dataset.loc));
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(+el.dataset.loc); } });
  });
}

/* ---------- COMPARISON ---------- */
export function renderCompare() {
  const selA = $('#cmpA'), selB = $('#cmpB'), table = $('#cmpTable');
  if (!selA || !selB || !table) return;
  if (!State.allProducts.length) {
    selA.innerHTML = selB.innerHTML = `<option>Waiting for listings…</option>`;
    table.innerHTML = `<tbody><tr><td colspan="3" style="padding:30px;text-align:center;color:var(--muted)">Comparison updates automatically as sellers add fish.</td></tr></tbody>`;
    return;
  }
  const opts = State.allProducts.map(p => `<option value="${p.id}">${esc(p.name)} · ${npr(p.price)}</option>`).join('');
  const keepA = selA.value || State.allProducts[0].id;
  const keepB = selB.value || State.allProducts[Math.min(1, State.allProducts.length - 1)].id;
  selA.innerHTML = opts; selB.innerHTML = opts;
  selA.value = keepA; selB.value = keepB;

  const careRank = p => ({ Beginner: 1, Medium: 2, Advanced: 3 }[p.careLevel] || 2);
  const cat = p => p.type || p.category || 'Fish';
  const draw = () => {
    const a = State.allProducts.find(p => p.id === selA.value);
    const b = State.allProducts.find(p => p.id === selB.value);
    if (!a || !b) return;
    const rows = [
      ['Price', npr(a.price || 0), npr(b.price || 0), Number(a.price || 0) < Number(b.price || 0) ? 'a' : Number(a.price || 0) > Number(b.price || 0) ? 'b' : ''],
      ['Category', cat(a), cat(b), ''],
      ['Size', a.size || '—', b.size || '—', ''],
      ['Care level', a.careLevel || '—', b.careLevel || '—', careRank(a) < careRank(b) ? 'a' : careRank(a) > careRank(b) ? 'b' : ''],
      ['Temperature', a.temperature || '—', b.temperature || '—', ''],
      ['Age', (a.age || '—') + (a.age ? ' mo' : ''), (b.age || '—') + (b.age ? ' mo' : ''), ''],
      ['Weight', (a.weight || '—') + (a.weight ? ' kg' : ''), (b.weight || '—') + (b.weight ? ' kg' : ''), ''],
      ['Vaccination', a.vaccination || '—', b.vaccination || '—', ''],
      ['Availability', a.availability === false ? 'Out of stock' : 'In stock', b.availability === false ? 'Out of stock' : 'In stock',
        a.availability !== false && b.availability === false ? 'a' : b.availability !== false && a.availability === false ? 'b' : '']
    ];
    table.innerHTML = `
      <thead><tr><th></th><th style="color:var(--cyan)">${esc(a.name)}</th><th style="color:#c4b5fd">${esc(b.name)}</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td>${r[0]}</td>
        <td class="${r[3] === 'a' ? 'win' : ''}">${esc(r[1])}</td>
        <td class="${r[3] === 'b' ? 'win' : ''}">${esc(r[2])}</td></tr>`).join('')}</tbody>`;
  };
  selA.onchange = draw; selB.onchange = draw;
  const swap = $('#cmpSwap');
  if (swap) swap.onclick = () => { const t = selA.value; selA.value = selB.value; selB.value = t; draw(); };
  draw();
}

/* ---------- CALCULATOR ---------- */
export function calc() {
  const L = +$('#calcL').value || 0, W = +$('#calcW').value || 0, H = +$('#calcH').value || 0;
  const fish = +$('#calcFish').value || 8;
  const litres = (L * W * H) / 1000;
  const gal = litres * 0.264172;
  $('#calcVol').textContent = `${litres.toFixed(0)} L`;
  $('#calcVolDetail').textContent = `${litres.toFixed(1)} litres · ${gal.toFixed(1)} US gal`;
  $('#calcWeight').textContent = `~${(litres * 1.0).toFixed(0)} kg`;
  $('#calcFilter').textContent = `${Math.round(litres * 4)} – ${Math.round(litres * 6)} L/h`;
  const heater = Math.max(25, Math.round(litres / 5) * 25);
  $('#calcHeater').textContent = `${heater} W – ${heater + 50} W`;
  const conservative = Math.max(0, Math.floor(litres / (fish * 3)));
  const liberal = Math.max(0, Math.floor(litres / (fish * 1.6)));
  $('#calcStock').textContent = litres < 20 ? 'Small tank — 1–2 nano fish only' : `${conservative} – ${liberal} fish`;
}

/* ---------- ORDERS + TRACKER ---------- */
export function renderOrders() {
  const list = $('#ordersList');
  if (!list) return;
  if (!State.currentUser) {
    list.innerHTML = `<p style="font-size:.85rem;color:var(--muted)">Please log in to see your live orders from Firebase.</p>`;
    const tl = $('#trackTitleLabel'); if (tl) tl.textContent = 'Sign in to track';
    const ts = $('#trackSub'); if (ts) ts.textContent = 'Your Firebase orders appear here automatically.';
    renderTrackerEmpty();
    return;
  }
  if (!State.ordersData.length) {
    list.innerHTML = `<p style="font-size:.85rem;color:var(--muted)">No orders yet. Place one from the cart to see live tracking here.</p>`;
    const tl = $('#trackTitleLabel'); if (tl) tl.textContent = 'No orders yet';
    const ts = $('#trackSub'); if (ts) ts.textContent = 'Once you place an order it will appear here.';
    renderTrackerEmpty();
    return;
  }
  list.innerHTML = State.ordersData.map(o => {
    const idx = Math.max(0, STAGES.findIndex(s => s.key === (o.status || 'pending')));
    return `<div class="order-card">
      <div class="order-top">
        <b style="font-family:'Outfit'">#${esc((o.id || o.orderId || '').slice(-8))}</b>
        <span class="status ${o.status || 'pending'}">${STAGES[idx].label}</span>
      </div>
      <p style="font-size:.76rem;color:var(--muted);margin-top:4px">${new Date(o.date || Date.now()).toLocaleString()}</p>
      <p style="font-size:.82rem;color:var(--text-2);margin-top:8px">${(o.items || []).map(i => `${esc(i.name)} × ${i.quantity}`).join(' · ')}</p>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:12px;flex-wrap:wrap">
        <b style="font-family:'Outfit';color:var(--cyan)">${npr(o.totalAmount || 0)}</b>
        ${o.shippingAddress ? `<small style="color:var(--muted);font-size:.72rem">📍 ${esc(o.shippingAddress)}</small>` : ''}
      </div>
    </div>`;
  }).join('');
  renderTracker();
}
function renderTrackerEmpty() {
  const host = $('#trackSteps');
  if (!host) return;
  host.innerHTML = STAGES.map((s, i) => `
    <div class="tstep ${i === 0 ? 'done now' : ''}">
      <div class="dot">${i === 0 ? '1' : i + 1}</div>
      <span>${s.label}</span>
    </div>`).join('');
}
function renderTracker() {
  const host = $('#trackSteps');
  if (!host) return;
  if (!State.ordersData.length) { renderTrackerEmpty(); return; }
  const latest = State.ordersData[0];
  const active = Math.max(0, STAGES.findIndex(s => s.key === (latest.status || 'pending')));
  host.innerHTML = STAGES.map((s, i) => `
    <div class="tstep ${i < active ? 'done' : ''} ${i === active ? 'done now' : ''}">
      <div class="dot">${i < active ? '✓' : i + 1}</div>
      <span>${s.label}</span>
    </div>`).join('');
  const tl = $('#trackTitleLabel'); if (tl) tl.textContent = `Order #${(latest.id || latest.orderId || '').slice(-8)} · ${STAGES[active].label}`;
  const ts = $('#trackSub'); if (ts) ts.textContent = `Placed ${new Date(latest.date || Date.now()).toLocaleString()} · ${(latest.items || []).length} item(s)`;
}

/* ---------- COUNTERS ---------- */
export function initCounters() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target; io.unobserve(el);
      const target = +el.dataset.count || 0;
      const suffix = el.dataset.suffix || '';
      const dur = 1600, t0 = performance.now();
      const step = now => {
        const p = Math.min(1, (now - t0) / dur);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString('en-IN') + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: .4 });
  $$('[data-count]').forEach(el => io.observe(el));
}

