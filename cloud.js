/* FCPS Book — cloud layer.
 * Login (email + password), admin approval, one device per account, and live central sync.
 * Loaded before app.js. It does not change app.js: it watches the app's local storage and keeps it in step with Firebase.
 *
 *  - Admin (role "admin"): every add / edit / delete is pushed to the cloud and appears on every device at once.
 *  - User  (role "user") : reads the central book. Their own edits stay on their device only and are never uploaded.
 *                          Central updates reach every item they have not edited themselves.
 */
(() => {
'use strict';

const STORES = ['systems', 'nodes', 'qas', 'exams'];
const K = { dev: 'fcpsbook.cloud.device', session: 'fcpsbook.cloud.session', owner: 'fcpsbook.cloud.owner', hidden: 'fcpsbook.cloud.hidden', settings: 'fcpsbook.settings.v1' };
/* An edit to one of these fields counts as "the user changed this item" and stops central updates for that item. */
const CONTENT = {
  systems: ['name', 'emoji', 'color'],
  nodes: ['name', 'parentId', 'systemId'],
  qas: ['q', 'a', 'nodeId', 'systemId'],
  exams: ['title', 'body', 'kind', 'systemId']
};

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const same = (a, b) => JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
const byOrder = (a, b) => (a.order - b.order) || ((a.createdAt || 0) - (b.createdAt || 0));
const push = (m, k, v) => { const a = m.get(k); if (a) a.push(v); else m.set(k, [v]); };

/* The app starts its own starter list on a fresh device. With a central book that would create duplicates, so switch it off. */
try {
  const s = lsGet(K.settings, {});
  if (!s.seeded || (s.sysListV || 0) < 2) { s.seeded = true; s.sysListV = 2; lsSet(K.settings, s); }
} catch (e) {}

let DEV = lsGet(K.dev, null);
if (!DEV) { DEV = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); lsSet(K.dev, DEV); }

/* ============================== state ============================== */
let auth = null, fdb = null, usersCol = null, contentCol = null;
let me = null;                       // { uid, email, name, role, status, deviceId }
let entered = false, claimNext = false, claiming = false, creating = false, pendingName = '', kickNote = '';
let unsubUser = null, unsubContent = null, unsubUsers = null, userDocTimer = null, gotUserDoc = false;
let usersList = [], firstServer = false;
let expTimer = null, warned = false;
let sync = 'idle';                   // idle | live | cached | saving | offline
const lastDocs = new Map();          // 'store_id' -> central data
const stash = new Map();             // items waiting for their parent to arrive
let hidden = new Set(lsGet(K.hidden, []));
const saveHidden = () => lsSet(K.hidden, [...hidden]);
const isAdmin = () => !!(me && me.role === 'admin' && me.status === 'approved');

/* Subscription: a member's access runs until expiresAt (ms). The admin never expires. */
const DAY = 864e5;
const PLAN_TXT = { '6m': '6 months', '1y': '1 year' };
const expiredNow = () => !!(me && me.role !== 'admin' && !(me.expiresAt > Date.now()));
const fmtDate = ms => { try { return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };
const addMonths = (base, n) => { const d = new Date(base); d.setMonth(d.getMonth() + n); return d.getTime(); };
const daysLeft = ms => Math.ceil((ms - Date.now()) / DAY);

/* ============================== watching the app's local writes ============================== */
let ownDb = null;
const txOps = new WeakMap();
const pend = new Map();
let pushTimer = null, inflight = 0;

const origPut = IDBObjectStore.prototype.put;
const origDelete = IDBObjectStore.prototype.delete;

function track(os, op, arg) {
  try {
    if (!me || me.status !== 'approved') return;
    const tx = os.transaction, db = tx.db;
    if (db.name !== 'fcps-book' || db === ownDb || STORES.indexOf(os.name) < 0) return;
    const store = os.name;
    if (isAdmin()) {
      let list = txOps.get(tx);
      if (!list) { list = []; txOps.set(tx, list); tx.addEventListener('complete', () => queuePush(list)); }
      list.push(op === 'put' ? { store, op, id: arg.id, val: JSON.parse(JSON.stringify(arg)) } : { store, op, id: arg });
    } else if (op === 'put') {
      if (!arg || typeof arg !== 'object') return;
      const key = store + '_' + arg.id, cur = lastDocs.get(key);
      if (hidden.delete(key)) saveHidden();
      if (!cur) arg._local = true;
      else if (CONTENT[store].some(f => !same(arg[f], cur[f]))) arg._mod = true;
    } else {
      hidden.add(store + '_' + arg); saveHidden();
    }
  } catch (e) {}
}
IDBObjectStore.prototype.put = function (v) { track(this, 'put', v); return origPut.apply(this, arguments); };
IDBObjectStore.prototype.delete = function (k) { track(this, 'delete', k); return origDelete.apply(this, arguments); };

const toCloud = (store, item) => {
  const o = { store };
  Object.keys(item).forEach(k => { if (k[0] !== '_' && item[k] !== undefined) o[k] = item[k]; });
  return JSON.parse(JSON.stringify(o));
};
function queuePush(list) {
  list.forEach(o => pend.set(o.store + '_' + o.id, o));
  clearTimeout(pushTimer); pushTimer = setTimeout(flushPush, 250);
  setSync('saving');
}
function flushPush() {
  const ops = [...pend.values()]; pend.clear();
  if (!ops.length || !fdb) return;
  ops.sort((a, b) => STORES.indexOf(a.store) - STORES.indexOf(b.store));
  for (let i = 0; i < ops.length; i += 400) {
    const batch = fdb.batch();
    ops.slice(i, i + 400).forEach(o => {
      const ref = contentCol.doc(o.store + '_' + o.id);
      if (o.op === 'put') batch.set(ref, toCloud(o.store, o.val)); else batch.delete(ref);
    });
    inflight++;
    batch.commit().then(() => { inflight--; setSync(); }, err => { inflight--; setSync(); toast('Could not save to the cloud: ' + (err && err.code ? err.code : 'error')); });
  }
}

/* ============================== applying cloud changes to the app ============================== */
function openOwn() {
  if (ownDb) return Promise.resolve(ownDb);
  return new Promise((res, rej) => {
    const r = indexedDB.open('fcps-book', 2);
    r.onupgradeneeded = () => { STORES.forEach(s => { if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: 'id' }); }); };
    r.onsuccess = () => { ownDb = r.result; ownDb.onversionchange = () => { ownDb.close(); ownDb = null; }; res(ownDb); };
    r.onerror = () => rej(r.error);
  });
}
function reindexIX(F) {
  const S = F.S, IX = F.IX;
  S.systems.sort(byOrder); S.nodes.sort(byOrder); S.qas.sort(byOrder); S.exams.sort(byOrder);
  IX.sys = new Map(S.systems.map(s => [s.id, s]));
  IX.node = new Map(S.nodes.map(n => [n.id, n]));
  IX.topics = new Map(); IX.subs = new Map(); IX.qaOf = new Map(); IX.sysQ = new Map(); IX.exam = new Map();
  for (const e of S.exams) push(IX.exam, e.kind, e);
  for (const n of S.nodes) { if (n.parentId) push(IX.subs, n.parentId, n); else push(IX.topics, n.systemId, n); }
  for (const q of S.qas) { push(IX.qaOf, q.nodeId, q); IX.sysQ.set(q.systemId, (IX.sysQ.get(q.systemId) || 0) + 1); }
  if (IX.text && IX.text.clear) IX.text.clear();
}
let renderTimer = null;
function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => { try { window.__fcps.render(true); } catch (e) {} }, 120);
}
const equalClean = (loc, item) => {
  const ks = Object.keys(item).filter(k => k[0] !== '_'), ls = Object.keys(loc).filter(k => k[0] !== '_');
  return ks.length === ls.length && ks.every(k => same(loc[k], item[k]));
};

