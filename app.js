/* FCPS Book — Phase 4.2 (system sorting, sidebar finder, import from Claude-made files, shaded boxes, better phone layout)
 * System > Topic > Subtopic > Question & answer. Offline, stored in IndexedDB.
 */
(() => {
'use strict';

const APP_VERSION = 'Phase 4.2';

/* ============================== utilities ============================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
/* first line of a question = its title; the rest (vignette, parts) is shown lighter */
const qHtml = q => { const t = String(q == null ? '' : q), i = t.indexOf('\n'); return i < 0 ? esc(t) : `<span class="q1">${esc(t.slice(0, i))}</span><span class="qrest">${esc(t.slice(i + 1))}</span>`; };
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
  check: '<path d="m5 12 5 5 9-10"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3" fill="currentColor"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  cards: '<rect x="3" y="8" width="14" height="12" rx="2"/><path d="M7 8V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM8.5 12h7M8.5 16h7"/>',
  caseb: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 13h18"/>',
  file: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>',
  shuffle: '<path d="M4 7h4l8 10h4M4 17h4l3-4M13 11l3-4h4M18 5l2 2-2 2M18 15l2 2-2 2"/>'
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
  { id: 'sepia', name: 'Sepia', c: ['#EEE2C6', '#F7EFDB', '#A2551A'] },
  { id: 'ocean', name: 'Ocean', c: ['#E2EFFA', '#F6FAFE', '#0B63CE'] },
  { id: 'forest', name: 'Forest', c: ['#E4F0E6', '#F5FAF5', '#1E7F4F'] },
  { id: 'rose', name: 'Rose', c: ['#FBE9F0', '#FFF7FA', '#C2185B'] },
  { id: 'dark', name: 'Dark', night: 1, c: ['#0E121A', '#161C28', '#4CCFC4'] },
  { id: 'midnight', name: 'Midnight blue', night: 1, c: ['#0A1020', '#111B33', '#6CA8FF'] },
  { id: 'black', name: 'Pure black', night: 1, c: ['#000000', '#0B0B0D', '#7CE0C3'] },
  { id: 'charcoal', name: 'Charcoal', night: 1, c: ['#1B1C1F', '#25272B', '#8AB4F8'] },
  { id: 'nightwarm', name: 'Warm night', night: 1, c: ['#17130E', '#211B14', '#E6A65C'] },
  { id: 'dusk', name: 'Dusk violet', night: 1, c: ['#14101F', '#1D1730', '#B79CFF'] }
];

const SKEY = 'fcpsbook.settings.v1';
const DEF = { theme: 'light', uiFont: 'lato', noteFont: 'lato', noteSize: 17, seeded: false, lastBackup: 0, lastNode: null, expanded: [], persistAsked: false, customTags: [], dashSize: 17, sysListV: 0, fcShuffle: true, sysSort: 'custom', sysSeen: {} };
let ST = { ...DEF };
try { ST = { ...DEF, ...JSON.parse(localStorage.getItem(SKEY) || '{}') }; } catch (e) {}
const saveST = () => { try { localStorage.setItem(SKEY, JSON.stringify(ST)); } catch (e) {} };

function applyLook() {
  const r = document.documentElement;
  r.dataset.theme = ST.theme;
  r.style.setProperty('--font-ui', fontCss(fontById(ST.uiFont)));
  r.style.setProperty('--font-note', fontCss(fontById(ST.noteFont)));
  r.style.setProperty('--note-size', ST.noteSize + 'px');
  r.style.setProperty('--dash-size', (ST.dashSize || 17) + 'px');
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(r).getPropertyValue('--bar').trim() || '#FFFFFF';
}

/* ============================== storage ============================== */
const DB_NAME = 'fcps-book';
const STORES = ['systems', 'nodes', 'qas', 'exams'];
let db = null;

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 2);
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
const S = { systems: [], nodes: [], qas: [], exams: [] };
const IX = { sys: new Map(), node: new Map(), topics: new Map(), subs: new Map(), qaOf: new Map(), sysQ: new Map(), text: new Map(), exam: new Map() };

function reindex() {
  S.systems.sort(byOrder); S.nodes.sort(byOrder); S.qas.sort(byOrder);
  IX.sys = new Map(S.systems.map(s => [s.id, s]));
  IX.node = new Map(S.nodes.map(n => [n.id, n]));
  S.exams.sort(byOrder);
  IX.topics = new Map(); IX.subs = new Map(); IX.qaOf = new Map(); IX.sysQ = new Map(); IX.exam = new Map();
  for (const e of S.exams) push(IX.exam, e.kind, e);
  for (const n of S.nodes) { if (n.parentId) push(IX.subs, n.parentId, n); else push(IX.topics, n.systemId, n); }
  for (const q of S.qas) { push(IX.qaOf, q.nodeId, q); IX.sysQ.set(q.systemId, (IX.sysQ.get(q.systemId) || 0) + 1); }
}
const examsOf = k => IX.exam.get(k) || [];
const findItem = id => S.qas.find(x => x.id === id) || S.exams.find(x => x.id === id);
const storeOf = it => (it.kind ? 'exams' : 'qas');
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
  const names = (q.rev || []).map(revById).concat((q.tags || []).map(tagById)).filter(Boolean).map(x => x.name).join(' ');
  const rec = { u: q.updatedAt, t, l: (q.q + ' ' + t + ' ' + names).toLowerCase(), ql: q.q.toLowerCase() };
  IX.text.set(q.id, rec);
  return rec;
}

function eText(e) {
  const c = IX.text.get(e.id);
  if (c && c.u === e.updatedAt) return c;
  const t = stripHtml(e.body), ek = examById(e.kind), sys = e.systemId && IX.sys.get(e.systemId);
  const names = (e.rev || []).map(revById).concat((e.tags || []).map(tagById)).filter(Boolean).map(x => x.name).join(' ');
  const rec = { u: e.updatedAt, t, l: (e.title + ' ' + t + ' ' + names + ' ' + (ek ? ek.name : '') + ' ' + (sys ? sys.name : '')).toLowerCase(), ql: e.title.toLowerCase() };
  IX.text.set(e.id, rec);
  return rec;
}

const COLORS = ['#EF5B5B', '#F08A24', '#E0A100', '#7CB518', '#2FA36B', '#14A3A3', '#1F9BD1', '#3B6FE0', '#6B5CE7', '#A24BD8', '#E0489F', '#64748B'];
const EMOJIS = ['📚', '🫁', '❤️', '🧠', '😴', '🤰', '💊', '💉', '🏥', '🎯', '📋', '🧓', '🍼', '🔥', '🩺', '🦴', '🚑', '🧒', '🩸', '🧪', '🔬', '⚡', '🌬️', '🦷', '👁️', '🧬', '🩻', '⭐'];

const TAGS = [
  { id: 'hy', name: 'High-yield', color: '#E0A100' },
  { id: 'vi', name: 'Very important', color: '#EF5B5B' },
  { id: 'mk', name: 'Must-know', color: '#F08A24' },
  { id: 'hard', name: 'Hard topic', color: '#A24BD8' },
  { id: 'viva', name: 'Viva', color: '#3B6FE0' },
  { id: 'wr', name: 'Written', color: '#14A3A3' },
  { id: 'ospe', name: 'OSPE', color: '#2FA36B' },
  { id: 'lc', name: 'Long case', color: '#E0489F' },
  { id: 'sc', name: 'Short case', color: '#64748B' }
];
const REVS = [
  { id: 'night', name: 'Night before exam', short: 'Night before', color: '#6B5CE7' },
  { id: 'week', name: '1 week before exam', short: '1 week before', color: '#F08A24' },
  { id: 'month', name: 'Last month', short: 'Last month', color: '#1F9BD1' }
];
const allTags = () => TAGS.concat(ST.customTags || []);
const tagById = id => allTags().find(t => t.id === id);
const revById = id => REVS.find(r => r.id === id);
const ptag = (label, color, icon) => `<span class="ptag" style="--t:${color}">${icon ? ic(icon, 12) : ''}${esc(label)}</span>`;
const qaPills = q => (q.rev || []).map(revById).filter(Boolean).map(r => ptag(r.short, r.color, 'flag')).join('') +
  (q.tags || []).map(tagById).filter(Boolean).map(t => ptag(t.name, t.color)).join('');

const EXAMS = [
  { id: 'viva', name: 'Viva', plural: 'Viva', color: '#3B6FE0', icon: 'chat', one: 'entry', many: 'entries', add: 'New viva' },
  { id: 'ospe', name: 'OSPE', plural: 'OSPE', color: '#2FA36B', icon: 'clip', one: 'entry', many: 'entries', add: 'New OSPE' },
  { id: 'long', name: 'Long case', plural: 'Long cases', color: '#E0489F', icon: 'caseb', one: 'case', many: 'cases', add: 'New long case' },
  { id: 'short', name: 'Short case', plural: 'Short cases', color: '#F08A24', icon: 'file', one: 'case', many: 'cases', add: 'New short case' }
];
const examById = id => EXAMS.find(x => x.id === id);
const examCount = (n, ek) => `${n} ${n === 1 ? ek.one : ek.many}`;
const CASE_TEMPLATES = {
  long: '<h3>Patient summary</h3><p><br></p><h3>Problem list</h3><p><br></p><h3>Preoperative assessment and investigations</h3><p><br></p><h3>Optimisation and risk</h3><p><br></p><h3>Anaesthetic plan</h3><p><br></p><h3>Intraoperative management</h3><p><br></p><h3>Postoperative care</h3><p><br></p><h3>Likely examiner questions</h3><p><br></p>',
  short: '<h3>Summary</h3><p><br></p><h3>Key issues</h3><p><br></p><h3>Plan</h3><p><br></p><h3>Likely examiner questions</h3><p><br></p>'
};

