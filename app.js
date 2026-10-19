/* ICYMI — bookmark keeper. All data stays on-device (localStorage). */
(() => {
  'use strict';

  // ---------- helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const KEY = 'icymi.v1';
  const COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#64748b', '#1f2937'];
  const STYLE = { s: 'fa-solid', r: 'fa-regular', b: 'fa-brands' };
  const ICONS = window.FA_ICONS || [];
  const ICON_MAP = new Map(ICONS.map(i => [i[0], i]));
  const POPULAR = ['bookmark', 'star', 'heart', 'house', 'briefcase', 'book-open', 'newspaper', 'play', 'film', 'music', 'headphones', 'podcast',
    'cart-shopping', 'bag-shopping', 'gift', 'utensils', 'mug-hot', 'pizza-slice', 'plane', 'map-location-dot', 'car', 'hotel', 'code', 'terminal',
    'laptop', 'mobile-screen', 'graduation-cap', 'lightbulb', 'brain', 'flask', 'palette', 'camera', 'pen-nib', 'gamepad', 'dumbbell', 'heart-pulse',
    'leaf', 'paw', 'baby', 'money-bill-wave', 'chart-line', 'piggy-bank', 'calendar', 'envelope', 'comments', 'user-group', 'globe', 'link',
    'bolt', 'fire', 'rocket', 'wand-magic-sparkles', 'shirt', 'tv', 'house-chimney', 'hammer', 'seedling', 'futbol', 'basketball', 'church',
    'youtube', 'instagram', 'tiktok', 'spotify', 'github', 'reddit', 'pinterest', 'x-twitter', 'amazon', 'apple', 'google', 'wikipedia-w']
    .filter(n => ICON_MAP.has(n));
  const styleOf = n => (ICON_MAP.get(n) || [0, 's'])[1];
  const fa = (name, extra = '') => `<i class="${STYLE[styleOf(name)]} fa-${esc(name)} ${extra}"></i>`;
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } }
  function normUrl(u) {
    u = (u || '').trim();
    if (!u) return '';
    if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u.replace(/^\/+/, '');
    return u;
  }
  function prettyTitle(u) {
    const h = hostOf(u); if (!h) return '';
    const base = h.split('.').slice(-2, -1)[0] || h;
    return base.charAt(0).toUpperCase() + base.slice(1);
  }
  const favUrl = u => { const h = hostOf(u); return h ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(h)}&sz=128` : ''; };
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // ---------- state ----------
  let state = load();
  const view = { q: '', edit: false };

  function seed() {
    const cats = [
      { id: uid(), name: 'Read Later', icon: 'book-open', color: '#6366f1' },
      { id: uid(), name: 'Watch', icon: 'play', color: '#ec4899' },
      { id: uid(), name: 'Recipes', icon: 'utensils', color: '#f97316' },
      { id: uid(), name: 'Work', icon: 'briefcase', color: '#14b8a6' },
    ];
    const now = Date.now();
    const bms = [
      { url: 'https://fontawesome.com/search?ic=free', title: 'Font Awesome Free', notes: 'Every free icon here is already built into ICYMI — tap a bookmark’s icon to pick one.', cat: null, tags: ['design', 'icons'], icon: { type: 'fa', name: ICON_MAP.has('font-awesome') ? 'font-awesome' : 'flag' }, color: '#3b82f6', fav: true },
      { url: 'https://www.seriouseats.com', title: 'Serious Eats', notes: '', cat: cats[2].id, tags: ['cooking'], icon: { type: 'fa', name: 'utensils' }, color: '#f97316', fav: false },
      { url: 'https://github.com', title: 'GitHub', notes: '', cat: cats[3].id, tags: ['dev'], icon: { type: 'favicon' }, color: '#1f2937', fav: false },
    ].map((b, i) => ({ id: uid(), created: now - i * 1000, ...b }));
    return { version: 1, bookmarks: bms, categories: cats, settings: { layout: 'list', sort: 'manual', theme: 'system', accent: '#6366f1' }, ui: { filter: 'all', tags: [] } };
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.bookmarks)) return sanitize(s);
    } catch { /* fall through to seed */ }
    return seed();
  }
  function sanitize(s) {
    s.categories = (s.categories || []).filter(c => c && c.id).map(c => ({ id: c.id, name: String(c.name || 'Untitled'), icon: ICON_MAP.has(c.icon) ? c.icon : 'folder', color: c.color || COLORS[0] }));
    const catIds = new Set(s.categories.map(c => c.id));
    s.bookmarks = s.bookmarks.filter(b => b && b.url).map(b => ({
      id: b.id || uid(), url: String(b.url), title: String(b.title || prettyTitle(b.url) || b.url), notes: String(b.notes || ''),
      cat: catIds.has(b.cat) ? b.cat : null, tags: Array.isArray(b.tags) ? [...new Set(b.tags.map(t => String(t).trim()).filter(Boolean))] : [],
      icon: b.icon && ['fa', 'favicon', 'letter'].includes(b.icon.type) ? { type: b.icon.type, name: ICON_MAP.has(b.icon.name) ? b.icon.name : (b.icon.type === 'fa' ? 'bookmark' : undefined) } : { type: 'favicon' },
      color: b.color || COLORS[0], fav: !!b.fav, created: +b.created || Date.now(),
    }));
    s.settings = Object.assign({ layout: 'list', sort: 'manual', theme: 'system', accent: '#6366f1' }, s.settings || {});
    s.ui = Object.assign({ filter: 'all', tags: [] }, s.ui || {});
    s.version = 1;
    return s;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { toast('Couldn’t save — storage is full'); }
  }
  const catById = id => state.categories.find(c => c.id === id);
  function allTags() {
    const m = new Map();
    state.bookmarks.forEach(b => b.tags.forEach(t => m.set(t, (m.get(t) || 0) + 1)));
    return [...m].sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }));
  }

  // ---------- rendering ----------
  function tileHTML(o, cls = '') {
    const type = o.icon?.type || 'favicon';
    const c = esc(o.color || COLORS[0]);
    if (type === 'fa') return `<div class="tile ${cls}" style="--c:${c}">${fa(o.icon.name || 'bookmark')}</div>`;
    const letter = esc(((o.title || hostOf(o.url) || '?').trim()[0] || '?').toUpperCase());
    if (type === 'favicon' && hostOf(o.url)) return `<div class="tile favicon ${cls}" style="--c:${c}" data-letter="${letter}"><img class="fav" alt="" loading="lazy" src="${esc(favUrl(o.url))}"></div>`;
    return `<div class="tile letter ${cls}" style="--c:${c}">${letter}</div>`;
  }
  // favicon failed to load -> fall back to a letter tile
  document.addEventListener('error', e => {
    const img = e.target;
    if (img.tagName === 'IMG' && img.classList.contains('fav')) {
      const t = img.parentElement; t.classList.remove('favicon'); t.classList.add('letter'); t.textContent = t.dataset.letter || '?';
    }
  }, true);

  function applyTheme() {
    const r = document.documentElement;
    if (state.settings.theme === 'system') r.removeAttribute('data-theme'); else r.dataset.theme = state.settings.theme;
    r.style.setProperty('--accent', state.settings.accent);
  }

  function visible() {
    const { filter, tags } = state.ui;
    const words = view.q.toLowerCase().split(/\s+/).filter(Boolean);
    let arr = state.bookmarks.filter(b => {
      if (filter === 'fav' && !b.fav) return false;
      if (filter === 'none' && b.cat) return false;
      if (filter !== 'all' && filter !== 'fav' && filter !== 'none' && b.cat !== filter) return false;
      if (tags.length && !tags.every(t => b.tags.includes(t))) return false;
      if (words.length) {
        const hay = [b.title, b.url, b.notes, b.tags.join(' '), catById(b.cat)?.name].join(' ').toLowerCase();
        if (!words.every(w => hay.includes(w))) return false;
      }
      return true;
    });
    if (state.settings.sort === 'new') arr = arr.slice().sort((a, b) => b.created - a.created);
    else if (state.settings.sort === 'az') arr = arr.slice().sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    return arr;
  }

  function render() {
    if (!['all', 'fav', 'none'].includes(state.ui.filter) && !catById(state.ui.filter)) state.ui.filter = 'all';
    const tagSet = new Set(allTags().map(t => t[0]));
    state.ui.tags = state.ui.tags.filter(t => tagSet.has(t));
    renderChips(); renderTagbar(); renderList();
    $('#viewBtn').innerHTML = `<i class="fa-solid ${state.settings.layout === 'grid' ? 'fa-table-cells-large' : 'fa-list'}"></i>`;
  }

  function renderChips() {
    const f = state.ui.filter, n = state.bookmarks.length;
    const count = id => state.bookmarks.filter(b => b.cat === id).length;
    const favs = state.bookmarks.filter(b => b.fav).length;
    const none = state.bookmarks.filter(b => !b.cat).length;
    let h = `<button class="chip ${f === 'all' ? 'on' : ''}" data-f="all" style="--c:var(--accent)"><i class="fa-solid fa-layer-group"></i>All <span class="n">${n}</span></button>`;
    if (favs) h += `<button class="chip ${f === 'fav' ? 'on' : ''}" data-f="fav" style="--c:#f59e0b"><i class="fa-solid fa-star"></i>Favorites <span class="n">${favs}</span></button>`;
    state.categories.forEach(c => {
      h += `<button class="chip ${f === c.id ? 'on' : ''}" data-f="${esc(c.id)}" style="--c:${esc(c.color)}">${fa(c.icon)}${esc(c.name)} <span class="n">${count(c.id)}</span></button>`;
    });
    if (none && state.categories.length && none !== n) h += `<button class="chip ${f === 'none' ? 'on' : ''}" data-f="none" style="--c:#64748b"><i class="fa-regular fa-folder-open"></i>Unsorted <span class="n">${none}</span></button>`;
    if (allTags().length) h += `<button class="chip ghost" data-act="tags"><i class="fa-solid fa-hashtag"></i>Tags</button>`;
    h += `<button class="chip ghost" data-act="newcat" aria-label="New category"><i class="fa-solid fa-folder-plus"></i>New</button>`;
    $('#chips').innerHTML = h;
  }

  function renderTagbar() {
    $('#tagbar').innerHTML = state.ui.tags.map(t => `<button class="tf" data-rmtag="${esc(t)}">#${esc(t)} <i class="fa-solid fa-xmark"></i></button>`).join('');
  }

  let sortable;
  function renderList() {
    const list = $('#list'), arr = visible(), grid = state.settings.layout === 'grid';
    list.className = 'list' + (grid ? ' grid' : '');
    list.innerHTML = arr.map(b => {
      if (grid) return `<div class="gitem" data-id="${esc(b.id)}">${tileHTML(b)}<div class="gt">${esc(b.title)}</div><span class="badge"><i class="fa-solid fa-pen"></i></span>${b.fav ? '<i class="fa-solid fa-star gstar"></i>' : ''}</div>`;
      const c = catById(b.cat);
      const showCat = c && state.ui.filter !== c.id;
      return `<div class="item" data-id="${esc(b.id)}">${tileHTML(b)}
        <div class="meta">
          <div class="t"><span>${esc(b.title)}</span>${b.fav ? '<i class="fa-solid fa-star star"></i>' : ''}</div>
          <div class="sub"><span class="dom">${esc(hostOf(b.url) || b.url)}</span>${showCat ? `<span>·</span><span class="cpill" style="--c:${esc(c.color)}">${fa(c.icon)}${esc(c.name)}</span>` : ''}</div>
          ${b.notes ? `<div class="note">${esc(b.notes)}</div>` : ''}
          <div class="tags">${b.tags.map(t => `<button class="tagpill" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}</div>
        </div>
        <button class="more" aria-label="Edit"><i class="fa-solid fa-ellipsis"></i></button></div>`;
    }).join('');

    const empty = $('#empty');
    if (!arr.length) {
      const filtered = view.q || state.ui.tags.length || state.ui.filter !== 'all';
      empty.innerHTML = filtered
        ? `<div class="ico"><i class="fa-solid fa-magnifying-glass"></i></div><h3>Nothing here</h3><p>No bookmarks match. Try a different search, tag or category.</p>`
        : `<div class="ico"><i class="fa-solid fa-bookmark"></i></div><h3>Save what matters</h3><p>Tap <b>+</b> to add your first bookmark. Organise with categories, tags and icons.</p>`;
      empty.hidden = false;
    } else empty.hidden = true;

    const canSort = state.settings.sort === 'manual' && typeof Sortable !== 'undefined';
    if (sortable) { sortable.destroy(); sortable = null; }
    if (canSort && arr.length > 1) {
      sortable = Sortable.create(list, {
        animation: 220, easing: 'cubic-bezier(.2,.9,.3,1)',
        delay: 260, delayOnTouchOnly: true, touchStartThreshold: 6,
        forceFallback: true, fallbackOnBody: true, fallbackTolerance: 4,
        ghostClass: 'ghost', chosenClass: 'chosen', filter: '.more', preventOnFilter: false,
        onStart: () => { dragging = true; },
        onEnd: () => {
          setTimeout(() => { dragging = false; }, 60);
          reorderBookmarks($$('[data-id]', list).map(el => el.dataset.id));
        },
      });
    }
  }
  let dragging = false;

  // Reorder a (possibly filtered) subset, keeping everything else in place.
  function reorderBookmarks(ids) {
    const set = new Set(ids), slots = [];
    state.bookmarks.forEach((b, i) => { if (set.has(b.id)) slots.push(i); });
    const byId = new Map(state.bookmarks.map(b => [b.id, b]));
    const next = state.bookmarks.slice();
    ids.forEach((id, k) => { next[slots[k]] = byId.get(id); });
    state.bookmarks = next; save();
  }

  // ---------- main interactions ----------
  $('#list').addEventListener('click', e => {
    if (dragging) return;
    const tag = e.target.closest('[data-tag]');
    if (tag) { e.stopPropagation(); addTagFilter(tag.dataset.tag); return; }
    const el = e.target.closest('[data-id]'); if (!el) return;
    const b = state.bookmarks.find(x => x.id === el.dataset.id); if (!b) return;
    if (e.target.closest('.more') || view.edit) { editBookmark(b.id); return; }
    openLink(b.url);
  });
  function openLink(url) { window.open(url, '_blank', 'noopener'); }

  $('#chips').addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    if (c.dataset.act === 'tags') return tagFilterSheet();
    if (c.dataset.act === 'newcat') return editCategory(null);
    state.ui.filter = c.dataset.f; save(); render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  $('#tagbar').addEventListener('click', e => {
    const t = e.target.closest('[data-rmtag]'); if (!t) return;
    state.ui.tags = state.ui.tags.filter(x => x !== t.dataset.rmtag); save(); render();
  });
  function addTagFilter(t) {
    if (!state.ui.tags.includes(t)) state.ui.tags.push(t);
    save(); render(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const q = $('#q');
  q.addEventListener('input', () => { view.q = q.value; q.parentElement.classList.toggle('has', !!q.value); renderList(); });
  q.addEventListener('keydown', e => { if (e.key === 'Enter') q.blur(); });
  $('#qClear').addEventListener('click', e => { e.preventDefault(); q.value = ''; view.q = ''; q.parentElement.classList.remove('has'); renderList(); });

  function setEdit(on) {
    view.edit = on; document.body.classList.toggle('editing', on); $('#editBtn').classList.toggle('on', on);
    $('#editBtn').innerHTML = on ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-pen"></i>';
  }
  $('#editBtn').addEventListener('click', () => setEdit(!view.edit));
  $('#editDone').addEventListener('click', () => setEdit(false));
  $('#addBtn').addEventListener('click', () => editBookmark(null));
  $('#viewBtn').addEventListener('click', viewSheet);
  $('#setBtn').addEventListener('click', settingsSheet);

  const top = $('#top');
  window.addEventListener('scroll', () => top.classList.toggle('scrolled', window.scrollY > 4), { passive: true });

  // ---------- sheets ----------
  const layer = $('#sheets');
  const stack = [];
  function openSheet({ title, body, left, right, cls = '', onMount, onClose }) {
    const el = document.createElement('section');
    el.className = 'sheet ' + cls;
    el.setAttribute('role', 'dialog');
    el.innerHTML = `<div class="grab"></div><header class="sh-head">${left ?? '<button class="txt" data-close>Cancel</button>'}<h2>${esc(title)}</h2>${right ?? '<span></span>'}</header><div class="sh-body">${body}</div>`;
    stack.forEach(s => s.el.classList.add('behind'));
    layer.appendChild(el); layer.classList.add('open'); document.documentElement.classList.add('sheet-open');
    const api = { el, body: $('.sh-body', el), onClose, close: () => closeSheet(api) };
    stack.push(api);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
    el.addEventListener('click', e => { if (e.target.closest('[data-close]')) api.close(); });
    dragToDismiss(el, api);
    onMount && onMount(api);
    return api;
  }
  function closeSheet(api) {
    const i = stack.indexOf(api); if (i < 0) return;
    if (document.activeElement && api.el.contains(document.activeElement)) document.activeElement.blur();
    stack.splice(i, 1);
    api.el.classList.remove('in'); api.el.style.transform = '';
    setTimeout(() => api.el.remove(), 420);
    if (stack.length) stack[stack.length - 1].el.classList.remove('behind');
    else { layer.classList.remove('open'); document.documentElement.classList.remove('sheet-open'); }
    api.onClose && api.onClose();
  }
  $('.backdrop', layer).addEventListener('click', () => stack.length && stack[stack.length - 1].close());
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && stack.length) stack[stack.length - 1].close(); });

  function dragToDismiss(el, api) {
    const zones = [$('.grab', el), $('.sh-head', el)];
    let y0 = null, dy = 0;
    zones.forEach(z => {
      z.addEventListener('touchstart', e => { if (e.target.closest('button')) return; y0 = e.touches[0].clientY; dy = 0; el.style.transition = 'none'; }, { passive: true });
      z.addEventListener('touchmove', e => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); el.style.transform = `translateY(${dy}px)`; }, { passive: true });
      z.addEventListener('touchend', () => {
        if (y0 == null) return; y0 = null; el.style.transition = '';
        if (dy > 110) api.close(); else el.style.transform = '';
      });
    });
  }

  // keep sheets above the iOS keyboard
  const vv = window.visualViewport;
  function vvUpdate() {
    const h = vv ? vv.height : window.innerHeight;
    document.documentElement.style.setProperty('--vvh', h + 'px');
    layer.style.transform = vv ? `translateY(${vv.offsetTop}px)` : '';
  }
  if (vv) { vv.addEventListener('resize', vvUpdate); vv.addEventListener('scroll', vvUpdate); }
  window.addEventListener('resize', vvUpdate); vvUpdate();
  // scroll a focused field into view inside its sheet once the keyboard is up
  layer.addEventListener('focusin', e => {
    if (e.target.matches('input, textarea')) setTimeout(() => e.target.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 320);
  });

  function confirmSheet({ title, message, ok = 'Delete', danger = true }) {
    return new Promise(res => {
      let done = false;
      const s = openSheet({
        title, left: '<span></span>',
        body: `<p class="msg">${esc(message)}</p><div class="stack"><button class="${danger ? 'btn-danger' : 'btn-primary'}" data-ok style="margin:0">${esc(ok)}</button><button class="btn-plain" data-close>Cancel</button></div>`,
        onClose: () => { if (!done) res(false); },
        onMount: a => $('[data-ok]', a.el).addEventListener('click', () => { done = true; res(true); a.close(); }),
      });
      return s;
    });
  }
  function choiceSheet({ title, message, options }) {
    return new Promise(res => {
      let done = false;
      openSheet({
        title, left: '<span></span>',
        body: `<p class="msg">${esc(message)}</p><div class="stack">${options.map((o, i) => `<button class="${o.cls || 'btn-plain'}" data-i="${i}">${esc(o.label)}</button>`).join('')}<button class="btn-plain" data-close>Cancel</button></div>`,
        onClose: () => { if (!done) res(null); },
        onMount: a => a.el.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { done = true; res(options[+b.dataset.i].value); a.close(); } }),
      });
    });
  }

  // ---------- toasts ----------
  function toast(msg, action, fn, ms = 4200) {
    const t = document.createElement('div'); t.className = 'toast';
    t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action)}</button>` : ''}`;
    $('#toasts').appendChild(t);
    const kill = () => { t.classList.add('out'); setTimeout(() => t.remove(), 260); };
    if (action) $('button', t).addEventListener('click', () => { fn && fn(); kill(); });
    setTimeout(kill, ms);
  }

  // ---------- swatches / segmented helpers ----------
  const swatchesHTML = cur => COLORS.map(c => `<button style="--c:${c}" data-c="${c}" class="${c === cur ? 'on' : ''}" aria-label="Colour ${c}"></button>`).join('');
  function bindSwatches(root, get, set) {
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      set(b.dataset.c); $$('[data-c]', root).forEach(x => x.classList.toggle('on', x.dataset.c === get()));
    });
  }

  // ---------- bookmark editor ----------
  function editBookmark(id, prefill = {}) {
    const existing = id && state.bookmarks.find(b => b.id === id);
    const f = state.ui.filter;
    const d = existing ? JSON.parse(JSON.stringify(existing)) : {
      id: uid(), url: '', title: '', notes: '', cat: catById(f) ? f : null, tags: [...state.ui.tags],
      icon: { type: 'favicon' }, color: COLORS[Math.floor(Math.random() * 12)], fav: f === 'fav', created: Date.now(), ...prefill,
    };
    let titleTouched = !!existing;

    openSheet({
      title: existing ? 'Edit Bookmark' : 'New Bookmark', cls: 'tall',
      right: `<button class="txt b" data-save>${existing ? 'Done' : 'Add'}</button>`,
      body: `
        <div class="hero">
          <button id="ePrev" aria-label="Choose icon"></button>
          <div class="hint" id="eHint"></div>
          <div class="seg" id="eType">
            <button data-t="favicon"><i class="fa-solid fa-globe"></i> Site</button>
            <button data-t="fa"><i class="fa-solid fa-icons"></i> Icon</button>
            <button data-t="letter"><i class="fa-solid fa-font"></i> Letter</button>
          </div>
          <div class="swatches" id="eColors">${swatchesHTML(d.color)}</div>
        </div>
        <div class="group">
          <label class="field"><span>Link</span><div class="row">
            <input id="eUrl" type="url" inputmode="url" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://example.com" value="${esc(d.url)}" enterkeyhint="next">
            <button class="ib" id="ePaste" type="button" aria-label="Paste link"><i class="fa-solid fa-paste"></i></button>
          </div></label>
          <label class="field"><span>Title</span><input id="eTitle" autocomplete="off" placeholder="Give it a name" value="${esc(d.title)}" enterkeyhint="done"></label>
        </div>
        <div class="label">Category</div>
        <div class="chips wrap" id="eCats"></div>
        <div class="label">Tags</div>
        <div class="tagbox" id="eTags"></div>
        <div class="sugg" id="eSugg"></div>
        <div class="group">
          <label class="field"><span>Notes</span><textarea id="eNotes" rows="3" placeholder="Why did you save this?">${esc(d.notes)}</textarea></label>
        </div>
        <div class="group">
          <label class="toggle"><span><i class="fa-solid fa-star" style="color:#f59e0b"></i> Favorite</span><input type="checkbox" id="eFav" ${d.fav ? 'checked' : ''}><i class="sw"></i></label>
        </div>
        ${existing ? `
        <div class="actions">
          <button data-a="open"><i class="fa-solid fa-arrow-up-right-from-square"></i>Open</button>
          <button data-a="share"><i class="fa-solid fa-arrow-up-from-bracket"></i>Share</button>
          <button data-a="copy"><i class="fa-regular fa-copy"></i>Copy link</button>
        </div>
        <button class="btn-danger" data-a="delete"><i class="fa-solid fa-trash-can"></i> Delete Bookmark</button>` : ''}
      `,
      onMount: s => {
        const el = s.el;
        const url = $('#eUrl', el), title = $('#eTitle', el), notes = $('#eNotes', el);

        const paint = () => {
          d.url = normUrl(url.value) || d.url; d.title = title.value.trim();
          const preview = { ...d, title: d.title || prettyTitle(d.url) };
          $('#ePrev', el).innerHTML = tileHTML(preview, 'xl');
          $('#eHint', el).textContent = d.icon.type === 'fa' ? 'Tap the icon to change it' : d.icon.type === 'favicon' ? 'Using the website’s own icon' : 'Using the first letter';
          $$('#eType button', el).forEach(b => b.classList.toggle('on', b.dataset.t === d.icon.type));
          $('#eColors', el).style.display = d.icon.type === 'favicon' ? 'none' : '';
        };
        const pickIcon = () => iconPicker(d.icon.name, d.color, name => { d.icon = { type: 'fa', name }; paint(); });
        $('#ePrev', el).addEventListener('click', pickIcon);
        $('#eType', el).addEventListener('click', e => {
          const b = e.target.closest('[data-t]'); if (!b) return;
          if (b.dataset.t === 'fa') { if (!d.icon.name) { pickIcon(); return; } d.icon = { type: 'fa', name: d.icon.name }; }
          else d.icon = { type: b.dataset.t, name: d.icon.name };
          paint();
        });
        bindSwatches($('#eColors', el), () => d.color, c => { d.color = c; paint(); });

        const autoTitle = () => { if (!titleTouched && !title.value.trim() && url.value.trim()) title.value = prettyTitle(normUrl(url.value)); };
        url.addEventListener('change', () => { url.value = normUrl(url.value); autoTitle(); paint(); });
        url.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); title.focus(); } });
        title.addEventListener('input', () => { titleTouched = true; });
        title.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); title.blur(); } });
        title.addEventListener('change', paint);
        $('#ePaste', el).addEventListener('click', async () => {
          try {
            const t = (await navigator.clipboard.readText()).trim();
            if (!t) return toast('Clipboard is empty');
            const m = t.match(/https?:\/\/\S+/i);
            url.value = normUrl(m ? m[0] : t); autoTitle(); paint();
          } catch { url.focus(); toast('Long-press the Link field and tap Paste'); }
        });

        // categories
        const paintCats = () => {
          $('#eCats', el).innerHTML = `<button class="chip ${!d.cat ? 'on' : ''}" data-cat="" style="--c:#64748b"><i class="fa-regular fa-circle"></i>None</button>` +
            state.categories.map(c => `<button class="chip ${d.cat === c.id ? 'on' : ''}" data-cat="${esc(c.id)}" style="--c:${esc(c.color)}">${fa(c.icon)}${esc(c.name)}</button>`).join('') +
            `<button class="chip ghost" data-newcat><i class="fa-solid fa-plus"></i>New</button>`;
        };
        $('#eCats', el).addEventListener('click', e => {
          const b = e.target.closest('.chip'); if (!b) return;
          if (b.hasAttribute('data-newcat')) return editCategory(null, c => { d.cat = c.id; paintCats(); });
          d.cat = b.dataset.cat || null; paintCats();
        });

        // tags
        const box = $('#eTags', el), sugg = $('#eSugg', el);
        const paintTags = () => {
          const cur = $('input', box)?.value || '';
          box.innerHTML = d.tags.map((t, i) => `<span class="tg">#${esc(t)}<button type="button" data-rm="${i}" aria-label="Remove tag"><i class="fa-solid fa-xmark"></i></button></span>`).join('') +
            `<input id="eTagIn" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${d.tags.length ? 'Add another…' : 'Add tags…'}" enterkeyhint="done">`;
          const inp = $('input', box); inp.value = cur; bindTagInput(inp);
          paintSugg(cur);
        };
        const paintSugg = (txt = '') => {
          const low = txt.toLowerCase().replace(/^#/, '');
          const have = new Set(d.tags.map(t => t.toLowerCase()));
          const list = allTags().map(t => t[0]).filter(t => !have.has(t.toLowerCase()) && (!low || t.toLowerCase().includes(low))).slice(0, 14);
          sugg.innerHTML = list.map(t => `<button type="button" data-sg="${esc(t)}">#${esc(t)}</button>`).join('');
        };
        const commit = (inp, refocus) => {
          const parts = inp.value.split(',').map(t => t.trim().replace(/^#+/, '').trim()).filter(Boolean);
          let added = false;
          parts.forEach(t => {
            const known = allTags().find(([x]) => x.toLowerCase() === t.toLowerCase());
            const tag = known ? known[0] : t;
            if (!d.tags.some(x => x.toLowerCase() === tag.toLowerCase())) { d.tags.push(tag); added = true; }
          });
          inp.value = '';
          if (added || parts.length) { paintTags(); if (refocus) $('input', box).focus(); }
        };
        const bindTagInput = inp => {
          inp.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); if (inp.value.trim()) commit(inp, true); else inp.blur(); }
            else if (e.key === 'Backspace' && !inp.value && d.tags.length) { d.tags.pop(); paintTags(); $('input', box).focus(); }
          });
          inp.addEventListener('input', () => { if (inp.value.includes(',')) commit(inp, true); else paintSugg(inp.value); });
          inp.addEventListener('blur', () => { if (inp.value.trim()) commit(inp, false); });
        };
        box.addEventListener('click', e => {
          const rm = e.target.closest('[data-rm]');
          if (rm) { d.tags.splice(+rm.dataset.rm, 1); paintTags(); return; }
          if (e.target === box) $('input', box).focus();
        });
        // pointerdown keeps the keyboard open while tapping suggestions
        sugg.addEventListener('pointerdown', e => { if (e.target.closest('[data-sg]')) e.preventDefault(); });
        sugg.addEventListener('click', e => {
          const b = e.target.closest('[data-sg]'); if (!b) return;
          d.tags.push(b.dataset.sg); $('input', box).value = ''; paintTags();
        });

        // actions
        el.addEventListener('click', async e => {
          const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
          if (a === 'open') openLink(existing.url);
          if (a === 'copy') { try { await navigator.clipboard.writeText(existing.url); toast('Link copied'); } catch { toast('Couldn’t copy'); } }
          if (a === 'share') { if (navigator.share) navigator.share({ title: existing.title, url: existing.url }).catch(() => {}); else { try { await navigator.clipboard.writeText(existing.url); toast('Link copied'); } catch {} } }
          if (a === 'delete') {
            if (await confirmSheet({ title: 'Delete bookmark?', message: `“${existing.title}” will be removed.` })) { s.close(); deleteBookmark(existing.id); }
          }
        });

        $('[data-save]', el).addEventListener('click', () => {
          const active = $('#eTagIn', el); if (active && active.value.trim()) commit(active, false);
          const u = normUrl(url.value);
          if (!u) { url.focus(); toast('Add a link first'); return; }
          d.url = u; d.title = title.value.trim() || prettyTitle(u) || u; d.notes = notes.value.trim(); d.fav = $('#eFav', el).checked;
          if (d.icon.type === 'fa' && !d.icon.name) d.icon = { type: 'favicon' };
          if (existing) Object.assign(existing, d); else state.bookmarks.unshift(d);
          save(); render(); s.close();
          if (!existing) toast('Bookmark added');
        });

        paint(); paintCats(); paintTags();
        if (!existing && !d.url) setTimeout(() => url.focus(), 380);
      },
    });
  }

  function deleteBookmark(id) {
    const i = state.bookmarks.findIndex(b => b.id === id); if (i < 0) return;
    const [b] = state.bookmarks.splice(i, 1); save(); render();
    toast('Bookmark deleted', 'Undo', () => { state.bookmarks.splice(i, 0, b); save(); render(); });
  }

  // ---------- icon picker ----------
  function iconPicker(current, color, onPick) {
    const cats = [['Popular', POPULAR.map(n => ICONS.indexOf(ICON_MAP.get(n)))], ...(window.FA_CATS || [])];
    let catIdx = 0, results = [], shown = 0, io;
    openSheet({
      title: 'Choose Icon', cls: 'tall',
      body: `<div class="ip-top">
          <label class="search"><i class="fa-solid fa-magnifying-glass"></i><input id="ipQ" type="search" placeholder="Search ${ICONS.length.toLocaleString()} free icons" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"></label>
          <div class="chips scroll" id="ipCats">${cats.map((c, i) => `<button class="chip ${i === 0 ? 'on' : ''}" data-i="${i}">${esc(c[0])}</button>`).join('')}</div>
        </div>
        <div class="ip-count" id="ipCount"></div>
        <div class="igrid" id="ipGrid" style="--c:${esc(color)}"></div><div id="ipEnd" style="height:1px"></div>`,
      onMount: s => {
        const el = s.el, grid = $('#ipGrid', el), inp = $('#ipQ', el);
        const more = () => {
          const chunk = results.slice(shown, shown + 180); shown += chunk.length;
          grid.insertAdjacentHTML('beforeend', chunk.map(i => { const [n, st] = ICONS[i]; return `<button data-n="${esc(n)}" class="${n === current ? 'on' : ''}" aria-label="${esc(n)}"><i class="${STYLE[st]} fa-${esc(n)}"></i></button>`; }).join(''));
        };
        const run = () => {
          const words = inp.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
          if (words.length) {
            const scored = [];
            ICONS.forEach(([n, , t], i) => {
              const hay = n + ' ' + t;
              if (!words.every(w => hay.includes(w))) return;
              scored.push([n === words.join('-') ? 0 : n.startsWith(words[0]) ? 1 : n.includes(words[0]) ? 2 : 3, i]);
            });
            results = scored.sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[1]);
          } else results = cats[catIdx][1].filter(i => i >= 0);
          shown = 0; grid.innerHTML = ''; more();
          $('#ipCount', el).textContent = words.length ? `${results.length} result${results.length === 1 ? '' : 's'}` : `${cats[catIdx][0]} · ${results.length}`;
          s.body.scrollTop = 0;
        };
        let tmr; inp.addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(run, 120); });
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
        $('#ipCats', el).addEventListener('click', e => {
          const b = e.target.closest('[data-i]'); if (!b) return;
          catIdx = +b.dataset.i; inp.value = '';
          $$('#ipCats .chip', el).forEach(x => x.classList.toggle('on', x === b)); run();
        });
        grid.addEventListener('click', e => { const b = e.target.closest('[data-n]'); if (!b) return; onPick(b.dataset.n); s.close(); });
        io = new IntersectionObserver(en => { if (en[0].isIntersecting && shown < results.length) more(); }, { root: s.body, rootMargin: '400px' });
        io.observe($('#ipEnd', el));
        s.onClose = () => io.disconnect();
        run();
      },
    });
  }

  // ---------- category editor ----------
  function editCategory(id, after) {
    const existing = id && catById(id);
    const d = existing ? { ...existing } : { id: uid(), name: '', icon: 'folder', color: COLORS[Math.floor(Math.random() * 12)] };
    openSheet({
      title: existing ? 'Edit Category' : 'New Category',
      right: `<button class="txt b" data-save>${existing ? 'Done' : 'Create'}</button>`,
      body: `<div class="hero"><button id="cPrev" aria-label="Choose icon"></button><div class="hint">Tap to change icon</div><div class="swatches" id="cColors">${swatchesHTML(d.color)}</div></div>
        <div class="group"><label class="field"><span>Name</span><input id="cName" autocomplete="off" placeholder="e.g. Read Later" value="${esc(d.name)}" enterkeyhint="done"></label></div>
        ${existing ? `<button class="btn-danger" data-del><i class="fa-solid fa-trash-can"></i> Delete Category</button><p class="foot">Bookmarks in this category are kept and become unsorted.</p>` : ''}`,
      onMount: s => {
        const el = s.el, name = $('#cName', el);
        const paint = () => { $('#cPrev', el).innerHTML = tileHTML({ icon: { type: 'fa', name: d.icon }, color: d.color }, 'xl'); };
        $('#cPrev', el).addEventListener('click', () => iconPicker(d.icon, d.color, n => { d.icon = n; paint(); }));
        bindSwatches($('#cColors', el), () => d.color, c => { d.color = c; paint(); });
        name.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); name.blur(); } });
        $('[data-save]', el).addEventListener('click', () => {
          d.name = name.value.trim();
          if (!d.name) { name.focus(); toast('Give it a name'); return; }
          if (existing) Object.assign(existing, d); else state.categories.push(d);
          save(); render(); s.close(); after && after(d);
        });
        $('[data-del]', el)?.addEventListener('click', async () => {
          const n = state.bookmarks.filter(b => b.cat === id).length;
          if (!await confirmSheet({ title: 'Delete category?', message: n ? `${n} bookmark${n > 1 ? 's' : ''} will move to Unsorted.` : `“${existing.name}” will be removed.` })) return;
          state.categories = state.categories.filter(c => c.id !== id);
          state.bookmarks.forEach(b => { if (b.cat === id) b.cat = null; });
          save(); render(); s.close(); after && after(null);
        });
        paint();
        if (!existing) setTimeout(() => name.focus(), 380);
      },
    });
  }

  // ---------- tag filter ----------
  function tagFilterSheet() {
    openSheet({
      title: 'Filter by Tag', left: '<button class="txt" data-clear>Clear</button>', right: '<button class="txt b" data-close>Done</button>',
      body: `<div class="group" id="tfList"></div>`,
      onMount: s => {
        const paint = () => {
          $('#tfList', s.el).innerHTML = allTags().map(([t, n]) => `<button class="rowbtn" data-t="${esc(t)}"><i class="fa-solid fa-hashtag"></i><span class="nm">${esc(t)}</span><span class="end">${n}${state.ui.tags.includes(t) ? '<i class="fa-solid fa-check" style="color:var(--accent)"></i>' : ''}</span></button>`).join('');
        };
        s.el.addEventListener('click', e => {
          if (e.target.closest('[data-clear]')) { state.ui.tags = []; save(); render(); paint(); return; }
          const b = e.target.closest('[data-t]'); if (!b) return;
          const t = b.dataset.t;
          state.ui.tags = state.ui.tags.includes(t) ? state.ui.tags.filter(x => x !== t) : [...state.ui.tags, t];
          save(); render(); paint();
        });
        paint();
      },
    });
  }

  // ---------- view options ----------
  function viewSheet() {
    const st = state.settings;
    openSheet({
      title: 'View', left: '<span></span>', right: '<button class="txt b" data-close>Done</button>',
      body: `<div class="label">Layout</div>
        <div class="seg" id="vLayout" style="max-width:none"><button data-v="list"><i class="fa-solid fa-list"></i> List</button><button data-v="grid"><i class="fa-solid fa-table-cells-large"></i> Grid</button></div>
        <div class="label">Order</div>
        <div class="seg" id="vSort" style="max-width:none"><button data-v="manual"><i class="fa-solid fa-grip-vertical"></i> My order</button><button data-v="new"><i class="fa-regular fa-clock"></i> Newest</button><button data-v="az"><i class="fa-solid fa-arrow-down-a-z"></i> A–Z</button></div>
        <p class="foot">In <b>My order</b>, press and hold any bookmark, then drag to rearrange.</p>`,
      onMount: s => {
        const paint = () => {
          $$('#vLayout button', s.el).forEach(b => b.classList.toggle('on', b.dataset.v === st.layout));
          $$('#vSort button', s.el).forEach(b => b.classList.toggle('on', b.dataset.v === st.sort));
        };
        $('#vLayout', s.el).addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { st.layout = b.dataset.v; save(); render(); paint(); } });
        $('#vSort', s.el).addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { st.sort = b.dataset.v; save(); render(); paint(); } });
        paint();
      },
    });
  }

  // ---------- settings ----------
  function settingsSheet() {
    const st = state.settings;
    openSheet({
      title: 'Settings', cls: 'tall', left: '<span></span>', right: '<button class="txt b" data-close>Done</button>',
      body: `<div class="label">Theme</div>
        <div class="seg" id="sTheme" style="max-width:none"><button data-v="system"><i class="fa-solid fa-circle-half-stroke"></i> Auto</button><button data-v="light"><i class="fa-solid fa-sun"></i> Light</button><button data-v="dark"><i class="fa-solid fa-moon"></i> Dark</button></div>
        <div class="label">Accent</div>
        <div class="swatches" id="sAccent" style="max-width:none;justify-content:flex-start">${swatchesHTML(st.accent)}</div>
        <div class="label">Categories <span style="text-transform:none;font-weight:500;letter-spacing:0">· drag <i class="fa-solid fa-grip-lines"></i> to reorder</span></div>
        <div class="group" id="sCats"></div>
        <div class="group" style="margin-top:10px"><button class="rowbtn" data-a="newcat"><i class="fa-solid fa-folder-plus"></i>New Category</button></div>
        <div class="label">Tags</div>
        <div class="group" id="sTags"></div>
        <div class="label">Backup &amp; Import</div>
        <div class="group">
          <button class="rowbtn" data-a="export"><i class="fa-solid fa-file-export"></i>Export backup<span class="end">.json</span></button>
          <button class="rowbtn" data-a="import"><i class="fa-solid fa-file-import"></i>Restore / import<span class="end">.json · .html</span></button>
        </div>
        <input type="file" id="sFile" accept=".json,.html,.htm,application/json,text/html" hidden>
        <div class="group" style="margin-top:10px">
          ${isStandalone() ? '' : `<button class="rowbtn" data-a="install"><i class="fa-solid fa-mobile-screen-button"></i>Install on Home Screen</button>`}
          <button class="rowbtn danger" data-a="reset"><i class="fa-solid fa-rotate-left"></i>Erase all data</button>
        </div>
        <p class="foot">ICYMI keeps everything on this device — nothing is uploaded.<br>Export a backup now and then to keep your bookmarks safe.<br><br>Icons by <a href="https://fontawesome.com" target="_blank" rel="noopener">Font Awesome Free</a> (CC BY 4.0) · Drag &amp; drop by SortableJS</p>`,
      onMount: s => {
        const el = s.el;
        let catSort;
        const paint = () => {
          $$('#sTheme button', el).forEach(b => b.classList.toggle('on', b.dataset.v === st.theme));
          $('#sCats', el).innerHTML = state.categories.length ? state.categories.map(c => `<div class="rowbtn" data-cid="${esc(c.id)}" role="button">${tileHTML({ icon: { type: 'fa', name: c.icon }, color: c.color })}<span class="nm">${esc(c.name)}</span><span class="end">${state.bookmarks.filter(b => b.cat === c.id).length}<i class="fa-solid fa-grip-lines handle"></i></span></div>`).join('')
            : '<div class="rowbtn" style="color:var(--muted)">No categories yet</div>';
          const tags = allTags();
          $('#sTags', el).innerHTML = tags.length ? tags.map(([t, n]) => `<button class="rowbtn" data-tg="${esc(t)}"><i class="fa-solid fa-hashtag"></i><span class="nm">${esc(t)}</span><span class="end">${n}<i class="fa-solid fa-chevron-right"></i></span></button>`).join('')
            : '<div class="rowbtn" style="color:var(--muted)">Tags you add to bookmarks show up here</div>';
          if (catSort) catSort.destroy();
          if (state.categories.length > 1) catSort = Sortable.create($('#sCats', el), {
            handle: '.handle', animation: 200, forceFallback: true, fallbackOnBody: true, ghostClass: 'ghost',
            onEnd: () => {
              const ids = $$('[data-cid]', $('#sCats', el)).map(x => x.dataset.cid);
              state.categories = ids.map(catById); save(); render();
            },
          });
        };
        s.onClose = () => catSort && catSort.destroy();
        $('#sTheme', el).addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { st.theme = b.dataset.v; save(); applyTheme(); paint(); } });
        bindSwatches($('#sAccent', el), () => st.accent, c => { st.accent = c; save(); applyTheme(); });
        $('#sCats', el).addEventListener('click', e => {
          if (e.target.closest('.handle')) return;
          const r = e.target.closest('[data-cid]'); if (r) editCategory(r.dataset.cid, paint);
        });
        $('#sTags', el).addEventListener('click', e => { const r = e.target.closest('[data-tg]'); if (r) editTag(r.dataset.tg, paint); });
        const file = $('#sFile', el);
        file.addEventListener('change', async () => { const f = file.files[0]; file.value = ''; if (f) { await importFile(f); paint(); } });
        el.addEventListener('click', async e => {
          const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
          if (a === 'newcat') editCategory(null, paint);
          if (a === 'export') exportData();
          if (a === 'import') file.click();
          if (a === 'install') installHelp();
          if (a === 'reset') {
            if (await confirmSheet({ title: 'Erase everything?', message: 'All bookmarks, categories and tags on this device will be deleted. Export a backup first if you might want them back.', ok: 'Erase all data' })) {
              state = { ...seed(), bookmarks: [], categories: [] }; save(); applyTheme(); render(); paint(); toast('All data erased');
            }
          }
        });
        paint();
      },
    });
  }

  function editTag(tag, after) {
    openSheet({
      title: 'Edit Tag', right: '<button class="txt b" data-save>Done</button>',
      body: `<div class="group"><label class="field"><span>Tag name</span><input id="tName" autocomplete="off" autocapitalize="off" autocorrect="off" value="${esc(tag)}" enterkeyhint="done"></label></div>
        <button class="btn-danger" data-del><i class="fa-solid fa-trash-can"></i> Remove tag from all bookmarks</button>`,
      onMount: s => {
        const inp = $('#tName', s.el);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
        $('[data-save]', s.el).addEventListener('click', () => {
          const nt = inp.value.trim().replace(/^#+/, '').trim();
          if (nt && nt !== tag) {
            state.bookmarks.forEach(b => {
              const i = b.tags.indexOf(tag); if (i < 0) return;
              b.tags.splice(i, 1); if (!b.tags.includes(nt)) b.tags.splice(i, 0, nt);
            });
            state.ui.tags = state.ui.tags.map(t => t === tag ? nt : t);
            save(); render();
          }
          s.close(); after && after();
        });
        $('[data-del]', s.el).addEventListener('click', async () => {
          if (!await confirmSheet({ title: `Remove #${tag}?`, message: 'The tag is removed; your bookmarks stay.', ok: 'Remove tag' })) return;
          state.bookmarks.forEach(b => { b.tags = b.tags.filter(t => t !== tag); });
          save(); render(); s.close(); after && after();
        });
      },
    });
  }

  // ---------- backup / import ----------
  async function exportData() {
    const data = JSON.stringify({ app: 'ICYMI', exported: new Date().toISOString(), ...state }, null, 2);
    const name = `ICYMI-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const fileObj = new File([data], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [fileObj] })) {
      try { await navigator.share({ files: [fileObj], title: 'ICYMI backup' }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(fileObj); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast('Backup saved');
  }

  async function importFile(f) {
    const text = await f.text();
    let incoming;
    try {
      if (/^\s*[{[]/.test(text)) {
        const j = JSON.parse(text);
        incoming = sanitize(Array.isArray(j) ? { bookmarks: j } : j);
      } else incoming = parseBookmarksHTML(text);
    } catch { toast('That file couldn’t be read'); return; }
    if (!incoming.bookmarks.length && !incoming.categories.length) { toast('No bookmarks found in that file'); return; }
    const mode = await choiceSheet({
      title: 'Import', message: `Found ${incoming.bookmarks.length} bookmark${incoming.bookmarks.length === 1 ? '' : 's'} and ${incoming.categories.length} categor${incoming.categories.length === 1 ? 'y' : 'ies'}.`,
      options: [{ label: 'Add to my bookmarks', value: 'merge', cls: 'btn-primary' }, { label: 'Replace everything', value: 'replace', cls: 'btn-danger' }],
    });
    if (!mode) return;
    if (mode === 'replace') {
      state.bookmarks = incoming.bookmarks; state.categories = incoming.categories; state.ui = { filter: 'all', tags: [] };
    } else {
      // merge categories by name, skip bookmarks whose URL already exists
      const map = {};
      incoming.categories.forEach(c => {
        const same = state.categories.find(x => x.name.toLowerCase() === c.name.toLowerCase());
        if (same) map[c.id] = same.id; else { const nc = { ...c, id: uid() }; state.categories.push(nc); map[c.id] = nc.id; }
      });
      const have = new Set(state.bookmarks.map(b => b.url));
      const add = incoming.bookmarks.filter(b => !have.has(b.url)).map(b => ({ ...b, id: uid(), cat: b.cat ? map[b.cat] || null : null }));
      state.bookmarks = state.bookmarks.concat(add);
      toast(`Imported ${add.length} bookmark${add.length === 1 ? '' : 's'}`);
    }
    state = sanitize(state); save(); render();
  }

  // Netscape bookmark HTML (exported by Safari, Chrome, Firefox): folders become categories
  function parseBookmarksHTML(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const cats = [], bms = [], byName = {};
    const catFor = name => {
      if (!name) return null;
      if (!byName[name]) { byName[name] = { id: uid(), name, icon: 'folder', color: COLORS[cats.length % 12] }; cats.push(byName[name]); }
      return byName[name].id;
    };
    $$('a[href]', doc).forEach(a => {
      const href = a.getAttribute('href');
      if (!/^https?:/i.test(href)) return;
      let folder = null, n = a.closest('dl');
      while (n) {
        const h = n.previousElementSibling?.tagName === 'H3' ? n.previousElementSibling : n.parentElement?.querySelector(':scope > h3');
        if (h && !/^(bookmarks( bar| menu)?|favorites( bar)?|other bookmarks)$/i.test(h.textContent.trim())) { folder = h.textContent.trim(); break; }
        n = n.parentElement?.closest('dl');
      }
      const added = +a.getAttribute('add_date');
      bms.push({ id: uid(), url: href, title: a.textContent.trim() || prettyTitle(href), notes: '', cat: catFor(folder), tags: [], icon: { type: 'favicon' }, color: COLORS[0], fav: false, created: added ? added * 1000 : Date.now() });
    });
    return sanitize({ bookmarks: bms, categories: cats });
  }

  // ---------- install help ----------
  function installHelp() {
    openSheet({
      title: 'Install ICYMI', left: '<span></span>', right: '<button class="txt b" data-close>Got it</button>',
      body: `<div class="hero"><img src="icons/icon-192.png" alt="" style="width:88px;height:88px;border-radius:22px;box-shadow:var(--shadow-lg)"></div>
        <div class="group">
          <div class="rowbtn"><i class="fa-solid fa-1"></i>Open this page in <b>&nbsp;Safari</b></div>
          <div class="rowbtn"><i class="fa-solid fa-2"></i>Tap&nbsp;<i class="fa-solid fa-arrow-up-from-bracket" style="color:var(--accent)"></i>&nbsp;<b>Share</b></div>
          <div class="rowbtn"><i class="fa-solid fa-3"></i>Choose <b>&nbsp;Add to Home Screen</b></div>
          <div class="rowbtn"><i class="fa-solid fa-4"></i>Keep <b>&nbsp;Open as Web App</b>&nbsp;on, tap Add</div>
        </div>
        <p class="foot">Once installed, ICYMI opens full-screen like a native app and works offline.<br>Note: the installed app keeps its own bookmarks, separate from Safari. Use Export / Import to move them.</p>`,
    });
  }
  function maybeInstallBanner() {
    if (!isIOS || isStandalone()) return;
    try { if (localStorage.getItem('icymi.noBanner')) return; } catch { return; }
    const b = document.createElement('div'); b.className = 'install';
    b.innerHTML = `<img src="icons/icon-192.png" alt=""><div><b>Install ICYMI</b>Add it to your Home Screen for the full app.</div><button class="txt b" data-h>How</button><button class="x" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>`;
    document.body.appendChild(b); document.body.classList.add('banner');
    const kill = () => { b.remove(); document.body.classList.remove('banner'); try { localStorage.setItem('icymi.noBanner', '1'); } catch {} };
    $('[data-h]', b).addEventListener('click', () => { installHelp(); kill(); });
    $('.x', b).addEventListener('click', kill);
  }

  // ---------- add via URL (?url=…&title=…) e.g. from a Shortcut or bookmarklet ----------
  function handleIncoming() {
    const p = new URLSearchParams(location.search);
    const u = p.get('url') || p.get('add') || (p.get('text') || '').match(/https?:\/\/\S+/)?.[0];
    if (!u) return;
    history.replaceState(null, '', location.pathname);
    editBookmark(null, { url: normUrl(u), title: p.get('title') || '' });
  }

  // ---------- no pinch / double-tap zoom ----------
  // (double-tap zoom is disabled by touch-action: manipulation in CSS)
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => document.addEventListener(ev, e => e.preventDefault(), { passive: false }));

  // ---------- service worker ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(reg => {
        reg.addEventListener('updatefound', () => {
          const w = reg.installing;
          w && w.addEventListener('statechange', () => {
            if (w.state === 'installed' && navigator.serviceWorker.controller) toast('A new version of ICYMI is ready', 'Refresh', () => location.reload(), 10000);
          });
        });
      }).catch(() => {});
    });
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // ---------- go ----------
  applyTheme();
  render();
  try { if (!localStorage.getItem(KEY)) save(); } catch {}
  handleIncoming();
  setTimeout(maybeInstallBanner, 1200);
})();
