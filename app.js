/* FCPS Book — Phase 1
 * System > Topic > Subtopic > Question & answer. Offline, stored in IndexedDB.
 */
(() => {
'use strict';

const APP_VERSION = 'Phase 1';

/* ============================== utilities ============================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const byOrder = (a, b) => (a.order - b.order) || ((a.createdAt || 0) - (b.createdAt || 0));
const push = (m, k, v) => { const a = m.get(k); if (a) a.push(v); else m.set(k, [v]); };

const P = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  sliders: '<path d="M4 6h9M19 6h1M4 12h3M13 12h7M4 18h11M21 18h-1"/><circle cx="16" cy="6" r="2.2"/><circle cx="10" cy="12" r="2.2"/><circle cx="18" cy="18" r="2.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  up: '<path d="m6 15 6-6 6 6"/>', down: '<path d="m6 9 6 6 6-6"/>',
  left: '<path d="m15 6-6 6 6 6"/>', right: '<path d="m9 6 6 6-6 6"/>',
  first: '<path d="M6 5v14M18 6l-7 6 7 6"/>',
  dots: '<circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none"/>',
  move: '<path d="M3 7h6l2 2h10v10H3z"/><path d="M10 14h7m-3-3 3 3-3 3"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  download: '<path d="M12 4v11m-4-4 4 4 4-4M5 20h14"/>',
  upload: '<path d="M12 16V5m-4 4 4-4 4 4M5 20h14"/>',
  home: '<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>',
  dot: '<circle cx="12" cy="12" r="2"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  undo: '<path d="M9 8 4 13l5 5"/><path d="M4 13h10a6 6 0 0 1 0 12"/>',
  redo: '<path d="m15 8 5 5-5 5"/><path d="M20 13H10a6 6 0 0 0 0 12"/>',
  alignL: '<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',
  alignC: '<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>',
  alignR: '<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>',
  alignJ: '<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>',
  ul: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>',
  ol: '<path d="M10 6h10M10 12h10M10 18h10M4 5l1.5-1v5M4 14.5c0-1 2.5-1 2.5.3 0 1-2.5 2.2-2.5 3.2h2.7"/>',
  eraser: '<path d="m7 20-4-4 10-10 7 7-6 7z"/><path d="M9 20h11"/>',
  check: '<path d="m5 12 5 5 9-10"/>'
};
const ic = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || P.dot}</svg>`;

/* ============================== settings ============================== */
const FONTS = [
  { id: 'lato', name: 'Lato' }, { id: 'poppins', name: 'Poppins' }, { id: 'roboto', name: 'Roboto' },
  { id: 'opensans', name: 'Open Sans' }, { id: 'nunito', name: 'Nunito' }, { id: 'montserrat', name: 'Montserrat' },
  { id: 'inter', name: 'Inter' }, { id: 'firasans', name: 'Fira Sans' },
  { id: 'merriweather', name: 'Merriweather', serif: 1 }, { id: 'lora', name: 'Lora', serif: 1 },
  { id: 'playfair', name: 'Playfair Display', serif: 1 }, { id: 'sourceserif', name: 'Source Serif 4', serif: 1 },
  { id: 'hind', name: 'Hind Siliguri' }, { id: 'notosans', name: 'Noto Sans Bengali' }, { id: 'notoserif', name: 'Noto Serif Bengali', serif: 1 }
];
const fontById = id => FONTS.find(f => f.id === id) || FONTS[0];
const fontCss = f => `"${f.name}", ${f.serif ? 'Georgia, serif' : 'system-ui, sans-serif'}`;

const THEMES = [
  { id: 'light', name: 'Light', c: ['#F1F5FB', '#FFFFFF', '#0F7B8A'] },
  { id: 'dark', name: 'Dark', c: ['#0E121A', '#161C28', '#4CCFC4'] },
  { id: 'sepia', name: 'Sepia', c: ['#EEE2C6', '#F7EFDB', '#A2551A'] },
  { id: 'ocean', name: 'Ocean', c: ['#E2EFFA', '#F6FAFE', '#0B63CE'] },
  { id: 'forest', name: 'Forest', c: ['#E4F0E6', '#F5FAF5', '#1E7F4F'] },
  { id: 'rose', name: 'Rose', c: ['#FBE9F0', '#FFF7FA', '#C2185B'] }
];

const SKEY = 'fcpsbook.settings.v1';
const DEF = { theme: 'light', uiFont: 'lato', noteFont: 'lato', noteSize: 17, seeded: false, lastBackup: 0, lastNode: null, expanded: [], persistAsked: false };
let ST = { ...DEF };
try { ST = { ...DEF, ...JSON.parse(localStorage.getItem(SKEY) || '{}') }; } catch (e) {}
const saveST = () => { try { localStorage.setItem(SKEY, JSON.stringify(ST)); } catch (e) {} };

function applyLook() {
  const r = document.documentElement;
  r.dataset.theme = ST.theme;
  r.style.setProperty('--font-ui', fontCss(fontById(ST.uiFont)));
  r.style.setProperty('--font-note', fontCss(fontById(ST.noteFont)));
  r.style.setProperty('--note-size', ST.noteSize + 'px');
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(r).getPropertyValue('--bar').trim() || '#FFFFFF';
}

/* ============================== storage ============================== */
const DB_NAME = 'fcps-book';
const STORES = ['systems', 'nodes', 'qas'];
let db = null;

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => { STORES.forEach(s => { if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: 'id' }); }); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function readAll(store) {
  return new Promise((res, rej) => {
    const q = db.transaction(store, 'readonly').objectStore(store).getAll();
    q.onsuccess = () => res(q.result || []);
    q.onerror = () => rej(q.error);
  });
}
/* One atomic transaction. Deletes run before puts so a "replace" restore is safe. */
function commit(put = {}, del = {}) {
  return new Promise((res, rej) => {
    const names = [...new Set([...Object.keys(put), ...Object.keys(del)])].filter(n => (put[n] && put[n].length) || (del[n] && del[n].length));
    if (!names.length) return res();
    const t = db.transaction(names, 'readwrite');
    names.forEach(n => {
      const s = t.objectStore(n);
      (del[n] || []).forEach(id => s.delete(id));
      (put[n] || []).forEach(x => s.put(x));
    });
    t.oncomplete = () => res();
    t.onerror = t.onabort = () => rej(t.error || new Error('Storage failed'));
  });
}
async function save(put, del) {
  try {
    await commit(put, del);
    if (!ST.persistAsked && navigator.storage && navigator.storage.persist) {
      ST.persistAsked = true; saveST();
      navigator.storage.persist().catch(() => {});
    }
  } catch (e) {
    toast('Could not save. Your browser storage may be full or blocked.');
    throw e;
  }
}

/* ============================== state ============================== */
const S = { systems: [], nodes: [], qas: [] };
const IX = { sys: new Map(), node: new Map(), topics: new Map(), subs: new Map(), qaOf: new Map(), sysQ: new Map(), text: new Map() };

function reindex() {
  S.systems.sort(byOrder); S.nodes.sort(byOrder); S.qas.sort(byOrder);
  IX.sys = new Map(S.systems.map(s => [s.id, s]));
  IX.node = new Map(S.nodes.map(n => [n.id, n]));
  IX.topics = new Map(); IX.subs = new Map(); IX.qaOf = new Map(); IX.sysQ = new Map();
  for (const n of S.nodes) { if (n.parentId) push(IX.subs, n.parentId, n); else push(IX.topics, n.systemId, n); }
  for (const q of S.qas) { push(IX.qaOf, q.nodeId, q); IX.sysQ.set(q.systemId, (IX.sysQ.get(q.systemId) || 0) + 1); }
}
const topicsOf = sid => IX.topics.get(sid) || [];
const subsOf = tid => IX.subs.get(tid) || [];
const qasOf = nid => IX.qaOf.get(nid) || [];
const qCountNode = nid => qasOf(nid).length + subsOf(nid).reduce((a, s) => a + qasOf(s.id).length, 0);
const siblingsOf = n => n.parentId ? subsOf(n.parentId) : topicsOf(n.systemId);

const stripHtml = h => String(h || '').replace(/<\/(p|div|li|tr|h\d|blockquote)>|<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
function qText(q) {
  const c = IX.text.get(q.id);
  if (c && c.u === q.updatedAt) return c;
  const t = stripHtml(q.a);
  const rec = { u: q.updatedAt, t, l: (q.q + ' ' + t).toLowerCase(), ql: q.q.toLowerCase() };
  IX.text.set(q.id, rec);
  return rec;
}

const COLORS = ['#EF5B5B', '#F08A24', '#E0A100', '#7CB518', '#2FA36B', '#14A3A3', '#1F9BD1', '#3B6FE0', '#6B5CE7', '#A24BD8', '#E0489F', '#64748B'];
const EMOJIS = ['📚', '🫁', '❤️', '🧠', '😴', '🤰', '💊', '💉', '🏥', '🎯', '📋', '🧓', '🍼', '🔥', '🩺', '🦴', '🚑', '🧒', '🩸', '🧪', '🔬', '⚡', '🌬️', '🦷', '👁️', '🧬', '🩻', '⭐'];

const SEED = [
  ['Respiratory Medicine', '🫁'], ['Cardiovascular Anaesthesia', '❤️'], ['Respiratory System Management', '🌬️'],
  ['Neuro Anaesthesia', '🧠'], ['General Anaesthesia', '😴'], ['Obs & Gynae Anaesthesia', '🤰'],
  ['Pain Medicine', '💊'], ['Procedural Sedation', '💉'], ['ICU', '🏥'],
  ['Regional Anaesthesia & Blocks', '🎯', ['Upper Limb Blocks', 'Lower Limb Blocks']],
  ['Perioperative Medicine', '📋'], ['Geriatric Anaesthesia', '🧓'], ['Extremes of Age Anaesthesia', '🍼'],
  ['Trauma, Burn & Poisoning', '🔥'], ['Cardiothoracic Anaesthesia', '🩺'], ['Orthopaedic Anaesthesia', '🦴'],
  ['Emergency', '🚑'], ['Paediatric Anaesthesia', '🧒']
];
async function seed() {
  const now = Date.now(); const sys = [], nodes = [];
  SEED.forEach((s, i) => {
    const rec = { id: uid(), name: s[0], emoji: s[1], color: COLORS[i % COLORS.length], order: i, createdAt: now + i };
    sys.push(rec);
    (s[2] || []).forEach((t, j) => nodes.push({ id: uid(), systemId: rec.id, parentId: null, name: t, order: j, createdAt: now + j }));
  });
  S.systems = sys; S.nodes = nodes; S.qas = [];
  await commit({ systems: sys, nodes });
  ST.seeded = true; saveST();
}

/* Reorder one item inside its sibling list and persist only what changed. */
async function reorderTo(store, sibs, id, idx) {
  const item = sibs.find(x => x.id === id); if (!item) return;
  const arr = sibs.filter(x => x.id !== id);
  idx = Math.max(0, Math.min(idx, arr.length)); arr.splice(idx, 0, item);
  const changed = [];
  arr.forEach((x, i) => { if (x.order !== i) { x.order = i; changed.push(x); } });
  if (!changed.length) return;
  await save({ [store]: changed });
  reindex(); render(true);
}
const orderItems = (store, sibs, id, horizontal) => {
  const i = sibs.findIndex(x => x.id === id), last = sibs.length - 1;
  return [
    { label: 'Move to the start', icon: 'first', disabled: i <= 0, run: () => reorderTo(store, sibs, id, 0) },
    { label: horizontal ? 'Move earlier' : 'Move up', icon: horizontal ? 'left' : 'up', disabled: i <= 0, run: () => reorderTo(store, sibs, id, i - 1) },
    { label: horizontal ? 'Move later' : 'Move down', icon: horizontal ? 'right' : 'down', disabled: i >= last, run: () => reorderTo(store, sibs, id, i + 1) }
  ];
};

/* ============================== sanitizer ============================== */
function parseColor(c) {
  c = (c || '').trim().toLowerCase();
  if (!c || c === 'transparent' || c === 'inherit' || c === 'initial' || c === 'windowtext' || c === 'window') return null;
  const named = { black: [0, 0, 0], white: [255, 255, 255] };
  if (named[c]) return named[c].concat(1);
  let m = c.match(/^#([0-9a-f]{3})$/);
  if (m) return [...m[1]].map(x => parseInt(x + x, 16)).concat(1);
  m = c.match(/^#([0-9a-f]{6})/);
  if (m) return [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16)).concat(1);
  m = c.match(/^rgba?\(([^)]+)\)/);
  if (m) { const p = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
  return null;
}
const lum = c => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
const SAFE_COLOR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%/]+\)|[a-z]+)$/i;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'HEAD', 'IMG', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'CANVAS', 'VIDEO', 'AUDIO', 'NOSCRIPT']);