const SEED = [
  ['Neuro Anaesthesia', '🧠'], ['Obstetric & Gynae Anaesthesia', '🤰'], ['Cardiothoracic Anaesthesia', '🫀'],
  ['Paediatric Anaesthesia', '🧒'], ['Emergency and Trauma Anaesthesia', '🚑'], ['Burn & Poisoning', '🔥'],
  ['Orthopaedic Anaesthesia', '🦴'], ['Eye, ENT', '👁️'], ['Genitourinary Anaesthesia', '💧'],
  ['Obesity', '⚖️'], ['Liver Disease', '🧪'], ['Day Case Anaesthesia', '🏠'],
  ['Endocrine System', '🦋'], ['Transplant Anaesthesia', '🔄'], ['Geriatric Anaesthesia', '🧓'],
  ['Intercurrent disease and anaesthesia', '📋'], ['ICU', '🏥'], ['General Anaesthesia', '😴'],
  ['Regional Anaesthesia & Block', '🎯'], ['Data, statistics', '📊'], ['Pharmacology', '💊'],
  ['Procedural Sedation', '💉'], ['Critical incidents', '⚠️'], ['Complications during anaesthesia', '🚨'],
  ['Pain Medicine', '😣'], ['Quality and safety in anaesthesia', '✅'],
  ['Metabolism, stress responses and thermoregulation', '🌡️'], ['Nausea and vomiting', '🤢'],
  ['Cardiovascular system', '❤️'], ['Respiratory system', '🫁'], ['Renal system', '🫘'],
  ['Fluid, electrolyte and acid–base balance', '⚗️'], ['Physics', '⚡'], ['Applied Physiology', '🔬']
];
/* The first starter list (Phase 1 and 2). Used once, to clear these out if they are still empty. */
const OLD_DEFAULTS = ['Respiratory Medicine', 'Cardiovascular Anaesthesia', 'Respiratory System Management', 'Neuro Anaesthesia', 'General Anaesthesia',
  'Obs & Gynae Anaesthesia', 'Pain Medicine', 'Procedural Sedation', 'ICU', 'Regional Anaesthesia & Blocks', 'Perioperative Medicine', 'Geriatric Anaesthesia',
  'Extremes of Age Anaesthesia', 'Trauma, Burn & Poisoning', 'Cardiothoracic Anaesthesia', 'Orthopaedic Anaesthesia', 'Emergency', 'Paediatric Anaesthesia'];
const OLD_TOPICS = ['Upper Limb Blocks', 'Lower Limb Blocks'];
const normName = x => String(x).toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]+/g, '');

async function seed() {
  const now = Date.now();
  const sys = SEED.map((s, i) => ({ id: uid(), name: s[0], emoji: s[1], color: COLORS[i % COLORS.length], order: i, createdAt: now + i }));
  S.systems = sys; S.nodes = []; S.qas = [];
  await commit({ systems: sys });
  ST.seeded = true; ST.sysListV = 2; saveST();
}

/* One-time switch to the new system list. Nothing with content is ever deleted:
   only old starter systems that are still empty are removed. */