let chain = Promise.resolve();
const enqueue = fn => { chain = chain.then(fn).catch(e => { try { console.error('[cloud]', e); } catch (x) {} }); return chain; };

async function applyChanges(changes) {
  const F = window.__fcps; if (!F || !changes.length && !stash.size) return;
  const S = F.S, user = !isAdmin();
  const maps = {}, puts = {}, dels = {};
  STORES.forEach(s => { maps[s] = new Map(S[s].map(x => [x.id, x])); puts[s] = new Map(); dels[s] = new Set(); });
  stash.forEach(o => { if (!maps[o.store].has(o.item.id)) maps[o.store].set(o.item.id, o.item); });
  stash.clear();
  const drop = (st, x) => { maps[st].delete(x.id); puts[st].delete(x.id); dels[st].add(x.id); };
  const cascade = (store, id) => {
    if (store === 'systems') {
      [...maps.nodes.values()].filter(n => n.systemId === id).forEach(n => drop('nodes', n));
      [...maps.qas.values()].filter(q => q.systemId === id).forEach(q => drop('qas', q));
    } else if (store === 'nodes') {
      const kids = [...maps.nodes.values()].filter(n => n.parentId === id);
      kids.forEach(n => drop('nodes', n));
      const ids = new Set([id].concat(kids.map(k => k.id)));
      [...maps.qas.values()].filter(q => ids.has(q.nodeId)).forEach(q => drop('qas', q));
    }
  };

  for (const c of changes) {
    const store = c.store, id = c.id, key = store + '_' + id, loc = maps[store].get(id);
    if (c.type === 'removed') {
      if (!loc) continue;
      if (user && loc._mod) { loc._local = true; puts[store].set(id, loc); continue; }   // keep the user's own edited copy
      drop(store, loc); cascade(store, id);
    } else {
      if (user && (hidden.has(key) || (loc && loc._mod))) continue;
      const item = Object.assign({}, c.data); delete item.store;
      if (user && loc && (store === 'qas' || store === 'exams')) { item.tags = loc.tags || item.tags || []; item.rev = loc.rev || item.rev || []; }
      if (loc && equalClean(loc, item)) continue;
      maps[store].set(id, item); puts[store].set(id, item); dels[store].delete(id);
    }
  }

  /* anything whose parent has not arrived yet waits aside, so the app never shows a half-built tree */
  for (let pass = 0; pass < 3; pass++) {
    const orph = [];
    maps.nodes.forEach(n => { if (!maps.systems.has(n.systemId) || (n.parentId && !maps.nodes.has(n.parentId))) orph.push(['nodes', n]); });
    orph.forEach(([st, x]) => { maps[st].delete(x.id); stash.set(st + '_' + x.id, { store: st, item: x }); });
    const o2 = [];
    maps.qas.forEach(q => { if (!maps.nodes.has(q.nodeId) || !maps.systems.has(q.systemId)) o2.push(['qas', q]); });
    o2.forEach(([st, x]) => { maps[st].delete(x.id); stash.set(st + '_' + x.id, { store: st, item: x }); });
    if (!orph.length && !o2.length) break;
  }

  const names = STORES.filter(s => puts[s].size || dels[s].size);
  if (names.length) {
    const db = await openOwn();
    await new Promise((res, rej) => {
      const t = db.transaction(names, 'readwrite');
      names.forEach(n => { const os = t.objectStore(n); dels[n].forEach(id => os.delete(id)); puts[n].forEach(v => os.put(v)); });
      t.oncomplete = res; t.onerror = t.onabort = () => rej(t.error || new Error('write failed'));
    });
  }
  STORES.forEach(s => { S[s] = [...maps[s].values()]; });
  reindexIX(F); scheduleRender();
}