function sanitize(html, paste) {
  const t = document.createElement('template');
  t.innerHTML = html || '';
  return walk(t.content, paste).trim();
}
function walk(root, paste) {
  let out = '';
  root.childNodes.forEach(n => {
    if (n.nodeType === 3) { out += esc(n.nodeValue.replace(/\u00a0/g, ' ')); return; }
    if (n.nodeType !== 1) return;
    const tag = n.tagName;
    if (SKIP_TAGS.has(tag) || (n.namespaceURI && n.namespaceURI.indexOf('svg') > -1)) return;
    const inner = walk(n, paste);
    const st = n.style || {};
    const fw = String(st.fontWeight || '').toLowerCase();
    const bold = (tag === 'B' || tag === 'STRONG') ? !(fw === 'normal' || fw === '400') : (fw === 'bold' || fw === 'bolder' || parseInt(fw, 10) >= 600);
    const italic = tag === 'I' || tag === 'EM' || st.fontStyle === 'italic';
    const td = String(st.textDecorationLine || st.textDecoration || '');
    const under = tag === 'U' || td.indexOf('underline') > -1;
    const strike = tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || td.indexOf('line-through') > -1;
    const wrapInline = s => {
      if (!s.trim() && s.indexOf('<br') < 0) return s;
      if (bold) s = `<b>${s}</b>`; if (italic) s = `<i>${s}</i>`; if (under) s = `<u>${s}</u>`; if (strike) s = `<s>${s}</s>`;
      return s;
    };
    const styleStr = () => {
      const p = [];
      let col = st.color || (tag === 'FONT' ? n.getAttribute('color') : '');
      const pc = parseColor(col);
      if (pc && SAFE_COLOR.test(col) && !(paste && (lum(pc) < 70 || lum(pc) > 215))) p.push(`color:${col}`);
      const bg = st.backgroundColor, pb = parseColor(bg);
      if (pb && SAFE_COLOR.test(bg) && pb[3] > 0.05 && !(paste && lum(pb) > 245)) p.push(`background-color:${bg}`);
      if (!paste) {
        const ff = (st.fontFamily || '').replace(/["']/g, '').split(',')[0].trim();
        if (ff && /^[\w\s-]+$/.test(ff)) p.push(`font-family:"${ff}"`);
        const fs = st.fontSize || '';
        if (/^\d+(\.\d+)?px$/.test(fs)) p.push(`font-size:${fs}`);
      }
      return p.join(';');
    };
    const align = () => { const a = st.textAlign; return (a === 'center' || a === 'right' || a === 'justify') ? ` style="text-align:${a}"` : ''; };

    switch (tag) {
      case 'BR': out += '<br>'; return;
      case 'B': case 'STRONG': case 'I': case 'EM': case 'U': case 'S': case 'STRIKE': case 'DEL':
        out += wrapInline(inner); return;
      case 'SPAN': case 'FONT': {
        const s = styleStr();
        out += wrapInline(s ? `<span style="${esc(s)}">${inner}</span>` : inner); return;
      }
      case 'SUB': case 'SUP': case 'CODE': out += `<${tag.toLowerCase()}>${inner}</${tag.toLowerCase()}>`; return;
      case 'P': case 'DIV': case 'SECTION': case 'ARTICLE': case 'PRE': case 'FIGURE': {
        if (!inner.trim() && inner.indexOf('<br') < 0) return;
        if (tag === 'DIV' && /<(p|ul|ol|table|h[1-4]|blockquote|div)[ >]/i.test(inner) && !align()) { out += inner; return; }
        out += `<p${align()}>${wrapInline(inner)}</p>`; return;
      }
      case 'H1': case 'H2': case 'H3': out += `<h3${align()}>${inner}</h3>`; return;
      case 'H4': case 'H5': case 'H6': out += `<h4${align()}>${inner}</h4>`; return;
      case 'UL': case 'OL': out += `<${tag.toLowerCase()}>${inner}</${tag.toLowerCase()}>`; return;
      case 'LI': out += `<li${align()}>${inner}</li>`; return;
      case 'BLOCKQUOTE': out += `<blockquote>${inner}</blockquote>`; return;
      case 'TABLE': out += `<table>${inner}</table>`; return;
      case 'THEAD': case 'TBODY': case 'TFOOT': case 'TR': out += `<${tag.toLowerCase()}>${inner}</${tag.toLowerCase()}>`; return;
      case 'TH': case 'TD': {
        const cs = parseInt(n.getAttribute('colspan'), 10), rs = parseInt(n.getAttribute('rowspan'), 10);
        const at = (cs > 1 ? ` colspan="${cs}"` : '') + (rs > 1 ? ` rowspan="${rs}"` : '');
        out += `<${tag.toLowerCase()}${at}>${inner}</${tag.toLowerCase()}>`; return;
      }
      default: out += inner;
    }
  });
  return out;
}

/* ============================== toasts, menus, dialogs ============================== */
function toast(msg, opts = {}) {
  const host = $$('dialog[open]').pop() || $('#toasts');
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status');
  t.innerHTML = `<span>${esc(msg)}</span>`;
  if (opts.undo) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Undo';
    b.onclick = () => { t.remove(); opts.undo(); };
    t.appendChild(b);
  }
  host.appendChild(t);
  setTimeout(() => t.remove(), opts.undo ? 9000 : 3400);
}

let menuEl = null;
function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
function openMenu(anchor, items) {
  closeMenu();
  const m = document.createElement('div'); m.className = 'menu'; m.setAttribute('role', 'menu');
  items.forEach(it => {
    if (it === '-') { m.insertAdjacentHTML('beforeend', '<hr>'); return; }
    if (it.hidden) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'mi' + (it.danger ? ' danger' : '');
    b.setAttribute('role', 'menuitem'); b.disabled = !!it.disabled;
    b.innerHTML = `${ic(it.icon || 'dot', 16)}<span>${esc(it.label)}</span>`;
    b.onclick = () => { closeMenu(); it.run(); };
    m.appendChild(b);
  });
  document.body.appendChild(m); menuEl = m;
  const r = anchor.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
  let x = Math.max(8, Math.min(r.right - w, innerWidth - w - 8));
  let y = r.bottom + 6; if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 6);
  m.style.left = x + 'px'; m.style.top = y + 'px';
}
document.addEventListener('mousedown', e => { if (menuEl && !menuEl.contains(e.target)) closeMenu(); }, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
window.addEventListener('resize', closeMenu);
document.addEventListener('scroll', closeMenu, true);

function openDialog({ title, html, primary = 'Save', secondary = 'Cancel', danger = false, wide = false, collect, onOpen }) {
  return new Promise(resolve => {
    const d = document.createElement('dialog'); d.className = 'dlg' + (wide ? ' wide' : '');
    d.innerHTML = `<form method="dialog" class="dlg-in"><h2>${esc(title)}</h2><div class="dlg-body">${html || ''}</div>
      <div class="dlg-foot"><button class="btn ${danger ? 'danger' : 'primary'}" value="ok">${esc(primary)}</button>${secondary ? `<button class="btn" value="cancel" formnovalidate>${esc(secondary)}</button>` : ''}</div></form>`;
    document.body.appendChild(d);
    let result = null;
    $('form', d).addEventListener('submit', e => {
      const v = e.submitter ? e.submitter.value : 'ok';
      if (v === 'ok') {
        const out = collect ? collect(d) : true;
        if (out === false) { e.preventDefault(); return; }
        result = out;
      }
    });
    d.addEventListener('close', () => { d.remove(); resolve(result); });
    d.showModal();
    if (onOpen) onOpen(d);
    const f = $('[autofocus]', d) || $('input[type=text],textarea,select', d) || $('.dlg-foot .btn', d);
    if (f) f.focus();
  });
}
const confirmDlg = (title, text, primary = 'Delete') => openDialog({ title, html: `<p>${text}</p>`, primary, danger: true });

/* ============================== dialogs: system / node / move ============================== */
async function dlgSystem(existing) {
  const cur = existing || { name: '', emoji: '📚', color: COLORS[S.systems.length % COLORS.length] };
  return openDialog({
    title: existing ? 'Edit system' : 'New system', primary: existing ? 'Save changes' : 'Add system',
    html: `<label class="fld">Name<input type="text" name="name" required maxlength="80" autofocus value="${esc(cur.name)}" placeholder="e.g. Orthopaedic Anaesthesia"></label>
      <div class="fld">Icon<div class="row"><input type="text" class="emoji-in" name="emoji" maxlength="8" value="${esc(cur.emoji)}" aria-label="Icon"><div class="emoji-row">${EMOJIS.map(e => `<button type="button" data-emoji="${e}" aria-label="Use ${e}">${e}</button>`).join('')}</div></div></div>
      <div class="fld">Colour<div class="swatches">${COLORS.map(c => `<label style="--c:${c}"><input type="radio" name="color" value="${c}" ${c === cur.color ? 'checked' : ''}><span></span></label>`).join('')}</div></div>`,
    onOpen: d => $$('[data-emoji]', d).forEach(b => b.addEventListener('click', () => { $('[name=emoji]', d).value = b.dataset.emoji; })),
    collect: d => {
      const name = $('[name=name]', d).value.trim(); if (!name) return false;
      const c = $('[name=color]:checked', d);
      return { name, emoji: $('[name=emoji]', d).value.trim() || '📚', color: c ? c.value : cur.color };
    }
  });
}
const dlgName = (title, label, value, primary) => openDialog({
  title, primary,
  html: `<label class="fld">${esc(label)}<input type="text" name="name" required maxlength="120" autofocus value="${esc(value || '')}"></label>`,
  collect: d => { const v = $('[name=name]', d).value.trim(); return v || false; }
});

async function dlgMove(qa) {
  const cur = IX.node.get(qa.nodeId);
  const opts = sid => topicsOf(sid).map(t => `<option value="${t.id}">${esc(t.name)}</option>` + subsOf(t.id).map(s => `<option value="${s.id}">\u00a0\u00a0\u00a0${esc(t.name)} › ${esc(s.name)}</option>`).join('')).join('');
  return openDialog({
    title: 'Move question', primary: 'Move', 
    html: `<label class="fld">System<select name="sys">${S.systems.map(s => `<option value="${s.id}" ${s.id === cur.systemId ? 'selected' : ''}>${esc(s.emoji)} ${esc(s.name)}</option>`).join('')}</select></label>
      <label class="fld">Topic or subtopic<select name="node"></select></label>
      <p class="muted small" id="mvHint"></p>`,
    onOpen: d => {
      const ss = $('[name=sys]', d), nn = $('[name=node]', d), hint = $('#mvHint', d);
      const fill = () => { nn.innerHTML = opts(ss.value); if (ss.value === cur.systemId) nn.value = cur.id; hint.textContent = nn.options.length ? '' : 'This system has no topics yet. Add a topic first.'; };
      ss.addEventListener('change', fill); fill();
    },
    collect: d => $('[name=node]', d).value || false
  });
}

/* ============================== mutations ============================== */
async function addSystem() {
  const v = await dlgSystem(); if (!v) return;
  const rec = { id: uid(), ...v, order: S.systems.length ? Math.max(...S.systems.map(s => s.order)) + 1 : 0, createdAt: Date.now() };
  S.systems.push(rec); await save({ systems: [rec] }); reindex(); render(); toast(`Added ${rec.name}`);
}
async function editSystem(id) {
  const s = IX.sys.get(id); const v = await dlgSystem(s); if (!v) return;
  Object.assign(s, v); await save({ systems: [s] }); reindex(); render(true);
}
async function deleteSystem(id) {
  const s = IX.sys.get(id);
  const nodes = S.nodes.filter(n => n.systemId === id), qas = S.qas.filter(q => q.systemId === id);
  const ok = await confirmDlg(`Delete ${s.name}?`, `This removes the system, its ${plural(nodes.length, 'topic/subtopic')} and ${plural(qas.length, 'question')}. You can undo right after.`);
  if (!ok) return;
  S.systems = S.systems.filter(x => x.id !== id); S.nodes = S.nodes.filter(n => n.systemId !== id); S.qas = S.qas.filter(q => q.systemId !== id);
  await save({}, { systems: [id], nodes: nodes.map(n => n.id), qas: qas.map(q => q.id) });
  reindex();
  const r = parseRoute(); if ((r.v === 'system' && r.id === id) || r.v === 'node') location.hash = '#/'; else render();
  toast(`Deleted ${s.name}`, { undo: () => restore({ systems: [s], nodes, qas }) });
}
async function restore(data) {
  S.systems.push(...(data.systems || [])); S.nodes.push(...(data.nodes || [])); S.qas.push(...(data.qas || []));
  await save({ systems: data.systems || [], nodes: data.nodes || [], qas: data.qas || [] });
  reindex(); render(true); toast('Restored');
}

async function addNode(systemId, parentId) {
  const isSub = !!parentId;
  const name = await dlgName(isSub ? 'New subtopic' : 'New topic', isSub ? 'Subtopic name' : 'Topic name', '', isSub ? 'Add subtopic' : 'Add topic');
  if (!name) return;
  const sibs = isSub ? subsOf(parentId) : topicsOf(systemId);
  const rec = { id: uid(), systemId, parentId: parentId || null, name, order: sibs.length ? Math.max(...sibs.map(x => x.order)) + 1 : 0, createdAt: Date.now() };
  S.nodes.push(rec); await save({ nodes: [rec] }); reindex();
  if (!ST.expanded.includes(systemId)) ST.expanded.push(systemId);
  if (parentId && !ST.expanded.includes(parentId)) ST.expanded.push(parentId);
  saveST(); render(true);
}
async function renameNode(id) {
  const n = IX.node.get(id); const name = await dlgName('Rename', 'Name', n.name, 'Save'); if (!name) return;
  n.name = name; await save({ nodes: [n] }); reindex(); render(true);
}
async function deleteNode(id) {
  const n = IX.node.get(id);
  const gone = [n, ...subsOf(id)]; const ids = new Set(gone.map(x => x.id));
  const qas = S.qas.filter(q => ids.has(q.nodeId));
  const ok = await confirmDlg(`Delete ${n.name}?`, `This removes ${n.parentId ? 'the subtopic' : `the topic${gone.length > 1 ? ' and its ' + plural(gone.length - 1, 'subtopic') : ''}`} and ${plural(qas.length, 'question')}. You can undo right after.`);
  if (!ok) return;
  S.nodes = S.nodes.filter(x => !ids.has(x.id)); S.qas = S.qas.filter(q => !ids.has(q.nodeId));
  await save({}, { nodes: [...ids], qas: qas.map(q => q.id) });
  reindex();
  const r = parseRoute();
  if (r.v === 'node' && ids.has(r.id)) location.hash = n.parentId ? `#/n/${n.parentId}` : `#/s/${n.systemId}`; else render(true);
  toast(`Deleted ${n.name}`, { undo: () => restore({ nodes: gone, qas }) });
}
async function deleteQa(id) {
  const q = S.qas.find(x => x.id === id); if (!q) return;
  S.qas = S.qas.filter(x => x.id !== id); await save({}, { qas: [id] }); reindex(); render(true);
  toast('Question deleted', { undo: () => restore({ qas: [q] }) });
}
async function moveQa(id) {
  const q = S.qas.find(x => x.id === id); const target = await dlgMove(q); if (!target || target === q.nodeId) return;
  const tn = IX.node.get(target), sibs = qasOf(target);
  q.nodeId = target; q.systemId = tn.systemId; q.order = sibs.length ? Math.max(...sibs.map(x => x.order)) + 1 : 0;
  await save({ qas: [q] }); reindex(); render(true); toast('Question moved');
}

/* ============================== routing ============================== */
function parseRoute() {
  const h = location.hash.replace(/^#\/?/, ''); const p = h.split('/');
  if (p[0] === 's' && p[1]) return { v: 'system', id: p[1] };
  if (p[0] === 'n' && p[1]) return { v: 'node', id: p[1], qa: p[2] };
  if (p[0] === 'search') return { v: 'search', q: decodeURIComponent(p.slice(1).join('/')) };
  return { v: 'home' };
}
function ensureExpanded(r) {
  let n = r.v === 'node' ? IX.node.get(r.id) : null, ids = [];
  if (r.v === 'system') ids = [r.id];
  if (n) ids = [n.systemId, n.parentId, n.id].filter(Boolean);
  let ch = false; ids.forEach(i => { if (!ST.expanded.includes(i)) { ST.expanded.push(i); ch = true; } });
  if (ch) saveST();
}
function goSearch(q) {
  const h = '#/search/' + encodeURIComponent(q);
  if (parseRoute().v === 'search') { history.replaceState(null, '', h); render(); } else location.hash = h;
}

/* ============================== views ============================== */
const sep = '<span class="sep" aria-hidden="true">›</span>';
const counts = (a, b) => `<div class="counts"><span><b>${a[0]}</b> ${a[0] === 1 ? a[1] : a[1] + 's'}</span>${b ? `<span><b>${b[0]}</b> ${b[0] === 1 ? b[1] : b[1] + 's'}</span>` : ''}</div>`;

function sysCard(s) {
  return `<article class="card sys" draggable="true" tabindex="0" role="link" data-id="${s.id}" style="--c:${s.color}" aria-label="${esc(s.name)}">
    <div class="badge" aria-hidden="true">${esc(s.emoji)}</div>
    <div><h3>${esc(s.name)}</h3>${counts([topicsOf(s.id).length, 'topic'], [IX.sysQ.get(s.id) || 0, 'question'])}</div>
    <button class="icon-btn more" data-act="sys-menu" data-id="${s.id}" aria-label="Options for ${esc(s.name)}">${ic('dots')}</button>
  </article>`;
}
function viewHome() {
  const nT = S.nodes.filter(n => !n.parentId).length, nQ = S.qas.length;
  const last = ST.lastNode && IX.node.get(ST.lastNode);
  let banner = '';
  if (nQ > 0 && Date.now() - ST.lastBackup > 7 * 864e5) {
    const days = ST.lastBackup ? Math.floor((Date.now() - ST.lastBackup) / 864e5) : 0;
    banner = `<div class="banner"><p><b>${ST.lastBackup ? `Last backup was ${plural(days, 'day')} ago.` : 'No backup yet.'}</b> Your book is stored only in this browser, so keep a backup file somewhere safe.</p><button class="btn small" data-act="backup-now">${ic('download', 16)} Back up now</button></div>`;
  }
  return `<section>
    <div class="home-head">
      <div><h1>FCPS Book</h1><p class="tally">${plural(S.systems.length, 'system')}, ${plural(nT, 'topic')}, ${plural(nQ, 'question')}</p></div>
      <div class="head-actions">
        ${last ? `<a class="btn resume" href="#/n/${last.id}">${ic('book', 16)}<span class="t">Continue: ${esc(last.name)}</span></a>` : ''}
        <button class="btn primary" data-act="add-system">${ic('plus', 16)} Add system</button>
      </div>
    </div>
    ${banner}
    ${S.systems.length ? `<div class="grid" id="grid">${S.systems.map(sysCard).join('')}
      <button class="card add" data-act="add-system">${ic('plus', 18)} Add system</button></div>
      <p class="hint">Drag a card to reorder, or use the ⋮ menu on any card.</p>`
      : `<div class="empty"><p>No systems yet. Add your first one to start building the book.</p><button class="btn primary" data-act="add-system">${ic('plus', 16)} Add system</button></div>`}
  </section>`;
}

function viewSystem(s) {
  const tops = topicsOf(s.id);
  return `<section style="--c:${s.color}">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">All systems</a>${sep}<span>${esc(s.name)}</span></nav>
    <div class="sys-hero page-head">
      <div class="badge lg" aria-hidden="true">${esc(s.emoji)}</div>
      <div class="grow"><h1>${esc(s.name)}</h1>${counts([tops.length, 'topic'], [IX.sysQ.get(s.id) || 0, 'question'])}</div>
      <div class="actions">
        <button class="btn primary" data-act="add-topic" data-id="${s.id}">${ic('plus', 16)} Add topic</button>
        <button class="icon-btn" data-act="sys-menu" data-id="${s.id}" aria-label="System options">${ic('dots')}</button>
      </div>
    </div>
    ${tops.length ? `<div class="topics">${tops.map(t => {
      const subs = subsOf(t.id), total = qCountNode(t.id);
      return `<article class="topic" style="--c:${s.color}">
        <div class="topic-top"><a href="#/n/${t.id}">${esc(t.name)}</a>
          <button class="icon-btn" data-act="node-menu" data-id="${t.id}" aria-label="Options for ${esc(t.name)}">${ic('dots')}</button></div>
        <span class="pill">${plural(total, 'question')}</span>
        <div class="chips">${subs.map(x => `<a class="chip" href="#/n/${x.id}">${esc(x.name)} <i>${qasOf(x.id).length}</i></a>`).join('')}
          <button class="chip add" data-act="add-sub" data-id="${t.id}">${ic('plus', 14)} Subtopic</button></div>
      </article>`;
    }).join('')}</div>`
      : `<div class="empty" style="margin-top:22px"><p>No topics in this system yet.</p><button class="btn primary" data-act="add-topic" data-id="${s.id}">${ic('plus', 16)} Add topic</button></div>`}
  </section>`;
}

function qaCard(q, i) {
  const closed = collapsed.has(q.id);
  return `<article class="qa${closed ? ' closed' : ''}" id="qa-${q.id}" data-id="${q.id}">
    <header class="qa-head" data-act="toggle-qa" data-id="${q.id}">
      <span class="qa-n">${i + 1}</span>
      <h3>${esc(q.q)}</h3>
      <span class="qa-tools">
        <button class="icon-btn" data-act="edit-qa" data-id="${q.id}" aria-label="Edit question" title="Edit">${ic('edit', 17)}</button>
        <button class="icon-btn" data-act="qa-menu" data-id="${q.id}" aria-label="More options" title="More">${ic('dots', 17)}</button>
        <span class="icon-btn chev" aria-hidden="true">${ic('down', 17)}</span>
      </span>
    </header>
    <div class="qa-body rich">${q.a || '<p class="ph">No answer written yet.</p>'}</div>
  </article>`;
}
const collapsed = new Set();

function viewNode(n) {
  const s = IX.sys.get(n.systemId), parent = n.parentId ? IX.node.get(n.parentId) : null, topic = parent || n;
  const subs = subsOf(topic.id), qs = qasOf(n.id);
  const chip = (x, label, cnt) => `<a class="chip${x.id === n.id ? ' on' : ''}" href="#/n/${x.id}">${esc(label)} <i>${cnt}</i></a>`;
  return `<section style="--c:${s.color}">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">All systems</a>${sep}<a href="#/s/${s.id}">${esc(s.name)}</a>${parent ? sep + `<a href="#/n/${parent.id}">${esc(parent.name)}</a>` : ''}${sep}<span>${esc(n.name)}</span></nav>
    <div class="page-head">
      <div class="grow"><div class="bar-accent"></div><h1>${esc(n.name)}</h1>
        <p class="sub">${plural(qs.length, 'question')}${!parent && subs.length ? ` here, ${qCountNode(n.id)} including subtopics` : ''}</p></div>
      <div class="actions">
        <button class="btn primary" data-act="new-qa" data-id="${n.id}">${ic('plus', 16)} New question</button>
        <button class="icon-btn" data-act="node-menu" data-id="${n.id}" aria-label="Options">${ic('dots')}</button>
      </div>
    </div>
    <div class="chips" style="margin:-6px 0 6px">
      ${subs.length || parent ? chip(topic, 'General', qasOf(topic.id).length) : ''}
      ${subs.map(x => chip(x, x.name, qasOf(x.id).length)).join('')}
      <button class="chip add" data-act="add-sub" data-id="${topic.id}">${ic('plus', 14)} Subtopic</button>
    </div>
    ${qs.length ? `<div class="list-bar"><span>${plural(qs.length, 'question')}</span>
        ${qs.length > 1 ? `<span><button class="btn small ghost" data-act="collapse-all">Collapse all</button> <button class="btn small ghost" data-act="expand-all">Expand all</button></span>` : ''}</div>
      <div class="qa-list">${qs.map(qaCard).join('')}</div>`
      : `<div class="empty" style="margin-top:20px"><p>No questions here yet.</p><button class="btn primary" data-act="new-qa" data-id="${n.id}">${ic('plus', 16)} New question</button></div>`}
  </section>`;
}

function hl(text, terms) {
  const e = esc(text); if (!terms.length) return e;
  return e.replace(new RegExp('(' + terms.map(t => reEsc(esc(t))).join('|') + ')', 'gi'), '<mark>$1</mark>');
}
function pathOf(n) {
  const s = IX.sys.get(n.systemId), p = n.parentId ? IX.node.get(n.parentId) : null;
  return [s.name, p && p.name, n.name].filter(Boolean).join(' › ');
}
function viewSearch(query) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return `<section><div class="empty"><p>Type in the search box to look through every question, answer and topic.</p></div></section>`;
  const all = l => terms.every(t => l.indexOf(t) > -1);
  const sysHits = S.systems.filter(s => all(s.name.toLowerCase()));
  const nodeHits = S.nodes.filter(n => all(n.name.toLowerCase()));
  const qHits = [];
  for (const q of S.qas) { const t = qText(q); if (all(t.l)) qHits.push([q, t]); }
  qHits.sort((a, b) => (all(b[1].ql) ? 1 : 0) - (all(a[1].ql) ? 1 : 0));
  const shown = qHits.slice(0, 80);
  const snip = t => {
    const low = t.t.toLowerCase(), found = terms.map(x => low.indexOf(x)).filter(i => i > -1);
    if (!found.length) return '';
    const li = Math.min(...found), a = Math.max(0, li - 70), b = Math.min(t.t.length, li + 150);
    return (a > 0 ? '…' : '') + t.t.slice(a, b) + (b < t.t.length ? '…' : '');
  };
  let html = `<section><nav class="crumbs"><a href="#/">All systems</a>${sep}<span>Search</span></nav>
    <div class="page-head"><div class="grow"><h1>Search</h1><p class="sub">${plural(qHits.length, 'question')} and ${plural(sysHits.length + nodeHits.length, 'topic')} matching “${esc(query)}”</p></div></div>`;
  if (sysHits.length || nodeHits.length) {
    html += `<h2 class="group-title">Systems and topics</h2><div class="results">` +
      sysHits.map(s => `<a class="res" style="--c:${s.color}" href="#/s/${s.id}"><div class="rq">${esc(s.emoji)} ${hl(s.name, terms)}</div></a>`).join('') +
      nodeHits.slice(0, 40).map(n => `<a class="res" style="--c:${IX.sys.get(n.systemId).color}" href="#/n/${n.id}"><div class="path">${esc(pathOf(n))}</div><div class="rq">${hl(n.name, terms)}</div></a>`).join('') + `</div>`;
  }
  if (shown.length) {
    html += `<h2 class="group-title">Questions</h2><div class="results">` + shown.map(([q, t]) => {
      const n = IX.node.get(q.nodeId); if (!n) return '';
      const sn = snip(t);
      return `<a class="res" style="--c:${IX.sys.get(q.systemId).color}" href="#/n/${n.id}/${q.id}"><div class="path">${esc(pathOf(n))}</div><div class="rq">${hl(q.q, terms)}</div>${sn ? `<div class="snip">${hl(sn, terms)}</div>` : ''}</a>`;
    }).join('') + `</div>` + (qHits.length > shown.length ? `<p class="hint">Showing the first ${shown.length}. Add another word to narrow the search.</p>` : '');
  }
  if (!qHits.length && !sysHits.length && !nodeHits.length) html += `<div class="empty"><p>Nothing found. Try fewer or different words.</p></div>`;
  return html + '</section>';
}

/* ============================== sidebar tree ============================== */
function renderTree() {
  const sb = $('#sidebar'), keep = sb.scrollTop, r = parseRoute();
  const curNode = r.v === 'node' ? IX.node.get(r.id) : null;
  const open = id => ST.expanded.includes(id);
  const row = (cls, id, href, emoji, name, count, hasKids, on, color) =>
    `<div class="trow ${cls}${on ? ' on' : ''}" ${color ? `style="--c:${color}"` : ''}>
      <button class="caret ${hasKids ? (open(id) ? 'open' : '') : 'none'}" data-act="tog" data-id="${id}" aria-label="${open(id) ? 'Collapse' : 'Expand'}" ${hasKids ? '' : 'tabindex="-1"'}>${ic('right', 15)}</button>
      <a class="tname" href="${href}">${emoji ? `<span class="em">${esc(emoji)}</span>` : ''}<span class="t">${esc(name)}</span></a>
      <span class="tcount">${count || ''}</span></div>`;
  let h = `<a class="tree-home${r.v === 'home' ? ' on' : ''}" href="#/">${ic('home', 17)} All systems</a>`;
  if (!S.systems.length) h += `<p class="tree-empty">Your systems will appear here.</p>`;
  for (const s of S.systems) {
    const tops = topicsOf(s.id);
    h += row('sys', s.id, `#/s/${s.id}`, s.emoji, s.name, IX.sysQ.get(s.id) || 0, tops.length > 0, (r.v === 'system' && r.id === s.id), s.color);
    if (open(s.id) && tops.length) {
      h += `<div class="tkids" style="--c:${s.color}">`;
      for (const t of tops) {
        const subs = subsOf(t.id);
        h += row('top', t.id, `#/n/${t.id}`, '', t.name, qCountNode(t.id), subs.length > 0, curNode && curNode.id === t.id, s.color);
        if (open(t.id) && subs.length) {
          h += `<div class="tkids" style="--c:${s.color}">` + subs.map(x => row('sub', x.id, `#/n/${x.id}`, '', x.name, qasOf(x.id).length, false, curNode && curNode.id === x.id, s.color)).join('') + `</div>`;
        }
      }
      h += `</div>`;
    }
  }
  sb.innerHTML = h; sb.scrollTop = keep;
  const on = $('.trow.on', sb); if (on) on.scrollIntoView({ block: 'nearest' });
}

/* ============================== render ============================== */
let flashId = null;
function render(keepScroll) {
  const main = $('#main'), sc = main.scrollTop, r = parseRoute();
  let html = '', title = 'FCPS Book';
  if (r.v === 'system') {
    const s = IX.sys.get(r.id); if (!s) { location.hash = '#/'; return; }
    html = viewSystem(s); title = s.name;
  } else if (r.v === 'node') {
    const n = IX.node.get(r.id); if (!n) { location.hash = '#/'; return; }
    html = viewNode(n); title = n.name;
    if (ST.lastNode !== n.id) { ST.lastNode = n.id; saveST(); }
  } else if (r.v === 'search') {
    html = viewSearch(r.q); title = 'Search';
    const qi = $('#q'); if (qi && document.activeElement !== qi) qi.value = r.q;
  } else html = viewHome();
  if (r.v !== 'search') { const qi = $('#q'); if (qi && document.activeElement !== qi) qi.value = ''; }
  main.innerHTML = html;
  document.title = title === 'FCPS Book' ? title : `${title} · FCPS Book`;
  main.scrollTop = keepScroll ? sc : 0;
  if (r.v === 'node' && r.qa) { const el = $('#qa-' + r.qa); if (el) { el.classList.remove('closed'); collapsed.delete(r.qa); el.scrollIntoView({ block: 'start' }); el.classList.add('flash'); } }
  if (flashId) { const el = $('#qa-' + flashId); if (el) { el.classList.add('flash'); if (!keepScroll) el.scrollIntoView({ block: 'nearest' }); } flashId = null; }
  renderTree();
}
function onRoute() {
  ensureExpanded(parseRoute());
  document.body.classList.remove('drawer');
  closeMenu(); render();
}

/* ============================== editor ============================== */
const PAL_TEXT = ['#C62828', '#E65100', '#B8860B', '#2E7D32', '#00838F', '#1565C0', '#6A1B9A', '#AD1457', '#455A64', '#000000', '#FFFFFF'];
const PAL_HL = ['#FFF176', '#FFCC80', '#A5D6A7', '#81D4FA', '#CE93D8', '#F48FB1', '#FFAB91', 'none'];
const SIZES = [12, 14, 16, 18, 20, 22, 24, 28, 32, 40];

function openEditor(nodeId, qa) {
  const n = IX.node.get(nodeId), sys = IX.sys.get(n.systemId), p = n.parentId ? IX.node.get(n.parentId) : null;
  const where = [sys.name, p && p.name, n.name].filter(Boolean).join(' › ');
  const d = document.createElement('dialog'); d.className = 'editor';
  const tb = (cmd, icon, label, val) => `<button type="button" class="tbtn" data-cmd="${cmd}" ${val ? `data-val="${val}"` : ''} title="${label}" aria-label="${label}">${icon}</button>`;
  d.innerHTML = `
    <div class="ed-top">
      <div class="ed-where" style="--c:${sys.color}"><span class="dotc"></span><span class="t">${esc(where)}</span></div>
      <div class="ed-btns">
        <button type="button" class="btn" data-e="cancel">Cancel</button>
        ${qa ? '' : '<button type="button" class="btn" data-e="next">Save and add next</button>'}
        <button type="button" class="btn primary" data-e="save">${qa ? 'Save changes' : 'Save'}</button>
      </div>
    </div>
    <div class="ed-q"><label for="edQ">Question</label><textarea id="edQ" rows="2" placeholder="Type the question"></textarea></div>
    <div class="tb" role="toolbar" aria-label="Formatting">
      <select data-sel="font" aria-label="Font"><option value="" selected disabled>Font</option>${FONTS.map(f => `<option value="${f.name}">${f.name}</option>`).join('')}</select>
      <select data-sel="size" aria-label="Font size"><option value="" selected disabled>Size</option>${SIZES.map(s => `<option value="${s}">${s}</option>`).join('')}</select>
      <select data-sel="block" aria-label="Paragraph style"><option value="p">Normal</option><option value="h3">Heading</option><option value="h4">Subheading</option></select>
      <span class="sep"></span>
      ${tb('bold', '<b>B</b>', 'Bold (Ctrl/Cmd+B)')}${tb('italic', '<i>I</i>', 'Italic (Ctrl/Cmd+I)')}${tb('underline', '<u>U</u>', 'Underline (Ctrl/Cmd+U)')}${tb('strikeThrough', '<s>S</s>', 'Strikethrough')}
      <button type="button" class="tbtn" data-pal="fore" title="Text colour" aria-label="Text colour"><span class="tcol"><b>A</b><span class="cbar" style="background:#C62828"></span></span></button>
      <button type="button" class="tbtn" data-pal="back" title="Highlight" aria-label="Highlight"><span class="tcol"><b>H</b><span class="cbar" style="background:#FFF176"></span></span></button>
      <span class="sep"></span>
      ${tb('justifyLeft', ic('alignL', 17), 'Align left')}${tb('justifyCenter', ic('alignC', 17), 'Centre')}${tb('justifyRight', ic('alignR', 17), 'Align right')}${tb('justifyFull', ic('alignJ', 17), 'Justify')}
      <span class="sep"></span>
      ${tb('insertUnorderedList', ic('ul', 17), 'Bulleted list')}${tb('insertOrderedList', ic('ol', 17), 'Numbered list')}
      <span class="sep"></span>
      ${tb('removeFormat', ic('eraser', 17), 'Clear formatting')}${tb('undo', ic('undo', 17), 'Undo')}${tb('redo', ic('redo', 17), 'Redo')}
      <div class="pal" hidden></div>
    </div>
    <div class="ed-a-wrap"><div id="edA" class="rich editable" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Answer" data-ph="Write or paste the answer here"></div></div>`;
  document.body.appendChild(d);
  const ed = $('#edA', d), eq = $('#edQ', d), pal = $('.pal', d);
  eq.value = qa ? qa.q : ''; ed.innerHTML = qa ? qa.a : '';
  const snap = () => eq.value + '\u0000' + ed.innerHTML;
  let base = snap();
  const fit = () => { eq.style.height = 'auto'; eq.style.height = Math.min(eq.scrollHeight + 2, 200) + 'px'; };
  eq.addEventListener('input', fit);

  let saved = null;
  const onSel = () => { const s = getSelection(); if (s.rangeCount && ed.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); };
  document.addEventListener('selectionchange', onSel);
  const withSel = fn => {
    ed.focus();
    if (saved) { const s = getSelection(); s.removeAllRanges(); s.addRange(saved); }
    try { document.execCommand('styleWithCSS', false, true); } catch (e) {}
    fn(); onSel();
  };
  ed.addEventListener('focus', () => {
    try { document.execCommand('styleWithCSS', false, true); document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) {}
    if (!ed.innerHTML.trim()) { /* start with a real paragraph so the first line behaves like the rest */
      const clean = snap() === base;
      ed.innerHTML = '<p><br></p>';
      if (clean) base = snap();
      const r = document.createRange(); r.setStart(ed.firstChild, 0); r.collapse(true);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    }
  });

  ed.addEventListener('paste', e => {
    e.preventDefault();
    const cd = e.clipboardData, html = cd.getData('text/html');
    if (html) document.execCommand('insertHTML', false, sanitize(html, true));
    else document.execCommand('insertHTML', false, cd.getData('text/plain').split(/\r?\n/).map(l => `<p>${l.trim() ? esc(l) : '<br>'}</p>`).join(''));
  });
  ed.addEventListener('drop', e => { if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) e.preventDefault(); });

  const showPal = (btn, kind) => {
    const list = kind === 'fore' ? PAL_TEXT : PAL_HL;
    pal.innerHTML = list.map(c => c === 'none'
      ? `<button type="button" data-c="none" title="No highlight" aria-label="No highlight">✕</button>`
      : `<button type="button" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('') +
      `<label title="Custom colour" style="background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red)"><input type="color" data-custom value="#1565C0"></label>`;
    pal.dataset.kind = kind; pal.hidden = false;
    pal.style.left = Math.min(btn.offsetLeft, Math.max(0, $('.tb', d).clientWidth - 260)) + 'px';
  };
  const applyColor = (kind, c) => {
    withSel(() => {
      if (kind === 'fore') document.execCommand('foreColor', false, c);
      else document.execCommand('hiliteColor', false, c === 'none' ? 'transparent' : c);
    });
    const bar = $(`[data-pal="${kind}"] .cbar`, d); if (bar && c !== 'none') bar.style.background = c;
    pal.hidden = true;
  };
  pal.addEventListener('mousedown', e => { if (!e.target.closest('input')) e.preventDefault(); });
  pal.addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) applyColor(pal.dataset.kind, b.dataset.c); });
  pal.addEventListener('change', e => { if (e.target.matches('[data-custom]')) applyColor(pal.dataset.kind, e.target.value); });

  $('.tb', d).addEventListener('mousedown', e => { if (!e.target.closest('select,input,label')) e.preventDefault(); });
  d.addEventListener('click', e => {
    if (!e.target.closest('.pal') && !e.target.closest('[data-pal]')) pal.hidden = true;
    const c = e.target.closest('[data-cmd]');
    if (c) { withSel(() => document.execCommand(c.dataset.cmd, false, c.dataset.val || null)); return; }
    const pb = e.target.closest('[data-pal]');
    if (pb) { if (!pal.hidden && pal.dataset.kind === pb.dataset.pal) pal.hidden = true; else showPal(pb, pb.dataset.pal); return; }
    const a = e.target.closest('[data-e]');
    if (a) { if (a.dataset.e === 'cancel') tryClose(); else doSave(a.dataset.e === 'next'); }
  });
  d.addEventListener('change', e => {
    const s = e.target.closest('[data-sel]'); if (!s || !s.value) return;
    const v = s.value, kind = s.dataset.sel;
    withSel(() => {
      if (kind === 'font') document.execCommand('fontName', false, v);
      else if (kind === 'block') document.execCommand('formatBlock', false, `<${v}>`);
      else if (kind === 'size') {
        document.execCommand('fontSize', false, '7');
        $$('font[size="7"], span', ed).forEach(x => {
          if (x.tagName === 'FONT') { x.removeAttribute('size'); x.style.fontSize = v + 'px'; }
          else if (x.style && x.style.fontSize === 'xxx-large') x.style.fontSize = v + 'px';
        });
      }
    });
    if (kind !== 'block') s.selectedIndex = 0; 
  });

  const cleanup = () => { document.removeEventListener('selectionchange', onSel); d.close(); d.remove(); };
  const tryClose = async () => {
    if (snap() !== base) { const ok = await confirmDlg('Discard changes?', 'You have unsaved changes to this question.', 'Discard'); if (!ok) return; }
    cleanup();
  };
  d.addEventListener('cancel', e => { e.preventDefault(); tryClose(); });
  d.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); doSave(false); } });

  async function doSave(next) {
    const qv = eq.value.trim();
    if (!qv) { toast('Type the question first'); eq.focus(); return; }
    let a = sanitize(ed.innerHTML, false);
    if (!stripHtml(a)) a = '';
    let rec = qa;
    try {
      if (qa) { qa.q = qv; qa.a = a; qa.updatedAt = Date.now(); await save({ qas: [qa] }); }
      else {
        const sibs = qasOf(nodeId);
        rec = { id: uid(), systemId: n.systemId, nodeId, q: qv, a, order: sibs.length ? Math.max(...sibs.map(x => x.order)) + 1 : 0, createdAt: Date.now(), updatedAt: Date.now() };
        S.qas.push(rec); await save({ qas: [rec] });
      }
    } catch (e) { return; }
    reindex(); flashId = rec.id;
    if (next) {
      eq.value = ''; ed.innerHTML = ''; base = snap(); fit(); eq.focus(); render(true); toast('Saved. Ready for the next question.');
    } else { base = snap(); cleanup(); render(true); toast('Saved'); }
  }
  d.showModal(); fit();
  (qa ? ed : eq).focus();
}

/* ============================== settings + backup ============================== */
function exportBackup() {
  const data = { app: 'fcps-book', version: 1, exportedAt: new Date().toISOString(), settings: { theme: ST.theme, uiFont: ST.uiFont, noteFont: ST.noteFont, noteSize: ST.noteSize }, systems: S.systems, nodes: S.nodes, qas: S.qas };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `fcps-book-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  ST.lastBackup = Date.now(); saveST();
  toast(`Backup saved: ${plural(S.qas.length, 'question')}`);
  if (parseRoute().v === 'home') render(true);
}
function pickBackup() {
  const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
  i.onchange = async () => {
    const f = i.files && i.files[0]; if (!f) return;
    try { await importBackup(JSON.parse(await f.text())); }
    catch (e) { if (e && e.message !== 'cancelled') toast('That file could not be read. Choose a backup made by FCPS Book.'); }
  };
  i.click();
}
async function importBackup(data) {
  if (!data || data.app !== 'fcps-book' || !Array.isArray(data.systems) || !Array.isArray(data.nodes) || !Array.isArray(data.qas)) throw new Error('bad');
  const sysIds = new Set(data.systems.filter(s => s && s.id && s.name).map(s => s.id));
  const systems = data.systems.filter(s => sysIds.has(s.id)).map(s => ({ id: s.id, name: String(s.name), emoji: s.emoji || '📚', color: SAFE_COLOR.test(s.color || '') ? s.color : COLORS[0], order: +s.order || 0, createdAt: s.createdAt || Date.now() }));
  const nodes = data.nodes.filter(n => n && n.id && n.name && sysIds.has(n.systemId)).map(n => ({ id: n.id, systemId: n.systemId, parentId: n.parentId || null, name: String(n.name), order: +n.order || 0, createdAt: n.createdAt || Date.now() }));
  const nodeIds = new Set(nodes.map(n => n.id));
  const qas = data.qas.filter(q => q && q.id && nodeIds.has(q.nodeId) && sysIds.has(q.systemId)).map(q => ({ id: q.id, systemId: q.systemId, nodeId: q.nodeId, q: String(q.q || ''), a: sanitize(q.a || '', false), order: +q.order || 0, createdAt: q.createdAt || Date.now(), updatedAt: q.updatedAt || Date.now() }));
  const mode = await openDialog({
    title: 'Restore from backup', primary: 'Restore', wide: false,
    html: `<p>This file has ${plural(systems.length, 'system')}, ${plural(nodes.length, 'topic/subtopic')} and ${plural(qas.length, 'question')}.</p>
      <label class="radio-row"><input type="radio" name="mode" value="merge" checked><span><b>Add to my book</b>Keeps what you have and adds or updates items from the file.</span></label>
      <label class="radio-row"><input type="radio" name="mode" value="replace"><span><b>Replace my book</b>Deletes everything here first, then restores the file.</span></label>`,
    collect: d => $('[name=mode]:checked', d).value
  });
  if (!mode) throw new Error('cancelled');
  if (mode === 'replace') {
    await commit({ systems, nodes, qas }, { systems: S.systems.map(x => x.id), nodes: S.nodes.map(x => x.id), qas: S.qas.map(x => x.id) });
    S.systems = systems; S.nodes = nodes; S.qas = qas;
  } else {
    await commit({ systems, nodes, qas });
    const merge = (arr, inc) => { const m = new Map(arr.map(x => [x.id, x])); inc.forEach(x => m.set(x.id, x)); return [...m.values()]; };
    S.systems = merge(S.systems, systems); S.nodes = merge(S.nodes, nodes); S.qas = merge(S.qas, qas);
  }
  IX.text.clear(); reindex(); ST.seeded = true; saveST(); onRoute();
  toast('Backup restored');
}

async function openSettings() {
  const fontGrid = key => FONTS.map(f => `<button type="button" class="font-btn${ST[key] === f.id ? ' on' : ''}" data-font="${key}" data-id="${f.id}" style="font-family:${esc(fontCss(f))}"><b>${esc(f.name)}</b><small>Aa Bb কখগ 123</small></button>`).join('');
  let est = '';
  try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); est = `${(e.usage / 1048576).toFixed(1)} MB used`; } } catch (e) {}
  let persisted = null; try { if (navigator.storage && navigator.storage.persisted) persisted = await navigator.storage.persisted(); } catch (e) {}
  const last = ST.lastBackup ? new Date(ST.lastBackup).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'never';
  await openDialog({
    title: 'Settings', primary: 'Done', secondary: null, wide: true,
    html: `<div class="set-sec"><h3>Theme</h3><div class="theme-grid">${THEMES.map(t => `<button type="button" class="theme-btn${ST.theme === t.id ? ' on' : ''}" data-theme="${t.id}"><span class="sw"><i style="background:${t.c[0]}"></i><i style="background:${t.c[1]}"></i><i style="background:${t.c[2]}"></i></span><span class="n">${t.name}</span></button>`).join('')}</div></div>
      <div class="set-sec"><h3>App font</h3><div class="font-grid" id="fgUi">${fontGrid('uiFont')}</div></div>
      <div class="set-sec"><h3>Answer font</h3><div class="font-grid" id="fgNote">${fontGrid('noteFont')}</div>
        <div class="range-row"><span class="small">Size</span><input type="range" id="szRange" min="14" max="26" step="1" value="${ST.noteSize}" aria-label="Answer text size"><b id="szVal">${ST.noteSize}px</b></div></div>
      <div class="set-sec"><h3>Backup</h3><p class="muted small">Last backup: ${last}. Use a backup file to move your book between your MacBook and iPhone, and to keep it safe.</p>
        <div class="btn-row"><button type="button" class="btn" id="bkExport">${ic('download', 16)} Export backup</button><button type="button" class="btn" id="bkImport">${ic('upload', 16)} Restore from backup</button></div></div>
      <div class="set-sec"><h3>Storage</h3><p class="muted small">${est ? est + '. ' : ''}${persisted === true ? 'This browser has marked your data as persistent.' : 'For the safest storage, install the app: on Mac use Safari > File > Add to Dock; on iPhone use Share > Add to Home Screen.'}</p></div>
      <p class="muted small">FCPS Book, ${APP_VERSION}</p>`,
    onOpen: d => {
      d.addEventListener('click', e => {
        const t = e.target.closest('.theme-btn');
        if (t) { ST.theme = t.dataset.theme; saveST(); applyLook(); $$('.theme-btn', d).forEach(b => b.classList.toggle('on', b === t)); return; }
        const f = e.target.closest('.font-btn');
        if (f) { ST[f.dataset.font] = f.dataset.id; saveST(); applyLook(); $$(`[data-font="${f.dataset.font}"]`, d).forEach(b => b.classList.toggle('on', b === f)); return; }
        if (e.target.closest('#bkExport')) exportBackup();
        if (e.target.closest('#bkImport')) { d.close(); pickBackup(); }
      });
      $('#szRange', d).addEventListener('input', e => { ST.noteSize = +e.target.value; $('#szVal', d).textContent = ST.noteSize + 'px'; saveST(); applyLook(); });
    }
  });
}