async function migrateSystems() {
  if ((ST.sysListV || 0) >= 2) return;
  const qBySys = new Map(); S.qas.forEach(q => qBySys.set(q.systemId, (qBySys.get(q.systemId) || 0) + 1));
  const wanted = new Set(SEED.map(x => normName(x[0]))), oldNames = new Set(OLD_DEFAULTS.map(normName));
  const remove = S.systems.filter(s => {
    const k = normName(s.name);
    if (wanted.has(k) || !oldNames.has(k) || qBySys.get(s.id)) return false;
    const nodes = S.nodes.filter(n => n.systemId === s.id);
    return nodes.every(n => !n.parentId && OLD_TOPICS.includes(n.name) && !S.nodes.some(x => x.parentId === n.id));
  });
  const rmIds = new Set(remove.map(x => x.id)), rmNodes = S.nodes.filter(n => rmIds.has(n.systemId));
  S.systems = S.systems.filter(x => !rmIds.has(x.id)); S.nodes = S.nodes.filter(n => !rmIds.has(n.systemId));
  const now = Date.now(), byName = new Map(S.systems.map(x => [normName(x.name), x])), placed = new Set(), added = [];
  SEED.forEach((e, i) => {
    let x = byName.get(normName(e[0]));
    if (!x) { x = { id: uid(), name: e[0], emoji: e[1], color: COLORS[i % COLORS.length], order: i, createdAt: now + i }; S.systems.push(x); added.push(x); }
    x.order = i; placed.add(x.id);
  });
  S.systems.filter(x => !placed.has(x.id)).sort(byOrder).forEach((x, j) => { x.order = SEED.length + j; });
  await commit({ systems: S.systems }, { systems: [...rmIds], nodes: rmNodes.map(n => n.id) });
  ST.sysListV = 2; ST.seeded = true; saveST();
  if (added.length || remove.length) toast(`Systems updated: ${added.length} added, ${remove.length} empty starter ${remove.length === 1 ? 'system' : 'systems'} removed`);
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
        let cst = '';   /* shaded boxes: keep the background and the coloured left bar */
        const cb = st.backgroundColor, cpb = parseColor(cb);
        if (cpb && SAFE_COLOR.test(cb) && cpb[3] > 0.05 && !(paste && lum(cpb) > 245)) cst += `background-color:${cb};`;
        const bl = st.borderLeftColor, bpc = parseColor(bl);
        if (!paste && st.borderLeftStyle === 'solid' && bpc && SAFE_COLOR.test(bl) && parseFloat(st.borderLeftWidth) >= 3) cst += `border-left:5px solid ${bl};`;
        const at = (cs > 1 ? ` colspan="${cs}"` : '') + (rs > 1 ? ` rowspan="${rs}"` : '') + (cst ? ` style="${esc(cst)}"` : '');
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
    if (f) f.focus({ preventScroll: true });
    const box = $('.dlg-in', d); if (box) box.scrollTop = 0;
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

const tglChip = (kind, id, name, color, checked, removable) =>
  `<span class="tgl-wrap"><label class="tgl" style="--c:${color}"><input type="checkbox" data-kind="${kind}" value="${esc(id)}" ${checked ? 'checked' : ''}><span>${kind === 'rev' ? ic('flag', 13) : ''}${esc(name)}</span></label>${removable ? `<button type="button" class="tgl-x" data-deltag="${esc(id)}" aria-label="Delete tag ${esc(name)}" title="Delete this tag">${ic('close', 13)}</button>` : ''}</span>`;
const dlgNewTag = () => openDialog({
  title: 'New tag', primary: 'Add tag',
  html: `<label class="fld">Tag name<input type="text" name="name" required maxlength="30" autofocus placeholder="e.g. Last-minute"></label>
    <div class="fld">Colour<div class="swatches">${COLORS.map((c, i) => `<label style="--c:${c}"><input type="radio" name="color" value="${c}" ${i === 4 ? 'checked' : ''}><span></span></label>`).join('')}</div></div>`,
  collect: d => {
    const name = $('[name=name]', d).value.trim(); if (!name) return false;
    if (allTags().some(t => t.name.toLowerCase() === name.toLowerCase())) { toast('A tag with that name already exists'); return false; }
    return { id: 'c_' + uid().slice(0, 8), name, color: $('[name=color]:checked', d).value };
  }
});
async function deleteCustomTag(id) {
  const t = (ST.customTags || []).find(x => x.id === id); if (!t) return false;
  const used = S.qas.filter(q => (q.tags || []).includes(id));
  const ok = await confirmDlg(`Delete the tag ${t.name}?`, `It will be removed from ${plural(used.length, 'question')}.`);
  if (!ok) return false;
  used.forEach(q => { q.tags = q.tags.filter(x => x !== id); q.updatedAt = Date.now(); });
  await save({ qas: used });
  ST.customTags = ST.customTags.filter(x => x.id !== id); saveST();
  IX.text.clear(); reindex(); render(true);
  return true;
}
function dlgTags(cur) {
  return openDialog({
    title: 'Tags and revision', primary: 'Apply',
    html: `<div class="fld">Revision list<div class="tgls">${REVS.map(r => tglChip('rev', r.id, r.name, r.color, (cur.rev || []).includes(r.id))).join('')}</div>
        <span class="muted small" style="font-weight:400">Choose when you want to read this again. Every list is under Revision and tags.</span></div>
      <div class="fld">Tags<div class="tgls" id="tgTags">${allTags().map(t => tglChip('tag', t.id, t.name, t.color, (cur.tags || []).includes(t.id), !TAGS.includes(t))).join('')}
        <button type="button" class="chip add" id="tgNew">${ic('plus', 14)} New tag</button></div></div>`,
    onOpen: d => {
      d.addEventListener('click', async e => {
        if (e.target.closest('#tgNew')) {
          const t = await dlgNewTag(); if (!t) return;
          ST.customTags.push(t); saveST();
          $('#tgNew', d).insertAdjacentHTML('beforebegin', tglChip('tag', t.id, t.name, t.color, true, true));
          return;
        }
        const x = e.target.closest('[data-deltag]');
        if (x && await deleteCustomTag(x.dataset.deltag)) x.closest('.tgl-wrap').remove();
      });
    },
    collect: d => ({ rev: $$('[data-kind=rev]:checked', d).map(x => x.value), tags: $$('[data-kind=tag]:checked', d).map(x => x.value) })
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
  const linked = S.exams.filter(e => e.systemId === id); linked.forEach(e => { e.systemId = null; });
  await save({ exams: linked }, { systems: [id], nodes: nodes.map(n => n.id), qas: qas.map(q => q.id) });
  reindex();
  const r = parseRoute(); if ((r.v === 'system' && r.id === id) || r.v === 'node') location.hash = '#/'; else render();
  toast(`Deleted ${s.name}`, { undo: () => restore({ systems: [s], nodes, qas, relink: linked, sid: id }) });
}
async function restore(data) {
  S.systems.push(...(data.systems || [])); S.nodes.push(...(data.nodes || [])); S.qas.push(...(data.qas || [])); S.exams.push(...(data.exams || []));
  (data.relink || []).forEach(e => { e.systemId = data.sid; });
  await save({ systems: data.systems || [], nodes: data.nodes || [], qas: data.qas || [], exams: (data.exams || []).concat(data.relink || []) });
  reindex(); render(true); toast('Restored');
}

async function moveEntry(id) {
  const e = S.exams.find(x => x.id === id); if (!e) return;
  const k = await openDialog({ title: 'Move to another section', primary: 'Move',
    html: `<label class="fld">Section<select name="k">${EXAMS.map(x => `<option value="${x.id}" ${x.id === e.kind ? 'selected' : ''}>${esc(x.plural)}</option>`).join('')}</select></label>`,
    collect: d => $('[name=k]', d).value });
  if (!k || k === e.kind) return;
  const sibs = examsOf(k); e.kind = k; e.updatedAt = Date.now(); e.order = sibs.length ? Math.max(...sibs.map(x => x.order)) + 1 : 0;
  await save({ exams: [e] }); reindex(); render(true); toast('Moved');
}
async function deleteEntry(id) {
  const e = S.exams.find(x => x.id === id); if (!e) return;
  S.exams = S.exams.filter(x => x.id !== id); await save({}, { exams: [id] }); reindex(); render(true);
  toast('Deleted', { undo: () => restore({ exams: [e] }) });
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
  if (p[0] === 'study') return { v: 'study', key: p[1] };
  if (p[0] === 'exam' && p[1]) return { v: 'exam', kind: p[1], id: p[2] };
  if (p[0] === 'cards') return { v: 'cards', scope: p[1] || 'all', id: p[2] };
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

/* ============================== system sorting ============================== */
const SORTS = [{ id: 'custom', name: 'My order' }, { id: 'az', name: 'A to Z' }, { id: 'most', name: 'Most questions' }, { id: 'recent', name: 'Recently opened' }];
const isCustom = () => (ST.sysSort || 'custom') === 'custom';
let sideFilter = '';
function sortedSystems() {
  const a = S.systems.slice(), by = ST.sysSort || 'custom';
  const nm = (x, y) => x.name.localeCompare(y.name, undefined, { sensitivity: 'base', numeric: true });
  if (by === 'az') a.sort(nm);
  else if (by === 'most') a.sort((x, y) => (IX.sysQ.get(y.id) || 0) - (IX.sysQ.get(x.id) || 0) || nm(x, y));
  else if (by === 'recent') { const seen = ST.sysSeen || {}; a.sort((x, y) => (seen[y.id] || 0) - (seen[x.id] || 0) || (x.order - y.order)); }
  return a;
}
const sortSelect = id => `<select id="${id}" class="sel" aria-label="Sort systems">${SORTS.map(o => `<option value="${o.id}" ${(ST.sysSort || 'custom') === o.id ? 'selected' : ''}>${o.name}</option>`).join('')}</select>`;
function markSeen(r) {
  let sid = null;
  if (r.v === 'system') sid = r.id; else if (r.v === 'node') { const n = IX.node.get(r.id); sid = n && n.systemId; }
  if (sid && IX.sys.has(sid)) { ST.sysSeen = ST.sysSeen || {}; ST.sysSeen[sid] = Date.now(); saveST(); }
}
function setSort(v) { ST.sysSort = v; saveST(); render(true); }

/* ============================== views ============================== */
const sep = '<span class="sep" aria-hidden="true">›</span>';
const counts = (a, b) => `<div class="counts"><span><b>${a[0]}</b> ${a[0] === 1 ? a[1] : a[1] + 's'}</span>${b ? `<span><b>${b[0]}</b> ${b[0] === 1 ? b[1] : b[1] + 's'}</span>` : ''}</div>`;

function sysCard(s) {
  return `<article class="card sys" ${isCustom() ? 'draggable="true"' : ''} tabindex="0" role="link" data-id="${s.id}" style="--c:${s.color}" aria-label="${esc(s.name)}">
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
        <a class="btn" href="#/cards/all">${ic('cards', 16)} Flashcards</a>
        <button class="btn" data-act="import-file">${ic('upload', 16)} Import</button>
        <span class="seg" role="group" aria-label="Dashboard text size"><button type="button" data-act="dash-down" aria-label="Smaller dashboard text" title="Smaller dashboard text">A−</button><button type="button" data-act="dash-up" aria-label="Larger dashboard text" title="Larger dashboard text">A+</button></span>
        <button class="btn primary" data-act="add-system">${ic('plus', 16)} Add system</button>
      </div>
    </div>
    ${banner}
    ${S.systems.length ? studyRow() + examRow() : ''}
    ${S.systems.length ? `<div class="sort-row"><label>Sort systems ${sortSelect('sysSort')}</label></div>
      <div class="grid" id="grid">${sortedSystems().map(sysCard).join('')}
      <button class="card add" data-act="add-system">${ic('plus', 18)} Add system</button></div>
      <p class="hint">${isCustom() ? 'Drag a card to reorder, or use the ⋮ menu on any card.' : 'Cards are sorted automatically. Choose “My order” to drag them into your own order.'}</p>`
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
        ${(IX.sysQ.get(s.id) || 0) ? `<a class="btn" href="#/cards/sys/${s.id}">${ic('cards', 16)} Flashcards</a>` : ''}
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

function qaCard(q, i, o = {}) {
  const closed = collapsed.has(q.id), n = IX.node.get(q.nodeId), sys = IX.sys.get(q.systemId), pills = qaPills(q);
  return `<article class="qa${closed ? ' closed' : ''}" id="qa-${q.id}" data-id="${q.id}" style="--c:${sys.color}">
    <header class="qa-head" data-act="toggle-qa" data-id="${q.id}">
      <span class="qa-n">${i + 1}</span>
      <div class="qa-title">
        ${o.path && n ? `<a class="qa-path" href="#/n/${n.id}/${q.id}">${esc(pathOf(n))}</a>` : ''}
        <h3>${qHtml(q.q)}</h3>
        ${pills ? `<div class="ptags">${pills}</div>` : ''}
      </div>
      <span class="qa-tools">
        ${o.rev ? `<button class="icon-btn" data-act="rev-remove" data-id="${q.id}" data-key="${o.rev}" aria-label="Done revising, remove from this list" title="Done revising: remove from this list">${ic('check', 18)}</button>` : ''}
        <button class="icon-btn" data-act="qa-tags" data-id="${q.id}" aria-label="Tags and revision" title="Tags and revision">${ic('tag', 17)}</button>
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
        ${qCountNode(n.id) ? `<a class="btn" href="#/cards/node/${n.id}">${ic('cards', 16)} Flashcards</a>` : ''}
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
      <div class="qa-list">${qs.map((q, i) => qaCard(q, i)).join('')}</div>`
      : `<div class="empty" style="margin-top:20px"><p>No questions here yet.</p><button class="btn primary" data-act="new-qa" data-id="${n.id}">${ic('plus', 16)} New question</button></div>`}
  </section>`;
}

function studyRow() {
  const cnt = studyCounts();
  const card = (href, color, icon, name, n) => `<a class="study-card" style="--c:${color}" href="${href}">${ic(icon, 20)}<span><b>${esc(name)}</b><small>${plural(n, 'question')}</small></span></a>`;
  return `<div class="study-row" aria-label="Revision lists">${REVS.map(r => card('#/study/' + r.id, r.color, 'flag', r.short, cnt[r.id] || 0)).join('')}${card('#/study/hard', '#A24BD8', 'tag', 'Hard topics', cnt.hard || 0)}</div>`;
}
function studyCounts() {
  const c = {};
  const add = it => { (it.rev || []).forEach(k => { c[k] = (c[k] || 0) + 1; }); (it.tags || []).forEach(k => { c[k] = (c[k] || 0) + 1; }); };
  S.qas.forEach(add); S.exams.forEach(add);
  return c;
}
function examRow() {
  return `<div class="study-row" aria-label="Exam sections">${EXAMS.map(x => `<a class="study-card" style="--c:${x.color}" href="#/exam/${x.id}">${ic(x.icon, 20)}<span><b>${esc(x.plural)}</b><small>${examCount(examsOf(x.id).length, x)}</small></span></a>`).join('')}</div>`;
}
function viewStudy(key) {
  const isRev = !!revById(key), meta = isRev ? revById(key) : tagById(key);
  const cur = meta ? key : 'night', m = meta || REVS[0], rev = meta ? isRev : true;
  const cnt = studyCounts();
  const chip = (k, label, color, icon) => `<a class="chip${k === cur ? ' on' : ''}" style="--c:${color}" href="#/study/${k}">${icon ? ic(icon, 13) : ''} ${esc(label)} <i>${cnt[k] || 0}</i></a>`;
  const has = it => (rev ? (it.rev || []) : (it.tags || [])).includes(cur);
  const items = S.qas.filter(q => IX.node.get(q.nodeId) && has(q));
  const ents = S.exams.filter(has).sort((a, b) => (EXAMS.findIndex(x => x.id === a.kind) - EXAMS.findIndex(x => x.id === b.kind)) || (a.order - b.order));
  const k4 = q => { const n = IX.node.get(q.nodeId), s = IX.sys.get(q.systemId), top = n.parentId ? IX.node.get(n.parentId) : n; return [s.order, top.order, n.parentId ? n.order : -1, q.order]; };
  items.sort((a, b) => { const x = k4(a), y = k4(b); for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; });
  let list = '', lastSys = null, n = 0;
  items.forEach(q => {
    if (q.systemId !== lastSys) { const s = IX.sys.get(q.systemId); lastSys = q.systemId; list += `<h2 class="group-title sysgroup" style="--c:${s.color}"><span class="em">${esc(s.emoji)}</span> ${esc(s.name)}</h2>`; }
    list += qaCard(q, n++, { path: true, rev: rev ? cur : '' });
  });
  if (ents.length) {
    list += `<h2 class="group-title sysgroup" style="--c:#64748B"><span class="em">${ic('clip', 16)}</span> Exam sections</h2>`;
    ents.forEach(e => { list += entryCard(e, n++, { path: true, rev: rev ? cur : '' }); });
  }
  const total = items.length + ents.length;
  return `<section style="--c:${m.color}">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">All systems</a>${sep}<span>Revision and tags</span></nav>
    <div class="page-head"><div class="grow"><div class="bar-accent"></div><h1>${esc(m.name)}</h1>
      <p class="sub">${plural(items.length, 'question')}${ents.length ? ` and ${ents.length} exam ${ents.length === 1 ? 'entry' : 'entries'}` : ''}. ${rev ? 'Tap the tick when you have finished revising an item, and it leaves this list.' : 'Everything with this tag, grouped by system.'}</p></div>
      <div class="actions">${items.length ? `<a class="btn" href="#/cards/${rev ? 'rev' : 'tag'}/${cur}">${ic('cards', 16)} Flashcards</a>` : ''}</div></div>
    <div class="fld-label">Revision lists</div>
    <div class="chips">${REVS.map(r => chip(r.id, r.short, r.color, 'flag')).join('')}</div>
    <div class="fld-label">Tags</div>
    <div class="chips">${allTags().map(t => chip(t.id, t.name, t.color)).join('')}</div>
    ${total ? `<div class="list-bar"><span></span>${total > 1 ? `<span><button class="btn small ghost" data-act="collapse-all">Collapse all</button> <button class="btn small ghost" data-act="expand-all">Expand all</button></span>` : ''}</div>
      <div class="qa-list">${list}</div>`
      : `<div class="empty" style="margin-top:22px"><p>${rev ? 'Nothing in this list yet. Open any question or case and use its tag button to add it here.' : 'Nothing has this tag yet. Use the tag button on any question or case to add it.'}</p></div>`}
  </section>`;
}

/* ---------- exam sections (Viva, OSPE, Long case, Short case) ---------- */
let examSys = '';
function entryCard(e, i, o = {}) {
  const ek = examById(e.kind), sys = e.systemId && IX.sys.get(e.systemId), closed = collapsed.has(e.id), pills = qaPills(e);
  const path = o.path ? `<a class="qa-path" href="#/exam/${e.kind}/${e.id}">${esc(ek.name)}${sys ? ' › ' + esc(sys.name) : ''}</a>`
    : (sys ? `<span class="qa-path">${esc(sys.emoji)} ${esc(sys.name)}</span>` : '');
  return `<article class="qa${closed ? ' closed' : ''}" id="qa-${e.id}" data-id="${e.id}" style="--c:${ek.color}">
    <header class="qa-head" data-act="toggle-qa" data-id="${e.id}">
      <span class="qa-n">${i + 1}</span>
      <div class="qa-title">${path}<h3>${esc(e.title)}</h3>${pills ? `<div class="ptags">${pills}</div>` : ''}</div>
      <span class="qa-tools">
        ${o.rev ? `<button class="icon-btn" data-act="rev-remove" data-id="${e.id}" data-key="${o.rev}" aria-label="Done revising, remove from this list" title="Done revising: remove from this list">${ic('check', 18)}</button>` : ''}
        <button class="icon-btn" data-act="qa-tags" data-id="${e.id}" aria-label="Tags and revision" title="Tags and revision">${ic('tag', 17)}</button>
        <button class="icon-btn" data-act="edit-entry" data-id="${e.id}" aria-label="Edit" title="Edit">${ic('edit', 17)}</button>
        <button class="icon-btn" data-act="entry-menu" data-id="${e.id}" aria-label="More options" title="More">${ic('dots', 17)}</button>
        <span class="icon-btn chev" aria-hidden="true">${ic('down', 17)}</span>
      </span>
    </header>
    <div class="qa-body rich">${e.body || '<p class="ph">Nothing written yet.</p>'}</div>
  </article>`;
}
function viewExam(kind) {
  const ek = examById(kind), all = examsOf(kind);
  const used = [...new Set(all.map(e => e.systemId).filter(Boolean))].filter(id => IX.sys.has(id));
  if (!used.includes(examSys)) examSys = '';
  const list = examSys ? all.filter(e => e.systemId === examSys) : all;
  return `<section style="--c:${ek.color}">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">All systems</a>${sep}<span>${esc(ek.plural)}</span></nav>
    <div class="page-head"><div class="grow"><div class="bar-accent"></div><h1>${esc(ek.plural)}</h1><p class="sub">${examCount(all.length, ek)}</p></div>
      <div class="actions">
        ${used.length ? `<select id="examSys" class="sel" aria-label="Filter by system"><option value="">All systems</option>${used.map(id => { const s = IX.sys.get(id); return `<option value="${id}" ${id === examSys ? 'selected' : ''}>${esc(s.emoji)} ${esc(s.name)}</option>`; }).join('')}</select>` : ''}
        <button class="btn primary" data-act="new-entry" data-kind="${kind}">${ic('plus', 16)} ${esc(ek.add)}</button>
      </div></div>
    ${list.length ? `<div class="list-bar"><span>${examCount(list.length, ek)}</span>${list.length > 1 ? `<span><button class="btn small ghost" data-act="collapse-all">Collapse all</button> <button class="btn small ghost" data-act="expand-all">Expand all</button></span>` : ''}</div>
      <div class="qa-list">${list.map((e, i) => entryCard(e, i)).join('')}</div>`
      : `<div class="empty" style="margin-top:22px"><p>Nothing here yet. Add your first ${esc(ek.name)}.</p><button class="btn primary" data-act="new-entry" data-kind="${kind}">${ic('plus', 16)} ${esc(ek.add)}</button></div>`}
  </section>`;
}

/* ---------- flashcards ---------- */
let FC = null;
const shuffleArr = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function fcScope(scope, id) {
  let qs = S.qas.slice(), title = 'All questions', back = '#/';
  if (scope === 'node') { const n = IX.node.get(id); if (n) { const ids = new Set([n.id, ...subsOf(n.id).map(x => x.id)]); qs = S.qas.filter(q => ids.has(q.nodeId)); title = n.name; back = '#/n/' + n.id; } }
  else if (scope === 'sys') { const s = IX.sys.get(id); if (s) { qs = S.qas.filter(q => q.systemId === id); title = s.name; back = '#/s/' + id; } }
  else if (scope === 'rev') { const r = revById(id); if (r) { qs = S.qas.filter(q => (q.rev || []).includes(id)); title = r.name; back = '#/study/' + id; } }
  else if (scope === 'tag') { const t = tagById(id); if (t) { qs = S.qas.filter(q => (q.tags || []).includes(id)); title = t.name; back = '#/study/' + id; } }
  return { qs: qs.filter(q => IX.node.get(q.nodeId) && stripHtml(q.a)), title, back };
}
function fcStart(key, ids, title, back) {
  ids = ids.slice(); if (ST.fcShuffle !== false) shuffleArr(ids);
  FC = { key, title, back, total: ids.length, queue: ids, known: [], missed: [], flip: false };
}
function fcRate(ok) {
  if (!FC || !FC.flip || !FC.queue.length) return;
  const id = FC.queue.shift(); (ok ? FC.known : FC.missed).push(id); FC.flip = false; render();
}
function viewCards(r) {
  const key = r.scope + '/' + (r.id || '');
  if (!FC || FC.key !== key) { const d = fcScope(r.scope, r.id); fcStart(key, d.qs.map(q => q.id), d.title, d.back); }
  const have = new Set(S.qas.map(q => q.id));
  FC.queue = FC.queue.filter(id => have.has(id));
  const done = FC.known.length + FC.missed.length, on = ST.fcShuffle !== false;
  const head = `<nav class="crumbs" aria-label="Breadcrumb"><a href="#/">All systems</a>${sep}<span>Flashcards</span></nav>
    <div class="page-head"><div class="grow"><div class="bar-accent"></div><h1>${esc(FC.title)}</h1>
      <p class="sub">${FC.total ? `${done} of ${FC.total} done. ${FC.known.length} got it, ${FC.missed.length} to review.` : 'No cards here yet.'}</p></div>
      <div class="actions"><button class="btn small" data-act="fc-shuffle" aria-pressed="${on}">${ic('shuffle', 15)} Shuffle: ${on ? 'on' : 'off'}</button>
        <button class="btn small" data-act="fc-restart">Restart</button><a class="btn small" href="${FC.back}">Close</a></div></div>`;
  if (!FC.total) return `<section class="fc">${head}<div class="empty"><p>Only questions that have an answer become flashcards. Add answers, or pick another topic.</p></div></section>`;
  const bar = `<div class="fc-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${FC.total}" aria-valuenow="${done}"><i style="width:${Math.round(done / FC.total * 100)}%"></i></div>`;
  if (!FC.queue.length) {
    const miss = FC.missed.map(id => S.qas.find(q => q.id === id)).filter(Boolean);
    return `<section class="fc">${head}${bar}<div class="fc-done"><h2>Round complete</h2>
      <p>${FC.known.length} got it${miss.length ? `, ${miss.length} to review.` : '. Nothing left to review.'}</p>
      <div class="btn-row">${miss.length ? `<button class="btn primary" data-act="fc-missed">Practise the ${miss.length} missed</button><button class="btn" data-act="fc-mark">${ic('flag', 15)} Add missed to a revision list</button>` : ''}<button class="btn" data-act="fc-restart">Start again</button></div>
      ${miss.length ? `<div class="fc-miss">${miss.map(q => `<a href="#/n/${q.nodeId}/${q.id}">${esc(q.q)}</a>`).join('')}</div>` : ''}</div></section>`;
  }
  const q = S.qas.find(x => x.id === FC.queue[0]), n = IX.node.get(q.nodeId), sys = IX.sys.get(q.systemId), pills = qaPills(q);
  return `<section class="fc">${head}${bar}
    <div class="fc-card" style="--c:${sys.color}">
      <div class="fc-path">${esc(pathOf(n))}</div>${pills ? `<div class="ptags" style="margin:0 0 6px">${pills}</div>` : ''}
      <h2 class="fc-q">${qHtml(q.q)}</h2>
      ${FC.flip ? `<div class="fc-a rich">${q.a}</div>` : `<button class="btn primary big" data-act="fc-flip">Show answer</button>`}
    </div>
    ${FC.flip ? `<div class="fc-rate"><button class="btn danger big" data-act="fc-again">Again</button><button class="btn primary big" data-act="fc-know">Got it</button></div>` : ''}
    <p class="hint">Press Space to show the answer. Then 1 for Again and 2 for Got it, or use the left and right arrow keys.</p>
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
  const eHits = []; for (const e of S.exams) { const t = eText(e); if (all(t.l)) eHits.push([e, t]); }
  const snip = t => {
    const low = t.t.toLowerCase(), found = terms.map(x => low.indexOf(x)).filter(i => i > -1);
    if (!found.length) return '';
    const li = Math.min(...found), a = Math.max(0, li - 70), b = Math.min(t.t.length, li + 150);
    return (a > 0 ? '…' : '') + t.t.slice(a, b) + (b < t.t.length ? '…' : '');
  };
  let html = `<section><nav class="crumbs"><a href="#/">All systems</a>${sep}<span>Search</span></nav>
    <div class="page-head"><div class="grow"><h1>Search</h1><p class="sub">${plural(qHits.length, 'question')}, ${plural(sysHits.length + nodeHits.length, 'topic')} and ${eHits.length} exam ${eHits.length === 1 ? 'entry' : 'entries'} matching “${esc(query)}”</p></div></div>`;
  if (sysHits.length || nodeHits.length) {
    html += `<h2 class="group-title">Systems and topics</h2><div class="results">` +
      sysHits.map(s => `<a class="res" style="--c:${s.color}" href="#/s/${s.id}"><div class="rq">${esc(s.emoji)} ${hl(s.name, terms)}</div></a>`).join('') +
      nodeHits.slice(0, 40).map(n => `<a class="res" style="--c:${IX.sys.get(n.systemId).color}" href="#/n/${n.id}"><div class="path">${esc(pathOf(n))}</div><div class="rq">${hl(n.name, terms)}</div></a>`).join('') + `</div>`;
  }
  if (shown.length) {
    html += `<h2 class="group-title">Questions</h2><div class="results">` + shown.map(([q, t]) => {
      const n = IX.node.get(q.nodeId); if (!n) return '';
      const sn = snip(t);
      return `<a class="res" style="--c:${IX.sys.get(q.systemId).color}" href="#/n/${n.id}/${q.id}"><div class="path">${esc(pathOf(n))}</div><div class="rq">${hl(q.q, terms)}</div>${sn ? `<div class="snip">${hl(sn, terms)}</div>` : ''}${qaPills(q) ? `<div class="ptags">${qaPills(q)}</div>` : ''}</a>`;
    }).join('') + `</div>` + (qHits.length > shown.length ? `<p class="hint">Showing the first ${shown.length}. Add another word to narrow the search.</p>` : '');
  }
  if (eHits.length) {
    html += `<h2 class="group-title">Exam sections</h2><div class="results">` + eHits.slice(0, 40).map(([e, t]) => {
      const ek = examById(e.kind), sys = e.systemId && IX.sys.get(e.systemId), sn = snip(t);
      return `<a class="res" style="--c:${ek.color}" href="#/exam/${e.kind}/${e.id}"><div class="path">${esc(ek.name)}${sys ? ' › ' + esc(sys.name) : ''}</div><div class="rq">${hl(e.title, terms)}</div>${sn ? `<div class="snip">${hl(sn, terms)}</div>` : ''}${qaPills(e) ? `<div class="ptags">${qaPills(e)}</div>` : ''}</a>`;
    }).join('') + `</div>`;
  }
  if (!qHits.length && !sysHits.length && !nodeHits.length && !eHits.length) html += `<div class="empty"><p>Nothing found. Try fewer or different words.</p></div>`;
  return html + '</section>';
}

/* ============================== sidebar tree ============================== */
function navExtra(r) {
  return `<a class="tree-home${r.v === 'cards' ? ' on' : ''}" href="#/cards/all">${ic('cards', 17)} Flashcards</a>` +
    EXAMS.map(x => `<a class="tree-home${r.v === 'exam' && r.kind === x.id ? ' on' : ''}" style="--c:${x.color}" href="#/exam/${x.id}">${ic(x.icon, 17)} <span class="grow-t">${esc(x.plural)}</span><span class="tcount">${examsOf(x.id).length || ''}</span></a>`).join('') + '<div class="tree-sep"></div>';
}
function renderTree() {
  const sb = $('#sidebar'), r = parseRoute();
  if (!$('#treeNav', sb)) {
    sb.innerHTML = `<div id="treeNav"></div><div class="side-tools"><input id="sideFind" type="search" placeholder="Find a system" autocomplete="off" spellcheck="false" aria-label="Find a system">${sortSelect('sideSort')}</div><div id="treeSys"></div>`;
  }
  const keep = sb.scrollTop, curNode = r.v === 'node' ? IX.node.get(r.id) : null;
  const q = sideFilter.trim().toLowerCase(), open = id => ST.expanded.includes(id);
  const row = (cls, id, href, emoji, name, count, hasKids, on, color) =>
    `<div class="trow ${cls}${on ? ' on' : ''}" ${color ? `style="--c:${color}"` : ''}>
      <button class="caret ${hasKids ? (open(id) ? 'open' : '') : 'none'}" data-act="tog" data-id="${id}" aria-label="${open(id) ? 'Collapse' : 'Expand'}" ${hasKids ? '' : 'tabindex="-1"'}>${ic('right', 15)}</button>
      <a class="tname" href="${href}">${emoji ? `<span class="em">${esc(emoji)}</span>` : ''}<span class="t">${esc(name)}</span></a>
      <span class="tcount">${count || ''}</span></div>`;
  $('#treeNav', sb).innerHTML = `<a class="tree-home${r.v === 'home' ? ' on' : ''}" href="#/">${ic('home', 17)} All systems</a>` +
    `<a class="tree-home${r.v === 'study' ? ' on' : ''}" href="#/study/night">${ic('flag', 17)} Revision and tags</a>` + navExtra(r);
  const sel = $('#sideSort', sb); if (sel) sel.value = ST.sysSort || 'custom';
  const list = sortedSystems().filter(x => !q || x.name.toLowerCase().includes(q));
  let h = '';
  if (!S.systems.length) h += `<p class="tree-empty">Your systems will appear here.</p>`;
  else if (!list.length) h += `<p class="tree-empty">No system matches “${esc(sideFilter.trim())}”.</p>`;
  for (const s of list) {
    const tops = topicsOf(s.id);
    h += row('sys', s.id, `#/s/${s.id}`, s.emoji, s.name, IX.sysQ.get(s.id) || 0, !q && tops.length > 0, (r.v === 'system' && r.id === s.id), s.color);
    if (!q && open(s.id) && tops.length) {
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
  $('#treeSys', sb).innerHTML = h; sb.scrollTop = keep;
  const on = $('.trow.on', sb); if (on && !q) on.scrollIntoView({ block: 'nearest' });
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
  } else if (r.v === 'study') {
    html = viewStudy(r.key); title = 'Revision and tags';
  } else if (r.v === 'exam') {
    const ek = examById(r.kind); if (!ek) { location.hash = '#/'; return; }
    html = viewExam(r.kind); title = ek.plural;
  } else if (r.v === 'cards') {
    html = viewCards(r); title = 'Flashcards';
  } else html = viewHome();
  if (r.v !== 'search') { const qi = $('#q'); if (qi && document.activeElement !== qi) qi.value = ''; }
  main.innerHTML = html;
  document.title = title === 'FCPS Book' ? title : `${title} · FCPS Book`;
  main.scrollTop = keepScroll ? sc : 0;
  const fid = r.v === 'node' ? r.qa : (r.v === 'exam' ? r.id : null);
  if (fid) { const el = $('#qa-' + fid); if (el) { el.classList.remove('closed'); collapsed.delete(fid); el.scrollIntoView({ block: 'start' }); el.classList.add('flash'); } }
  if (flashId) { const el = $('#qa-' + flashId); if (el) { el.classList.add('flash'); if (!keepScroll) el.scrollIntoView({ block: 'nearest' }); } flashId = null; }
  renderTree();
}
function onRoute() {
  if (parseRoute().v !== 'cards') FC = null;
  ensureExpanded(parseRoute()); markSeen(parseRoute());
  document.body.classList.remove('drawer');
  closeMenu(); render();
}

/* ============================== editor ============================== */
const PAL_TEXT = ['#C62828', '#E65100', '#B8860B', '#2E7D32', '#00838F', '#1565C0', '#6A1B9A', '#AD1457', '#455A64', '#000000', '#FFFFFF'];
const PAL_HL = ['#FFF176', '#FFCC80', '#A5D6A7', '#81D4FA', '#CE93D8', '#F48FB1', '#FFAB91', 'none'];
const SIZES = [12, 14, 16, 18, 20, 22, 24, 28, 32, 40];

function openEditor(nodeId, qa, kind) {
  /* kind given: editing a Viva, OSPE or case entry (qa is then that entry). Otherwise a question. */
  const isEntry = !!kind, ek = isEntry ? examById(kind) : null;
  const n = isEntry ? null : IX.node.get(nodeId), sys = isEntry ? null : IX.sys.get(n.systemId), p = n && n.parentId ? IX.node.get(n.parentId) : null;
  const where = isEntry ? ek.plural : [sys.name, p && p.name, n.name].filter(Boolean).join(' › ');
  const accent = isEntry ? ek.color : sys.color;
  const sysSel = isEntry ? `<label class="ed-sys">System <select id="edSys" class="sel"><option value="">None</option>${S.systems.map(x => `<option value="${x.id}">${esc(x.emoji)} ${esc(x.name)}</option>`).join('')}</select></label>` : '';
  const tplBtn = isEntry && CASE_TEMPLATES[kind] ? `<button type="button" class="btn small" data-e="tpl">Insert case headings</button>` : '';
  const d = document.createElement('dialog'); d.className = 'editor';
  const tb = (cmd, icon, label, val) => `<button type="button" class="tbtn" data-cmd="${cmd}" ${val ? `data-val="${val}"` : ''} title="${label}" aria-label="${label}">${icon}</button>`;
  d.innerHTML = `
    <div class="ed-top">
      <div class="ed-where" style="--c:${accent}"><span class="dotc"></span><span class="t">${esc(where)}</span></div>
      <div class="ed-btns">
        <button type="button" class="btn" data-e="cancel">Cancel</button>
        ${qa ? '' : '<button type="button" class="btn" data-e="next">Save and add next</button>'}
        <button type="button" class="btn primary" data-e="save">${qa ? 'Save changes' : 'Save'}</button>
      </div>
    </div>
    <div class="ed-q"><label for="edQ">${isEntry ? 'Title' : 'Question'}</label><textarea id="edQ" rows="2" placeholder="${isEntry ? 'Type a title' : 'Type the question'}"></textarea>
      <div class="ed-tags"><button type="button" class="btn small" data-e="tags">${ic('tag', 15)} Tags and revision</button><span class="ptags" id="edPills"></span>${sysSel}${tplBtn}</div></div>
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
    <div class="ed-a-wrap"><div id="edA" class="rich editable" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Answer" data-ph="${isEntry ? 'Write or paste the content here' : 'Write or paste the answer here'}"></div></div>`;
  document.body.appendChild(d);
  const ed = $('#edA', d), eq = $('#edQ', d), pal = $('.pal', d);
  const edSys = isEntry ? $('#edSys', d) : null;
  eq.value = qa ? (isEntry ? qa.title : qa.q) : ''; ed.innerHTML = qa ? (isEntry ? qa.body : qa.a) : '';
  if (edSys) edSys.value = (qa && qa.systemId) || '';
  let edTags = ((qa && qa.tags) || []).slice(), edRev = ((qa && qa.rev) || []).slice();
  const snap = () => eq.value + '\u0000' + ed.innerHTML + '\u0000' + edTags.join(',') + '|' + edRev.join(',') + '|' + (edSys ? edSys.value : '');
  const showPills = () => { $('#edPills', d).innerHTML = qaPills({ tags: edTags, rev: edRev }) || '<span class="muted small">None yet</span>'; };
  let base = snap();
  showPills();
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
    if (a) {
      if (a.dataset.e === 'cancel') tryClose();
      else if (a.dataset.e === 'tags') dlgTags({ tags: edTags, rev: edRev }).then(v => { if (v) { edTags = v.tags; edRev = v.rev; showPills(); } });
      else if (a.dataset.e === 'tpl') { if (stripHtml(ed.innerHTML)) ed.insertAdjacentHTML('beforeend', CASE_TEMPLATES[kind]); else ed.innerHTML = CASE_TEMPLATES[kind]; }
      else doSave(a.dataset.e === 'next');
    }
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
    if (snap() !== base) { const ok = await confirmDlg('Discard changes?', 'You have unsaved changes.', 'Discard'); if (!ok) return; }
    cleanup();
  };
  d.addEventListener('cancel', e => { e.preventDefault(); tryClose(); });
  d.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); doSave(false); } });

  async function doSave(next) {
    const qv = eq.value.trim();
    if (!qv) { toast(isEntry ? 'Type a title first' : 'Type the question first'); eq.focus(); return; }
    let a = sanitize(ed.innerHTML, false);
    if (!stripHtml(a)) a = '';
    let rec = qa;
    try {
      if (isEntry) {
        const sid = edSys.value || null;
        if (qa) { qa.title = qv; qa.body = a; qa.systemId = sid; qa.tags = edTags.slice(); qa.rev = edRev.slice(); qa.updatedAt = Date.now(); await save({ exams: [qa] }); }
        else {
          const sibs = examsOf(kind);
          rec = { id: uid(), kind, title: qv, body: a, systemId: sid, tags: edTags.slice(), rev: edRev.slice(), order: sibs.length ? Math.max(...sibs.map(x => x.order)) + 1 : 0, createdAt: Date.now(), updatedAt: Date.now() };
          S.exams.push(rec); await save({ exams: [rec] });
        }
      } else if (qa) { qa.q = qv; qa.a = a; qa.tags = edTags.slice(); qa.rev = edRev.slice(); qa.updatedAt = Date.now(); await save({ qas: [qa] }); }
      else {
        const sibs = qasOf(nodeId);
        rec = { id: uid(), systemId: n.systemId, nodeId, q: qv, a, tags: edTags.slice(), rev: edRev.slice(), order: sibs.length ? Math.max(...sibs.map(x => x.order)) + 1 : 0, createdAt: Date.now(), updatedAt: Date.now() };
        S.qas.push(rec); await save({ qas: [rec] });
      }
    } catch (e) { return; }
    reindex(); flashId = rec.id;
    if (next) {
      eq.value = ''; ed.innerHTML = ''; edTags = []; edRev = []; showPills(); base = snap(); fit(); eq.focus(); render(true); toast('Saved. Ready for the next one.');
    } else { base = snap(); cleanup(); render(true); toast('Saved'); }
  }
  d.showModal(); fit();
  (qa ? ed : eq).focus();
}

