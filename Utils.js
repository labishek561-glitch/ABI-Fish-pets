export const $  = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const npr = n => 'Rs. ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const storage = {
  get(k, fb) { try { const v = localStorage.getItem(k); return v === null ? fb : JSON.parse(v); } catch { return fb; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

/* SVG placeholder shown only if a Firebase product has no imageUrl */
export function placeholderArt(seed) {
  const hash = String(seed || 'abi').split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const hue = Math.abs(hash) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
    <defs>
      <radialGradient id="bg" cx="50%" cy="34%" r="78%">
        <stop offset="0%" stop-color="hsl(${hue} 70% 45%)"/>
        <stop offset="60%" stop-color="hsl(${(hue + 30) % 360} 55% 22%)"/>
        <stop offset="100%" stop-color="#02101d"/>
      </radialGradient>
    </defs>
    <rect width="600" height="600" fill="url(#bg)"/>
    <ellipse cx="300" cy="360" rx="180" ry="90" fill="hsl(${hue} 65% 40%)" opacity=".85"/>
    <ellipse cx="260" cy="340" rx="90" ry="55" fill="hsl(${(hue + 20) % 360} 75% 60%)"/>
    <circle cx="230" cy="330" r="12" fill="#08111f"/>
    <circle cx="226" cy="326" r="4" fill="#fff"/>
    <path d="M420 360 C 490 320 540 340 520 380 C 500 415 460 400 420 380 Z" fill="hsl(${(hue + 40) % 360} 65% 55%)" opacity=".85"/>
    <text x="300" y="545" text-anchor="middle" font-family="Outfit, sans-serif" font-size="26" font-weight="700" fill="#bdf0ff" opacity=".55">ABI FISH PETS</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/* Toast */
export function toast(title, msg = '', type = 'info') {
  const map = {
    ok:   'M5 13l4 4L19 7',
    warn: 'M12 9v4M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
    err:  'M12 8v5M12 17h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
    info: 'M12 16v-5M12 8h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z'
  };
  const colors = { ok: 'var(--green)', warn: 'var(--gold)', err: 'var(--coral)', info: 'var(--cyan)' };
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = `<span class="ti" style="color:${colors[type]}"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${map[type] || map.info}"/></svg></span>
    <div style="flex:1"><h5>${esc(title)}</h5>${msg ? `<p>${esc(msg)}</p>` : ''}</div>`;
  const host = $('#toasts') || document.body;
  host.appendChild(el);
  const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 360); };
  el.addEventListener('click', kill);
  setTimeout(kill, 3800);
}

export function attachRipple(el) {
  el.addEventListener('pointerdown', e => {
    const r = el.getBoundingClientRect();
    const s = document.createElement('span');
    s.className = 'ripple';
    const size = Math.max(r.width, r.height);
    s.style.width = s.style.height = size + 'px';
    s.style.left = (e.clientX - r.left - size / 2) + 'px';
    s.style.top = (e.clientY - r.top - size / 2) + 'px';
    el.appendChild(s);
    setTimeout(() => s.remove(), 640);
  });
}

export function attachMagnet(el, strength = 7) {
  if (reducedMotion || matchMedia('(hover: none)').matches) return;
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5;
    const y = (e.clientY - r.top) / r.height - .5;
    el.style.transform = `translate(${x * strength}px, ${y * strength * .7}px)`;
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
}

export function attachGlow(el) {
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
  });
}

export function bubbleBurst(x, y, n = 12) {
  if (reducedMotion) return;
  for (let i = 0; i < n; i++) {
    const b = document.createElement('span');
    b.className = 'burst';
    const size = 5 + Math.random() * 11;
    b.style.width = b.style.height = size + 'px';
    b.style.left = x + 'px'; b.style.top = y + 'px';
    document.body.appendChild(b);
    const dx = (Math.random() - .5) * 150;
    const dy = -60 - Math.random() * 190;
    b.animate(
      [{ transform: 'translate(-50%,-50%) scale(.4)', opacity: .95 },
       { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)`, opacity: 0 }],
      { duration: 900 + Math.random() * 700, easing: 'cubic-bezier(.22,.68,.28,1)' }
    ).onfinish = () => b.remove();
  }
}

export function bumpCount(sel) {
  const el = $(sel); if (!el) return;
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}