/* ============================== events ============================== */
const ACT = {
  'add-system': () => addSystem(),
  'add-topic': el => addNode(el.dataset.id, null),
  'add-sub': el => { const t = IX.node.get(el.dataset.id); addNode(t.systemId, t.id); },
  'new-qa': el => openEditor(el.dataset.id),
  'edit-qa': el => { const q = S.qas.find(x => x.id === el.dataset.id); if (q) openEditor(q.nodeId, q); },
  'toggle-qa': el => { const id = el.dataset.id, a = $('#qa-' + id); if (collapsed.has(id)) collapsed.delete(id); else collapsed.add(id); a.classList.toggle('closed'); },
  'collapse-all': () => { $$('.qa').forEach(a => { collapsed.add(a.dataset.id); a.classList.add('closed'); }); },
  'expand-all': () => { collapsed.clear(); $$('.qa').forEach(a => a.classList.remove('closed')); },
  'backup-now': () => exportBackup(),
  'tog': el => {
    const id = el.dataset.id, i = ST.expanded.indexOf(id);
    if (i > -1) ST.expanded.splice(i, 1); else ST.expanded.push(id);
    saveST(); renderTree();
  },
  'sys-menu': el => {
    const s = IX.sys.get(el.dataset.id), horizontal = !!el.closest('.card');
    openMenu(el, [
      { label: 'Add topic', icon: 'plus', run: () => addNode(s.id, null) },
      { label: 'Edit name, icon and colour', icon: 'edit', run: () => editSystem(s.id) },
      '-', ...orderItems('systems', S.systems, s.id, horizontal), '-',
      { label: 'Delete system', icon: 'trash', danger: true, run: () => deleteSystem(s.id) }
    ]);
  },
  'node-menu': el => {
    const n = IX.node.get(el.dataset.id);
    openMenu(el, [
      { label: n.parentId ? 'Add another subtopic' : 'Add subtopic', icon: 'plus', run: () => addNode(n.systemId, n.parentId || n.id) },
      { label: 'Rename', icon: 'edit', run: () => renameNode(n.id) },
      '-', ...orderItems('nodes', siblingsOf(n), n.id, false), '-',
      { label: n.parentId ? 'Delete subtopic' : 'Delete topic', icon: 'trash', danger: true, run: () => deleteNode(n.id) }
    ]);
  },
  'qa-menu': el => {
    const q = S.qas.find(x => x.id === el.dataset.id);
    openMenu(el, [
      { label: 'Edit', icon: 'edit', run: () => openEditor(q.nodeId, q) },
      { label: 'Move to another topic', icon: 'move', run: () => moveQa(q.id) },
      '-', ...orderItems('qas', qasOf(q.nodeId), q.id, false), '-',
      { label: 'Delete question', icon: 'trash', danger: true, run: () => deleteQa(q.id) }
    ]);
  }
};