/* ============================== settings + backup ============================== */
function exportBackup() {
  const data = { app: 'fcps-book', version: 1, exportedAt: new Date().toISOString(), settings: { theme: ST.theme, uiFont: ST.uiFont, noteFont: ST.noteFont, noteSize: ST.noteSize, customTags: ST.customTags || [] }, systems: S.systems, nodes: S.nodes, qas: S.qas, exams: S.exams };
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
  const i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.accept = '.json,application/json';
  i.onchange = async () => {
    const fs = Array.from(i.files || []); if (!fs.length) return;
    try {
      const all = []; for (const f of fs) all.push(JSON.parse(await f.text()));
      if (all.every(d => d && d.app === 'fcps-book-import')) await importDocument(all.length > 1 ? mergeImportFiles(all) : all[0]);
      else if (all.length === 1) await importBackup(all[0]);
      else throw new Error('bad');
    } catch (e) { if (!e || e.message !== 'cancelled') toast('That file could not be read. Choose a backup or an import file made for FCPS Book.'); }
  };
  i.click();
}

/* ---------- import of question files made from documents ---------- */
const plainToHtml = t => String(t || '').split(/\r?\n/).map(l => l.trim() ? `<p>${esc(l)}</p>` : '').join('');
const asHtml = t => /<[a-z][\s\S]*>/i.test(String(t || '')) ? String(t) : plainToHtml(t);
const normQ = t => String(t || '').toLowerCase().replace(/^\s*(q(uestion)?\s*)?\d+\s*[.):-]\s*/i, '').replace(/[^a-z0-9\u0980-\u09ff]+/g, '');
function mergeImportFiles(list) {
  const by = new Map();
  list.forEach(d => (d.systems || []).forEach(x => { if (!x || !x.name) return; const k = normName(x.name); if (!by.has(k)) by.set(k, { name: x.name, topics: [] }); by.get(k).topics.push(...(x.topics || [])); }));
  return { app: 'fcps-book-import', version: 1, systems: [...by.values()], exams: list.flatMap(d => d.exams || []) };
}
async function importDocument(data) {
  if (!data || data.app !== 'fcps-book-import' || !Array.isArray(data.systems)) throw new Error('bad');
  const files = data.systems.filter(x => x && String(x.name || '').trim());
  const exams = (Array.isArray(data.exams) ? data.exams : []).filter(e => e && examById(e.kind) && String(e.title || '').trim());
  if (!files.length && !exams.length) throw new Error('bad');
  const qCount = x => (x.topics || []).reduce((a, t) => a + (t.questions || []).length + (t.subtopics || []).reduce((b, u) => b + (u.questions || []).length, 0), 0);
  const auto = name => { const m = S.systems.find(x => normName(x.name) === normName(name)); return m ? m.id : ''; };
  const opts = sel => `<option value="">Create a new system</option>` + S.systems.map(x => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(x.emoji)} ${esc(x.name)}</option>`).join('');
  const totalQ = files.reduce((a, x) => a + qCount(x), 0);
  const choice = await openDialog({
    title: 'Import questions', primary: 'Import', wide: true,
    html: `<p>This file has ${plural(totalQ, 'question')}${files.length ? ` for ${plural(files.length, 'system')}` : ''}${exams.length ? `, and ${exams.length} exam ${exams.length === 1 ? 'entry' : 'entries'}` : ''}.</p>
      ${files.length ? `<div class="imp-list">${files.map((x, i) => `<div class="imp-row"><div><b>${esc(x.name)}</b><small>${plural(qCount(x), 'question')} in ${plural((x.topics || []).length, 'topic')}</small></div><select class="sel" data-i="${i}" aria-label="Where to put ${esc(x.name)}">${opts(auto(x.name))}</select></div>`).join('')}</div>` : ''}
      <label class="radio-row"><input type="checkbox" name="skipdup" checked><span><b>Skip questions that already exist</b>Compares the question text inside the same topic.</span></label>
      <p class="muted small">Your current book is kept. New topics are created when needed. You can undo right after.</p>`,
    collect: d => ({ map: $$('select[data-i]', d).map(x => x.value), skip: $('[name=skipdup]', d).checked })
  });
  if (!choice) throw new Error('cancelled');

  const now = Date.now(), added = { systems: [], nodes: [], qas: [], exams: [] };
  let dup = 0, newTopics = 0; const unknownTags = new Set();
  const findTag = t => { const v = String(t).trim().toLowerCase(); const f = allTags().find(x => x.id.toLowerCase() === v || x.name.toLowerCase() === v); if (!f) unknownTags.add(String(t)); return f ? f.id : null; };
  const findRev = t => { const v = String(t).trim().toLowerCase(); const f = REVS.find(x => x.id === v || x.name.toLowerCase() === v || x.short.toLowerCase() === v); return f ? f.id : null; };
  const mapT = arr => [...new Set((Array.isArray(arr) ? arr : []).map(findTag).filter(Boolean))];
  const mapR = arr => [...new Set((Array.isArray(arr) ? arr : []).map(findRev).filter(Boolean))];

  const sysTarget = files.map((x, i) => {
    if (choice.map[i]) return choice.map[i];
    const prev = added.systems.find(z => normName(z.name) === normName(x.name)); if (prev) return prev.id;
    const seedEntry = SEED.find(e => normName(e[0]) === normName(x.name));
    const rec = { id: uid(), name: String(x.name).trim(), emoji: seedEntry ? seedEntry[1] : '📚', color: COLORS[(S.systems.length + added.systems.length) % COLORS.length],
      order: (S.systems.length ? Math.max(...S.systems.map(z => z.order)) : -1) + 1 + added.systems.length, createdAt: now };
    added.systems.push(rec); return rec.id;
  });

  const nodeKey = (sid, pid, name) => sid + '|' + (pid || '') + '|' + normName(name);
  const nodeMap = new Map(S.nodes.map(n => [nodeKey(n.systemId, n.parentId, n.name), n]));
  const getNode = (sid, parent, name) => {
    const nm = String(name || '').trim() || 'General', k = nodeKey(sid, parent ? parent.id : null, nm);
    let n = nodeMap.get(k);
    if (!n) {
      const sibs = S.nodes.concat(added.nodes).filter(z => z.systemId === sid && (z.parentId || null) === (parent ? parent.id : null));
      n = { id: uid(), systemId: sid, parentId: parent ? parent.id : null, name: nm, order: sibs.length ? Math.max(...sibs.map(z => z.order)) + 1 : 0, createdAt: now };
      nodeMap.set(k, n); added.nodes.push(n); newTopics++;
    }
    return n;
  };
  const nextOrder = new Map(), seen = new Map();
  const ordFor = nid => { if (!nextOrder.has(nid)) { const qs = qasOf(nid); nextOrder.set(nid, qs.length ? Math.max(...qs.map(z => z.order)) + 1 : 0); } const v = nextOrder.get(nid); nextOrder.set(nid, v + 1); return v; };
  const seenFor = nid => { if (!seen.has(nid)) seen.set(nid, new Set(qasOf(nid).map(z => normQ(z.q)))); return seen.get(nid); };
  const addQs = (node, list) => (list || []).forEach(q => {
    const qt = String((q && q.q) || '').trim(); if (!qt) return;
    const set = seenFor(node.id), k = normQ(qt);
    if (choice.skip && set.has(k)) { dup++; return; }
    set.add(k);
    let a = sanitize(asHtml(q.a), false); if (!stripHtml(a)) a = '';
    added.qas.push({ id: uid(), systemId: node.systemId, nodeId: node.id, q: qt, a, tags: mapT(q.tags), rev: mapR(q.rev), order: ordFor(node.id), createdAt: now, updatedAt: now });
  });
  files.forEach((x, i) => (x.topics || []).forEach(t => {
    const tn = getNode(sysTarget[i], null, t.name); addQs(tn, t.questions);
    (t.subtopics || []).forEach(u => addQs(getNode(sysTarget[i], tn, u.name), u.questions));
  }));
  exams.forEach(e => {
    let sid = null;
    if (e.system) { const idx = files.findIndex(f => normName(f.name) === normName(e.system)); sid = idx > -1 ? sysTarget[idx] : (auto(e.system) || null); }
    const all = S.exams.concat(added.exams).filter(z => z.kind === e.kind);
    if (choice.skip && all.some(z => normQ(z.title) === normQ(e.title))) { dup++; return; }
    let body = sanitize(asHtml(e.body), false); if (!stripHtml(body)) body = '';
    added.exams.push({ id: uid(), kind: e.kind, title: String(e.title).trim(), body, systemId: sid, tags: mapT(e.tags), rev: mapR(e.rev), order: all.length ? Math.max(...all.map(z => z.order)) + 1 : 0, createdAt: now, updatedAt: now });
  });

  await save({ systems: added.systems, nodes: added.nodes, qas: added.qas, exams: added.exams });
  S.systems.push(...added.systems); S.nodes.push(...added.nodes); S.qas.push(...added.qas); S.exams.push(...added.exams);
  reindex(); render();
  const undo = async () => {
    const ids = k => new Set(added[k].map(z => z.id)), sI = ids('systems'), nI = ids('nodes'), qI = ids('qas'), eI = ids('exams');
    S.systems = S.systems.filter(z => !sI.has(z.id)); S.nodes = S.nodes.filter(z => !nI.has(z.id)); S.qas = S.qas.filter(z => !qI.has(z.id)); S.exams = S.exams.filter(z => !eI.has(z.id));
    await save({}, { systems: [...sI], nodes: [...nI], qas: [...qI], exams: [...eI] });
    reindex(); render(); toast('Import undone');
  };
  await openDialog({
    title: 'Import finished', primary: 'Done', secondary: null,
    html: `<p><b>${plural(added.qas.length, 'question')}</b> added${added.exams.length ? ` and ${added.exams.length} exam ${added.exams.length === 1 ? 'entry' : 'entries'}` : ''}.</p>
      <ul class="imp-sum"><li>${plural(added.systems.length, 'new system')}</li><li>${newTopics} new ${newTopics === 1 ? 'topic or subtopic' : 'topics and subtopics'}</li><li>${plural(dup, 'duplicate')} skipped</li>${unknownTags.size ? `<li>Tags not recognised and left out: ${esc([...unknownTags].join(', '))}</li>` : ''}</ul>
      <button type="button" class="btn small" id="impUndo">Undo this import</button>`,
    onOpen: d => $('#impUndo', d).addEventListener('click', async () => { d.close(); await undo(); })
  });
}
async function importBackup(data) {
  if (!data || data.app !== 'fcps-book' || !Array.isArray(data.systems) || !Array.isArray(data.nodes) || !Array.isArray(data.qas)) throw new Error('bad');
  const sysIds = new Set(data.systems.filter(s => s && s.id && s.name).map(s => s.id));
  const systems = data.systems.filter(s => sysIds.has(s.id)).map(s => ({ id: s.id, name: String(s.name), emoji: s.emoji || '📚', color: SAFE_COLOR.test(s.color || '') ? s.color : COLORS[0], order: +s.order || 0, createdAt: s.createdAt || Date.now() }));
  const nodes = data.nodes.filter(n => n && n.id && n.name && sysIds.has(n.systemId)).map(n => ({ id: n.id, systemId: n.systemId, parentId: n.parentId || null, name: String(n.name), order: +n.order || 0, createdAt: n.createdAt || Date.now() }));
  const nodeIds = new Set(nodes.map(n => n.id));
  const qas = data.qas.filter(q => q && q.id && nodeIds.has(q.nodeId) && sysIds.has(q.systemId)).map(q => ({ id: q.id, systemId: q.systemId, nodeId: q.nodeId, q: String(q.q || ''), a: sanitize(q.a || '', false), tags: Array.isArray(q.tags) ? q.tags.filter(x => typeof x === 'string').slice(0, 30) : [], rev: Array.isArray(q.rev) ? q.rev.filter(revById) : [], order: +q.order || 0, createdAt: q.createdAt || Date.now(), updatedAt: q.updatedAt || Date.now() }));
  const exams = (Array.isArray(data.exams) ? data.exams : []).filter(x => x && x.id && examById(x.kind)).map(x => ({ id: x.id, kind: x.kind, title: String(x.title || ''), body: sanitize(x.body || '', false), systemId: sysIds.has(x.systemId) ? x.systemId : null, tags: Array.isArray(x.tags) ? x.tags.filter(t => typeof t === 'string').slice(0, 30) : [], rev: Array.isArray(x.rev) ? x.rev.filter(revById) : [], order: +x.order || 0, createdAt: x.createdAt || Date.now(), updatedAt: x.updatedAt || Date.now() }));
  const mode = await openDialog({
    title: 'Restore from backup', primary: 'Restore', wide: false,
    html: `<p>This file has ${plural(systems.length, 'system')}, ${plural(nodes.length, 'topic/subtopic')}, ${plural(qas.length, 'question')} and ${exams.length} exam ${exams.length === 1 ? 'entry' : 'entries'}.</p>
      <label class="radio-row"><input type="radio" name="mode" value="merge" checked><span><b>Add to my book</b>Keeps what you have and adds or updates items from the file.</span></label>
      <label class="radio-row"><input type="radio" name="mode" value="replace"><span><b>Replace my book</b>Deletes everything here first, then restores the file.</span></label>`,
    collect: d => $('[name=mode]:checked', d).value
  });
  if (!mode) throw new Error('cancelled');
  const inc = ((data.settings && data.settings.customTags) || []).filter(t => t && t.id && t.name && SAFE_COLOR.test(t.color || '')).map(t => ({ id: String(t.id), name: String(t.name), color: t.color }));
  if (mode === 'replace') ST.customTags = inc;
  else inc.forEach(t => { if (!allTags().some(x => x.id === t.id)) ST.customTags.push(t); });
  saveST();
  if (mode === 'replace') {
    await commit({ systems, nodes, qas, exams }, { systems: S.systems.map(x => x.id), nodes: S.nodes.map(x => x.id), qas: S.qas.map(x => x.id), exams: S.exams.map(x => x.id) });
    S.systems = systems; S.nodes = nodes; S.qas = qas; S.exams = exams;
  } else {
    await commit({ systems, nodes, qas, exams });
    const merge = (arr, inc) => { const m = new Map(arr.map(x => [x.id, x])); inc.forEach(x => m.set(x.id, x)); return [...m.values()]; };
    S.systems = merge(S.systems, systems); S.nodes = merge(S.nodes, nodes); S.qas = merge(S.qas, qas); S.exams = merge(S.exams, exams);
  }
  IX.text.clear(); reindex(); ST.seeded = true; saveST(); onRoute();
  toast('Backup restored');
}

async function openSettings() {
  const fontGrid = key => FONTS.map(f => `<button type="button" class="font-btn${ST[key] === f.id ? ' on' : ''}" data-font="${key}" data-id="${f.id}" style="font-family:${esc(fontCss(f))}"><b>${esc(f.name)}</b><small>Aa Bb কখগ 123</small></button>`).join('');
  let est = '';
  try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); est = `${(e.usage / 1048576).toFixed(1)} MB used`; } } catch (e) {}
  let persisted = null; try { if (navigator.storage && navigator.storage.persisted) persisted = await navigator.storage.persisted(); } catch (e) {}
  const themeBtns = list => list.map(t => `<button type="button" class="theme-btn${ST.theme === t.id ? ' on' : ''}" data-tid="${t.id}"><span class="sw"><i style="background:${t.c[0]}"></i><i style="background:${t.c[1]}"></i><i style="background:${t.c[2]}"></i></span><span class="n">${t.name}</span></button>`).join('');
  const last = ST.lastBackup ? new Date(ST.lastBackup).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'never';
  await openDialog({
    title: 'Settings', primary: 'Done', secondary: null, wide: true,
    html: `<div class="set-sec"><h3>Light themes</h3><div class="theme-grid">${themeBtns(THEMES.filter(t => !t.night))}</div>
        <h3 style="margin-top:8px">Night themes</h3><div class="theme-grid">${themeBtns(THEMES.filter(t => t.night))}</div></div>
      <div class="set-sec"><h3>Dashboard text size</h3><div class="range-row"><span class="small">Small</span><input type="range" id="dsRange" min="11" max="22" step="1" value="${ST.dashSize || 17}" aria-label="Dashboard text size"><span class="small">Large</span></div>
        <p class="muted small">Smaller text fits more systems on screen. You can also use the A− and A+ buttons on the dashboard.</p></div>
      <div class="set-sec"><h3>App font</h3><div class="font-grid" id="fgUi">${fontGrid('uiFont')}</div></div>
      <div class="set-sec"><h3>Answer font</h3><div class="font-grid" id="fgNote">${fontGrid('noteFont')}</div>
        <div class="range-row"><span class="small">Size</span><input type="range" id="szRange" min="14" max="26" step="1" value="${ST.noteSize}" aria-label="Answer text size"><b id="szVal">${ST.noteSize}px</b></div></div>
      <div class="set-sec"><h3>Backup and import</h3><p class="muted small">Last backup: ${last}. Use a backup file to move your book between your MacBook and iPhone, and to keep it safe.</p>
        <div class="btn-row"><button type="button" class="btn" id="bkExport">${ic('download', 16)} Export backup</button><button type="button" class="btn" id="bkImport">${ic('upload', 16)} Restore from backup</button><button type="button" class="btn" id="docImport">${ic('upload', 16)} Import questions from a file</button></div></div>
      <div class="set-sec"><h3>Storage</h3><p class="muted small">${est ? est + '. ' : ''}${persisted === true ? 'This browser has marked your data as persistent.' : 'For the safest storage, install the app: on Mac use Safari > File > Add to Dock; on iPhone use Share > Add to Home Screen.'}</p></div>
      <p class="muted small">FCPS Book, ${APP_VERSION}</p>`,
    onOpen: d => {
      d.addEventListener('click', e => {
        const t = e.target.closest('.theme-btn');
        if (t) { ST.theme = t.dataset.tid; saveST(); applyLook(); $$('.theme-btn', d).forEach(b => b.classList.toggle('on', b === t)); return; }
        const f = e.target.closest('.font-btn');
        if (f) { ST[f.dataset.font] = f.dataset.id; saveST(); applyLook(); $$(`[data-font="${f.dataset.font}"]`, d).forEach(b => b.classList.toggle('on', b === f)); return; }
        if (e.target.closest('#bkExport')) exportBackup();
        if (e.target.closest('#bkImport') || e.target.closest('#docImport')) { d.close(); pickBackup(); }
      });
      $('#dsRange', d).addEventListener('input', e => { ST.dashSize = +e.target.value; saveST(); applyLook(); });
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
  'import-file': () => pickBackup(),
  'dash-down': () => { ST.dashSize = Math.max(11, (ST.dashSize || 17) - 1); saveST(); applyLook(); },
  'dash-up': () => { ST.dashSize = Math.min(22, (ST.dashSize || 17) + 1); saveST(); applyLook(); },
  'qa-tags': async el => {
    const q = findItem(el.dataset.id); if (!q) return;
    const v = await dlgTags({ tags: q.tags || [], rev: q.rev || [] }); if (!v) return;
    q.tags = v.tags; q.rev = v.rev; q.updatedAt = Date.now();
    await save({ [storeOf(q)]: [q] }); reindex(); render(true);
  },
  'rev-remove': async el => {
    const q = findItem(el.dataset.id), key = el.dataset.key; if (!q) return;
    q.rev = (q.rev || []).filter(x => x !== key); q.updatedAt = Date.now();
    await save({ [storeOf(q)]: [q] }); reindex(); render(true);
    toast('Removed from the list', { undo: async () => { q.rev = (q.rev || []).concat(key); q.updatedAt = Date.now(); await save({ [storeOf(q)]: [q] }); reindex(); render(true); } });
  },
  'new-entry': el => openEditor(null, null, el.dataset.kind),
  'edit-entry': el => { const e = S.exams.find(x => x.id === el.dataset.id); if (e) openEditor(null, e, e.kind); },
  'entry-menu': el => {
    const e = S.exams.find(x => x.id === el.dataset.id); if (!e) return;
    openMenu(el, [
      { label: 'Edit', icon: 'edit', run: () => openEditor(null, e, e.kind) },
      { label: 'Tags and revision', icon: 'tag', run: () => ACT['qa-tags']({ dataset: { id: e.id } }) },
      { label: 'Move to another section', icon: 'move', run: () => moveEntry(e.id) },
      '-', ...(parseRoute().v === 'exam' ? [...orderItems('exams', examsOf(e.kind), e.id, false), '-'] : []),
      { label: 'Delete', icon: 'trash', danger: true, run: () => deleteEntry(e.id) }
    ]);
  },
  'fc-flip': () => { if (FC && FC.queue.length) { FC.flip = true; render(true); } },
  'fc-know': () => fcRate(true),
  'fc-again': () => fcRate(false),
  'fc-restart': () => { FC = null; render(); },
  'fc-shuffle': () => { ST.fcShuffle = !(ST.fcShuffle !== false); saveST(); FC = null; render(); },
  'fc-missed': () => { if (FC && FC.missed.length) { fcStart(FC.key, FC.missed, FC.title, FC.back); render(); } },
  'fc-mark': el => {
    if (!FC) return;
    openMenu(el, REVS.map(r => ({ label: 'Add to ' + r.name, icon: 'flag', run: async () => {
      const qs = FC.missed.map(id => S.qas.find(q => q.id === id)).filter(Boolean);
      qs.forEach(q => { if (!(q.rev || []).includes(r.id)) q.rev = (q.rev || []).concat(r.id); q.updatedAt = Date.now(); });
      await save({ qas: qs }); reindex(); toast(`${plural(qs.length, 'question')} added to ${r.name}`);
    } })));
  },
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
      '-', ...(isCustom() ? [...orderItems('systems', S.systems, s.id, horizontal), '-'] : [{ label: 'Use my own order to move systems', icon: 'first', run: () => setSort('custom') }, '-']),
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
      { label: 'Tags and revision', icon: 'tag', run: () => ACT['qa-tags']({ dataset: { id: q.id } }) },
      { label: 'Move to another topic', icon: 'move', run: () => moveQa(q.id) },
      '-', ...(parseRoute().v === 'node' ? [...orderItems('qas', qasOf(q.nodeId), q.id, false), '-'] : []),
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
    const el = e.target.closest('[data-act]'), link = e.target.closest('a[href]');
    if (el && !(link && link !== el && el.contains(link))) { e.preventDefault(); const f = ACT[el.dataset.act]; if (f) f(el, e); return; }
    const card = e.target.closest('.card.sys');
    if (card) location.hash = '#/s/' + card.dataset.id;
  });
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.card.sys')) { e.preventDefault(); location.hash = '#/s/' + e.target.dataset.id; }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !$('dialog[open]')) { e.preventDefault(); $('#q').focus(); $('#q').select(); }
  });
  document.addEventListener('keydown', e => {
    if (parseRoute().v !== 'cards' || !FC || $('dialog[open]') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.matches && e.target.matches('input,textarea,select,[contenteditable]')) return;
    if ((e.key === ' ' || e.key === 'Enter') && !FC.flip && FC.queue.length) { e.preventDefault(); ACT['fc-flip'](); }
    else if (FC.flip && (e.key === '1' || e.key === 'ArrowLeft')) { e.preventDefault(); fcRate(false); }
    else if (FC.flip && (e.key === '2' || e.key === 'ArrowRight')) { e.preventDefault(); fcRate(true); }
  });
  $('#main').addEventListener('change', e => { if (e.target.id === 'examSys') { examSys = e.target.value; render(true); } else if (e.target.id === 'sysSort') setSort(e.target.value); });
  $('#sidebar').addEventListener('change', e => { if (e.target.id === 'sideSort') setSort(e.target.value); });
  $('#sidebar').addEventListener('input', e => { if (e.target.id === 'sideFind') { sideFilter = e.target.value; renderTree(); } });
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
  [S.systems, S.nodes, S.qas, S.exams] = await Promise.all(STORES.map(readAll));
  if (!S.systems.length && !ST.seeded) await seed(); else await migrateSystems();
  reindex();
  ensureExpanded(parseRoute()); markSeen(parseRoute());
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
start();
window.__fcps = { S, IX, sanitize, render };  // small handle for debugging in the console
})();