function appReady() {
  return new Promise(res => {
    let n = 0;
    const t = setInterval(() => {
      const m = document.getElementById('main');
      if (window.__fcps && m && m.children.length) { clearInterval(t); res(); }
      else if (++n > 150) { clearInterval(t); res(); }
    }, 80);
  });
}

function downloadBackup() {
  try {
    const S = window.__fcps.S;
    const data = { app: 'fcps-book', version: 1, exportedAt: new Date().toISOString(), settings: { customTags: [] }, systems: S.systems, nodes: S.nodes, qas: S.qas, exams: S.exams };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    a.download = `fcps-book-device-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } catch (e) {}
}
async function wipeLocal() {
  const F = window.__fcps, db = await openOwn();
  await new Promise((res, rej) => {
    const t = db.transaction(STORES, 'readwrite');
    STORES.forEach(s => t.objectStore(s).clear());
    t.oncomplete = res; t.onerror = t.onabort = () => rej(t.error);
  });
  STORES.forEach(s => { F.S[s] = []; });
  hidden = new Set(); saveHidden(); stash.clear();
  reindexIX(F);
  if (location.hash && location.hash !== '#/') location.hash = '#/';
  scheduleRender();
}
/* A different account on the same browser must never see the previous account's book. */
async function ownerCheck() {
  const F = window.__fcps; if (!F) return;
  const owner = lsGet(K.owner, null);
  if (owner && owner !== me.uid) {
    if (STORES.some(s => F.S[s].length)) { downloadBackup(); toast('Another account used this browser. Its book was saved to a backup file and cleared.'); }
    await wipeLocal();
  }
  lsSet(K.owner, me.uid);
}

/* ============================== cloud listeners ============================== */
function startContent() {
  if (unsubContent) return;
  firstServer = false;
  unsubContent = contentCol.onSnapshot({ includeMetadataChanges: true }, snap => {
    const changes = [];
    snap.docChanges({ includeMetadataChanges: false }).forEach(ch => {
      const d = ch.doc, data = d.data(), store = data.store, id = d.id.slice(store ? store.length + 1 : 0), key = d.id;
      if (STORES.indexOf(store) < 0) return;
      if (ch.type === 'removed') lastDocs.delete(key); else lastDocs.set(key, data);
      if (d.metadata.hasPendingWrites && isAdmin()) return;      // the admin's own write, already applied locally
      changes.push({ type: ch.type === 'removed' ? 'removed' : 'upsert', store, id, data });
    });
    if (changes.length) enqueue(() => applyChanges(changes));
    setSync(snap.metadata.fromCache ? 'cached' : 'live');
    if (!snap.metadata.fromCache && !firstServer) {
      firstServer = true;
      const F = window.__fcps;
      if (isAdmin() && snap.empty && F && STORES.some(s => F.S[s].length)) { toast('The cloud is empty. Use the cloud button to upload this device\'s book.'); setTimeout(openAccount, 600); }
    }
  }, err => { setSync('offline'); try { console.warn('[cloud] content', err); } catch (e) {} });
}
function stopContent() { if (unsubContent) { unsubContent(); unsubContent = null; } }
function startUsers() {
  if (unsubUsers || !isAdmin()) return;
  unsubUsers = usersCol.onSnapshot(snap => {
    usersList = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
    updateBtn(); if ($('#cgUsers')) renderUsers();
  }, () => {});
}
function stopUsers() { if (unsubUsers) { unsubUsers(); unsubUsers = null; } usersList = []; }

async function enterApp() {
  if (entered) return;
  entered = true;
  await appReady();
  try { await ownerCheck(); } catch (e) {}
  if (!entered) return;
  startContent(); startUsers(); mountBtn(); updateBtn(); hideGate();
  if (me && me.role !== 'admin' && me.expiresAt && daysLeft(me.expiresAt) <= 14 && !warned) {
    warned = true; const n = daysLeft(me.expiresAt);
    toast(`Your subscription ends in ${n} day${n === 1 ? '' : 's'}. Contact the admin to renew.`);
  }
}
function leaveApp() {
  entered = false; stopContent(); stopUsers(); lastDocs.clear();
  const b = $('#cloudBtn'); if (b) b.remove();
}

/* ============================== account document ============================== */
function handleUserDoc(snap) {
  gotUserDoc = true; clearTimeout(userDocTimer);
  const u = auth.currentUser; if (!u) return;
  if (!snap.exists) {
    if (creating) return; creating = true;
    usersCol.doc(u.uid).set({
      email: u.email || '', name: (pendingName || (u.email || '').split('@')[0]).slice(0, 80), status: 'pending', role: 'user',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(), deviceId: '', deviceAt: null
    }).catch(e => { creating = false; viewLogin('login', fbMsg(e)); });
    return;
  }
  creating = false;
  const d = snap.data();
  me = { uid: u.uid, email: u.email || d.email || '', name: d.name || '', role: d.role === 'admin' ? 'admin' : 'user', status: d.status || 'pending', deviceId: d.deviceId || '',
    plan: d.plan || '', expiresAt: Number(d.expiresAt) || 0 };
  lsSet(K.session, { uid: me.uid, email: me.email, role: me.role, status: me.status, plan: me.plan, expiresAt: me.expiresAt });
  route();
  updateBtn();
}
/* Decide what this account sees: the book, a waiting / blocked / expired screen. Runs on every account change and when a subscription runs out. */
function route() {
  clearTimeout(expTimer);
  if (!me || !auth || !auth.currentUser) return;
  if (me.status === 'approved') {
    if (expiredNow()) { if (entered) leaveApp(); viewExpired(); return; }
    if (me.role !== 'admin') {
      armExpiry();
      if (claimNext || !me.deviceId) {
        claimNext = false; claiming = true;
        usersCol.doc(me.uid).update({ deviceId: DEV, deviceAt: firebase.firestore.FieldValue.serverTimestamp() })
          .then(() => { claiming = false; }, () => { claiming = false; });
      } else if (me.deviceId !== DEV && !claiming) { kick('You were signed out because this account was opened on another device.'); return; }
    }
    enterApp();
  } else {
    if (entered) leaveApp();
    if (me.status === 'blocked') viewBlocked(); else viewPending();
  }
}
/* Lock the book at the moment the subscription ends, even if the app is open at that time. */
function armExpiry() {
  clearTimeout(expTimer);
  if (!me || me.role === 'admin' || me.status !== 'approved' || !(me.expiresAt > Date.now())) return;
  expTimer = setTimeout(route, Math.min(me.expiresAt - Date.now() + 300, 2147483000));
}
function watchUser(user) {
  if (unsubUser) { unsubUser(); unsubUser = null; }
  gotUserDoc = false;
  unsubUser = usersCol.doc(user.uid).onSnapshot(handleUserDoc, () => {});
  /* offline and nothing cached yet: trust the last known state of this account */
  clearTimeout(userDocTimer);
  userDocTimer = setTimeout(() => {
    const s = lsGet(K.session, null);
    if (!gotUserDoc && s && s.uid === user.uid && s.status === 'approved') {
      me = { uid: s.uid, email: s.email, name: '', role: s.role === 'admin' ? 'admin' : 'user', status: 'approved', deviceId: DEV, plan: s.plan || '', expiresAt: Number(s.expiresAt) || 0 };
      setSync('offline'); route();
    }
  }, 5000);
}
function kick(msg) { kickNote = msg; if (auth) auth.signOut(); }

/* ============================== sign in / up ============================== */
const fbMsg = e => {
  const c = (e && e.code) || '';
  if (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/user-not-found' || c === 'auth/invalid-login-credentials') return 'Wrong email or password.';
  if (c === 'auth/email-already-in-use') return 'That email already has an account. Use Sign in.';
  if (c === 'auth/weak-password') return 'Use a password of at least 6 characters.';
  if (c === 'auth/invalid-email') return 'That email address does not look right.';
  if (c === 'auth/network-request-failed' || c === 'unavailable') return 'No internet connection. Connect and try again.';
  if (c === 'auth/too-many-requests') return 'Too many tries. Wait a few minutes and try again.';
  if (c === 'permission-denied') return 'The server refused this action. Check the Firestore rules.';
  return 'Something went wrong' + (c ? ' (' + c + ')' : '') + '.';
};
async function doLogin(email, pw) { claimNext = true; await auth.signInWithEmailAndPassword(email, pw); }
async function doSignup(name, email, pw) { pendingName = name; claimNext = true; await auth.createUserWithEmailAndPassword(email, pw); }

/* ============================== gate screens ============================== */
function gate(html) {
  let g = $('#cloudGate');
  if (!g) { g = document.createElement('div'); g.id = 'cloudGate'; document.body.appendChild(g); }
  g.innerHTML = html; g.hidden = false;
  document.querySelectorAll('dialog[open]').forEach(d => { try { d.close(); } catch (e) {} });
  return g;
}
function hideGate() { const g = $('#cloudGate'); if (g) g.hidden = true; }
const brand = '<div class="cg-brand"><span class="cg-mark">📚</span><b>FCPS Book</b></div>';
function viewLoading(t) { gate(`<div class="cg-card cg-center">${brand}<div class="cg-spin" aria-hidden="true"></div><p class="cg-sub">${esc(t || 'Opening your book…')}</p></div>`); }
function viewSetup(msg) { gate(`<div class="cg-card">${brand}<h1>Cloud is not set up yet</h1><p class="cg-sub">${esc(msg)}</p></div>`); }
/* How to pay: written by the admin in firebase-config.js (window.FCPS_CONTACT). Shown on the waiting and expired screens. */
const payNote = () => { const n = String(window.FCPS_CONTACT || '').trim(); return n ? `<p class="cg-pay">${esc(n)}</p>` : ''; };
function viewPending() {
  const g = gate(`<div class="cg-card cg-center">${brand}<h1>Waiting for approval</h1>
    <p class="cg-sub">Your account <b>${esc(me ? me.email : '')}</b> is created. The admin approves it after your subscription payment, for 6 months or 1 year. This page opens by itself once you are approved.</p>
    ${payNote()}
    <div class="cg-row"><button class="btn" id="cgOut" type="button">Sign out</button></div></div>`);
  $('#cgOut', g).onclick = () => auth.signOut();
}
function viewExpired() {
  const g = gate(`<div class="cg-card cg-center">${brand}<h1>Subscription ended</h1>
    <p class="cg-sub">Access for <b>${esc(me ? me.email : '')}</b> ended${me && me.expiresAt ? ' on <b>' + esc(fmtDate(me.expiresAt)) + '</b>' : ''}. To continue, renew with the admin. This page opens by itself once you are renewed.</p>
    <p class="cg-sub small">Your own notes and changes are safe on this device and will be here when you return.</p>
    ${payNote()}
    <div class="cg-row"><button class="btn" id="cgOut" type="button">Sign out</button></div></div>`);
  $('#cgOut', g).onclick = () => auth.signOut();
}
function viewBlocked() {
  const g = gate(`<div class="cg-card cg-center">${brand}<h1>Access is off</h1>
    <p class="cg-sub">Access for <b>${esc(me ? me.email : '')}</b> is switched off. Please contact the admin.</p>
    <div class="cg-row"><button class="btn" id="cgOut" type="button">Sign out</button></div></div>`);
  $('#cgOut', g).onclick = () => auth.signOut();
}
function viewLogin(tab, note) {
  const signup = tab === 'signup';
  const g = gate(`<div class="cg-card">${brand}
    <div class="cg-tabs" role="tablist"><button type="button" data-tab="login" class="${signup ? '' : 'on'}">Sign in</button><button type="button" data-tab="signup" class="${signup ? 'on' : ''}">Create account</button></div>
    ${note ? `<p class="cg-note">${esc(note)}</p>` : ''}
    <form id="cgForm" novalidate>
      ${signup ? '<label>Your name<input name="name" type="text" autocomplete="name" maxlength="80" required></label>' : ''}
      <label>Email<input name="email" type="email" autocomplete="email" inputmode="email" required></label>
      <label>Password<input name="pw" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="6" required></label>
      <p class="cg-err" id="cgErr" role="alert"></p>
      <button class="btn primary big" id="cgGo" type="submit">${signup ? 'Create account' : 'Sign in'}</button>
    </form>
    ${signup ? '<p class="cg-sub small">After you create an account, the admin has to approve it before you can use the book.</p>' : '<button class="cg-link" id="cgForgot" type="button">Forgot password?</button>'}</div>`);
  g.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => viewLogin(b.dataset.tab));
  const err = m => { $('#cgErr', g).textContent = m || ''; };
  $('#cgForm', g).addEventListener('submit', async e => {
    e.preventDefault(); err('');
    const f = e.target, v = n => { const x = f.elements.namedItem(n); return x ? x.value : ''; }, email = v('email').trim(), pw = v('pw'), name = v('name').trim();
    if (!email || !pw || (signup && !name)) return err('Fill in every box.');
    const go = $('#cgGo', g); go.disabled = true;
    try { if (signup) await doSignup(name, email, pw); else await doLogin(email, pw); viewLoading('Signing in…'); }
    catch (x) { claimNext = false; go.disabled = false; err(fbMsg(x)); }
  });
  const fg = $('#cgForgot', g);
  if (fg) fg.onclick = async () => {
    const email = $('#cgForm', g).elements.namedItem('email').value.trim();
    if (!email) return err('Type your email first, then tap Forgot password.');
    try { await auth.sendPasswordResetEmail(email); err(''); toast('Password reset email sent. Check your inbox.'); } catch (x) { err(fbMsg(x)); }
  };
}

/* ============================== toasts, dialogs ============================== */
function toast(msg) {
  const host = $('dialog[open]') || $('#toasts') || document.body;
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
  t.innerHTML = `<span>${esc(msg)}</span>`; host.appendChild(t); setTimeout(() => t.remove(), 4200);
}
function modal(title, html, onOpen) {
  document.querySelectorAll('dialog.cg-dlg[open]').forEach(x => { try { x.close(); } catch (e) {} });
  const d = document.createElement('dialog'); d.className = 'dlg wide cg-dlg';
  d.innerHTML = `<form method="dialog" class="dlg-in"><h2>${esc(title)}</h2><div class="dlg-body">${html}</div><div class="dlg-foot"><button class="btn primary" value="ok">Close</button></div></form>`;
  document.body.appendChild(d); d.addEventListener('close', () => d.remove()); d.showModal();
  if (onOpen) onOpen(d);
  return d;
}

/* ============================== account button and panels ============================== */
const ICLOUD = '<svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 18a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 9.5 4.25 4.25 0 0 1 17.5 18z"/></svg>';
const SYNC_TXT = { idle: 'Connecting…', live: 'Up to date', cached: 'Offline copy (will update when online)', saving: 'Saving…', offline: 'Offline' };
function setSync(s) {
  if (s) sync = s;
  else if (inflight > 0 || pend.size) sync = 'saving';
  else if (!navigator.onLine) sync = 'offline';
  else if (sync === 'saving') sync = 'live';
  updateBtn();
}
function mountBtn() {
  if ($('#cloudBtn')) return;
  const anchor = $('#settingsBtn'); if (!anchor) return;
  const b = document.createElement('button');
  b.type = 'button'; b.id = 'cloudBtn'; b.className = 'icon-btn'; b.setAttribute('aria-label', 'Account and sync');
  b.innerHTML = ICLOUD + '<span class="cdot"></span><span class="cbadge" hidden></span>';
  b.onclick = openAccount; anchor.parentNode.insertBefore(b, anchor);
}
function updateBtn() {
  const b = $('#cloudBtn'); if (b) {
    b.dataset.sync = !navigator.onLine && sync !== 'saving' ? 'offline' : sync;
    b.title = (me ? me.email + ' · ' : '') + (SYNC_TXT[b.dataset.sync] || '');
    const n = usersList.filter(u => u.status === 'pending').length, bd = $('.cbadge', b);
    if (bd) { bd.hidden = !(isAdmin() && n); bd.textContent = n; }
  }
  const s = $('#cgSyncTxt'); if (s) s.textContent = SYNC_TXT[(navigator.onLine || sync === 'saving') ? sync : 'offline'] || '';
}
window.addEventListener('online', () => setSync());
window.addEventListener('offline', () => setSync('offline'));

function openAccount() {
  if (!me) return;
  const admin = isAdmin(), waiting = usersList.filter(u => u.status === 'pending').length;
  modal('Account and sync', `
    <div class="set-sec"><h3>Signed in</h3>
      <p><b>${esc(me.name || me.email)}</b><br><span class="muted small">${esc(me.email)} · ${admin ? 'Admin' : 'Member'}</span></p>
      <p class="muted small">Sync: <b id="cgSyncTxt"></b></p>
      ${!admin && me.expiresAt ? `<p class="muted small">Subscription: <b>${esc(PLAN_TXT[me.plan] || 'Active')}</b> · valid until <b>${esc(fmtDate(me.expiresAt))}</b> (${daysLeft(me.expiresAt)} days left)</p>
        ${daysLeft(me.expiresAt) <= 14 ? '<p class="cg-note">Your subscription ends soon. Contact the admin to renew.</p>' : ''}` : ''}
      ${admin ? '<p class="muted small">Everything you add, edit or delete here appears on all your devices and for every member.</p>'
        : '<p class="muted small">You can read the whole book and use it offline. Anything you write or change stays on this device only.</p>'}
    </div>
    ${admin ? `<div class="set-sec"><h3>Admin</h3><div class="btn-row">
      <button type="button" class="btn" id="cgUsersBtn">Manage users${waiting ? ` (${waiting} waiting)` : ''}</button>
      <button type="button" class="btn" id="cgUpload">Upload this device's book to the cloud</button></div>
      <p class="muted small">Use the upload button once, on the device that holds your full book.</p></div>` : ''}
    <div class="set-sec"><div class="btn-row"><button type="button" class="btn danger" id="cgSignOut">Sign out</button></div></div>`,
  d => {
    updateBtn();
    $('#cgSignOut', d).onclick = () => { d.close(); auth.signOut(); };
    const ub = $('#cgUsersBtn', d); if (ub) ub.onclick = () => { d.close(); openUsers(); };
    const up = $('#cgUpload', d); if (up) up.onclick = () => { d.close(); uploadAll(); };
  });
}

function renderUsers() {
  const box = $('#cgUsers'); if (!box) return;
  const order = { pending: 0, approved: 1, blocked: 2 };
  const list = usersList.slice().sort((a, b) => (order[a.status] - order[b.status]) || String(a.email).localeCompare(String(b.email)));
  const when = u => { try { return u.createdAt && u.createdAt.toDate ? u.createdAt.toDate().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''; } catch (e) { return ''; } };
  box.innerHTML = list.length ? list.map(u => {
    const self = me && u.id === me.uid, adm = u.role === 'admin';
    const btn = (a, t, c, plan) => `<button type="button" class="btn small ${c || ''}" data-u="${esc(u.id)}" data-a="${a}"${plan ? ` data-plan="${plan}"` : ''}>${t}</button>`;
    const live = u.status === 'approved' && u.expiresAt > Date.now(), over = u.status === 'approved' && !adm && !live;
    let acts = '';
    if (!self && !adm) {
      if (u.status === 'pending' || u.status === 'blocked') acts = btn('grant', 'Approve 6 months', 'primary', '6m') + btn('grant', 'Approve 1 year', 'primary', '1y') + (u.status === 'pending' ? btn('blocked', 'Reject') : '');
      else acts = btn('grant', 'Renew +6 months', 'primary', '6m') + btn('grant', 'Renew +1 year', 'primary', '1y') + btn('blocked', 'Block') + btn('pending', 'Set to waiting');
      acts += btn('delete', 'Remove', 'danger');
    }
    const sub = u.status === 'approved' && !adm
      ? (u.expiresAt ? ` · ${esc(PLAN_TXT[u.plan] || 'plan')} · ${live ? 'until ' + esc(fmtDate(u.expiresAt)) + ' (' + daysLeft(u.expiresAt) + ' days left)' : 'ended ' + esc(fmtDate(u.expiresAt))}` : ' · no plan set') : '';
    return `<div class="cg-user"><div class="cg-uinfo"><b>${esc(u.name || u.email)}</b><span class="muted small">${esc(u.email)}${when(u) ? ' · joined ' + esc(when(u)) : ''}${sub}</span></div>
      <span class="cg-chip ${over ? 'blocked' : esc(u.status)}">${adm ? 'admin' : over ? 'expired' : esc(u.status)}</span><div class="cg-acts">${acts}</div></div>`;
  }).join('') : '<p class="muted">No one has created an account yet.</p>';
}
function openUsers() {
  modal('Users', '<div id="cgUsers" class="cg-users"></div><p class="muted small">New people appear here as “pending”. After you receive their payment, approve them for 6 months or 1 year. The time starts from the day you approve. Renewing early adds to the time they have left. A member can use one device at a time: signing in on a new device signs the old one out.</p>', d => {
    renderUsers();
    d.addEventListener('click', async e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const id = b.dataset.u, a = b.dataset.a; b.disabled = true;
      try {
        if (a === 'delete') { if (confirm('Remove this user? They can create an account again, and it will wait for approval.')) await usersCol.doc(id).delete(); }
        else if (a === 'grant') {
          const u = usersList.find(x => x.id === id) || {}, plan = b.dataset.plan === '1y' ? '1y' : '6m';
          const base = u.status === 'approved' && u.expiresAt > Date.now() ? u.expiresAt : Date.now();
          await usersCol.doc(id).update({ status: 'approved', plan, expiresAt: addMonths(base, plan === '1y' ? 12 : 6), decidedAt: firebase.firestore.FieldValue.serverTimestamp() });
        }
        else await usersCol.doc(id).update({ status: a, decidedAt: firebase.firestore.FieldValue.serverTimestamp() });
      } catch (x) { toast(fbMsg(x)); }
      b.disabled = false;
    });
  });
}

async function uploadAll() {
  const F = window.__fcps, items = [];
  STORES.forEach(s => F.S[s].forEach(x => items.push({ store: s, item: x })));
  if (!items.length) return toast('Nothing on this device to upload.');
  if (!confirm(`Upload ${items.length} items from this device to the cloud?\nItems that already exist in the cloud are replaced by this device's version.`)) return;
  if (!navigator.onLine) return toast('You are offline. Connect to the internet first.');
  inflight++; setSync('saving');
  try {
    for (let i = 0; i < items.length; i += 400) {
      const b = fdb.batch();
      items.slice(i, i + 400).forEach(o => b.set(contentCol.doc(o.store + '_' + o.item.id), toCloud(o.store, o.item)));
      await b.commit();
      toast(`Uploaded ${Math.min(i + 400, items.length)} of ${items.length}`);
    }
    toast('Upload finished. Your book is now in the cloud.');
  } catch (e) { toast('Upload stopped: ' + fbMsg(e)); }
  inflight--; setSync();
}

/* ============================== start ============================== */
async function init() {
  const cfg = window.FCPS_FIREBASE || {};
  if (typeof firebase === 'undefined') return viewSetup('The Firebase files did not load. Open the app once with an internet connection.');
  if (!cfg.apiKey || /^PASTE/i.test(cfg.apiKey) || !cfg.projectId) return viewSetup('Open firebase-config.js and paste your Firebase project settings into it. The steps are in SETUP.txt.');
  try {
    firebase.initializeApp(cfg);
    auth = firebase.auth(); fdb = firebase.firestore();
    try { fdb.settings({ experimentalAutoDetectLongPolling: true, merge: true }); } catch (e) {}
    try { await fdb.enablePersistence({ synchronizeTabs: true }); } catch (e) {}
    usersCol = fdb.collection('users'); contentCol = fdb.collection('content');
  } catch (e) { return viewSetup('Could not start Firebase: ' + (e && e.message ? e.message : e)); }
  viewLoading();
  auth.onAuthStateChanged(user => {
    if (unsubUser) { unsubUser(); unsubUser = null; }
    clearTimeout(userDocTimer);
    if (!user) {
      leaveApp(); me = null; creating = false;
      const n = kickNote; kickNote = ''; viewLogin('login', n); return;
    }
    if (!entered) viewLoading();
    watchUser(user);
  });
}
viewLoading();
init();
})();