function wire() {
  $('#menuBtn').innerHTML = ic('menu', 20);
  $('#settingsBtn').innerHTML = ic('sliders', 20);
  $('.brand-mark').innerHTML = ic('book', 18);
  $('.search-ic').innerHTML = ic('search', 17);
  $('#kbdHint').textContent = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘K' : 'Ctrl K';

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (el) { e.preventDefault(); const f = ACT[el.dataset.act]; if (f) f(el, e); return; }
    const card = e.target.closest('.card.sys');
    if (card) location.hash = '#/s/' + card.dataset.id;
  });
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.card.sys')) { e.preventDefault(); location.hash = '#/s/' + e.target.dataset.id; }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !$('dialog[open]')) { e.preventDefault(); $('#q').focus(); $('#q').select(); }
  });
  $('#settingsBtn').addEventListener('click', openSettings);
  $('#menuBtn').addEventListener('click', () => document.body.classList.toggle('drawer'));
  $('#scrim').addEventListener('click', () => document.body.classList.remove('drawer'));

  let timer = null; const qi = $('#q');
  qi.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { const v = qi.value.trim(); if (v) goSearch(v); else if (parseRoute().v === 'search') location.hash = '#/'; }, 180);
  });
  qi.addEventListener('keydown', e => { if (e.key === 'Enter') { clearTimeout(timer); const v = qi.value.trim(); if (v) goSearch(v); } if (e.key === 'Escape') { qi.value = ''; qi.blur(); } });

  /* drag to reorder system cards */
  const main = $('#main'); let dragId = null;
  main.addEventListener('dragstart', e => {
    const c = e.target.closest && e.target.closest('.card.sys'); if (!c) return;
    dragId = c.dataset.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); c.classList.add('dragging');
  });
  main.addEventListener('dragover', e => {
    if (!dragId) return; const c = e.target.closest('.card.sys');
    $$('.drop-target').forEach(x => x.classList.remove('drop-target'));
    if (c && c.dataset.id !== dragId) { e.preventDefault(); c.classList.add('drop-target'); }
  });
  main.addEventListener('drop', e => {
    if (!dragId) return; const c = e.target.closest('.card.sys'); e.preventDefault();
    if (c && c.dataset.id !== dragId) reorderTo('systems', S.systems, dragId, S.systems.findIndex(s => s.id === c.dataset.id));
    dragId = null;
  });
  main.addEventListener('dragend', () => { dragId = null; $$('.dragging,.drop-target').forEach(x => x.classList.remove('dragging', 'drop-target')); });

  window.addEventListener('hashchange', onRoute);
}

/* ============================== start ============================== */
async function start() {
  applyLook();
  wire();
  try { db = await openDB(); }
  catch (e) { $('#main').innerHTML = '<div class="empty"><p><b>Storage is not available.</b> Open this app in a normal (not private) browser window.</p></div>'; return; }
  [S.systems, S.nodes, S.qas] = await Promise.all(STORES.map(readAll));
  if (!S.systems.length && !ST.seeded) await seed();
  reindex();
  ensureExpanded(parseRoute());
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
start();
window.__fcps = { S, IX, sanitize, render };  // small handle for debugging in the console
})();
