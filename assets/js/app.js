const PER = 12;
const $ = s => document.querySelector(s);
const grid = $('#grid'), modal = $('#modal'), modalCard = $('#modalCard');
const search = $('#search'), cats = $('#cats');

let state = { q: '', cat: 'all', page: 1, fav: JSON.parse(localStorage.getItem('ghfav') || '[]') };

const stars = n => '<i class="fa-solid fa-star"></i>'.repeat(n) + '<i class="fa-regular fa-star" style="opacity:.3"></i>'.repeat(5-n);
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

function filterGames(){
  const q = state.q.toLowerCase();
  return GAMES.filter(g => {
    const matchQ = g.name.toLowerCase().includes(q);
    if(state.cat === 'fav') return matchQ && state.fav.includes(g.name);
    if(state.cat === 'all') return matchQ;
    return matchQ && g.category === state.cat;
  });
}

function render(){
  const list = filterGames();
  const total = Math.max(1, Math.ceil(list.length / PER));
  if(state.page > total) state.page = total;
  const slice = list.slice((state.page-1)*PER, state.page*PER);

  $('#empty').style.display = list.length ? 'none' : 'block';
  grid.style.display = list.length ? 'grid' : 'none';

  // localized result count
  const word = list.length === 1 ? t('sec.result') : t('sec.results');
  $('#resultCount').textContent = list.length + ' ' + word;

  // numbered pagination
  renderPager(total);
  $('#prev').disabled = state.page <= 1;
  $('#next').disabled = state.page >= total;

  $('#stTotal').textContent = GAMES.length;
  $('#stTop').textContent = GAMES.filter(g=>g.rating===5).length;
  $('#stFav').textContent = state.fav.length;
  $('#heroCount').textContent = GAMES.length;

  // localized subtitle
  const sub = $('#subTitle');
  if(state.cat === 'all') sub.textContent = t('sec.sub');
  else if(state.cat === 'fav') sub.textContent = t('sec.subFav');
  else sub.textContent = t('sec.subCat').replace('{c}', t('cat.' + state.cat));

  grid.innerHTML = slice.map((g,i) => {
    const isFav = state.fav.includes(g.name);
    const safe = esc(g.name);
    const catLabel = esc(t('cat.' + g.category) || g.category);
    return `
      <div class="card" style="animation-delay:${i*40}ms" data-name="${safe}">
        <span class="badge-cat">${catLabel}</span>
        <button class="fav ${isFav?'on':''}" data-fav="${safe}" aria-label="Toggle favorite">
          <i class="fa-${isFav?'solid':'regular'} fa-heart"></i>
        </button>
        <img src="${esc(g.img)}" loading="lazy" alt="${safe}" onerror="this.src='https://placehold.co/600x900/1c1e30/8a90a6?text=No+Image'">
        <div class="grad"></div>
        <div class="meta">
          <h4>${safe}</h4>
          <div class="row">
            <span class="rating">${stars(g.rating)}</span>
            <span class="tag"><i class="fa-solid fa-circle-play" style="font-size:8px"></i> Play</span>
          </div>
        </div>
      </div>`;
  }).join('');
}
window.render = render;

grid.addEventListener('click', e => {
  const favBtn = e.target.closest('.fav');
  if(favBtn){ e.stopPropagation(); toggleFav(favBtn.dataset.fav); return; }
  const card = e.target.closest('.card');
  if(card) openGame(card.dataset.name);
});

function toggleFav(name){
  const i = state.fav.indexOf(name);
  if(i>=0) state.fav.splice(i,1); else state.fav.push(name);
  localStorage.setItem('ghfav', JSON.stringify(state.fav));
  render();
}

function openGame(name){
  const g = GAMES.find(x => x.name === name);
  if(!g) return;
  const safe = esc(g.name);
  const catLabel = esc((t('cat.' + g.category) || g.category).toUpperCase());
  const tplMsg = t('order.tpl').replace('{game}', g.name);
  modalCard.innerHTML = `
    <button class="close-x" onclick="closeModal()" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
    <div class="poster"><img src="${esc(g.img)}" alt="${safe}" onerror="this.src='https://placehold.co/600x900/1c1e30/8a90a6?text=No+Image'"></div>
    <div class="modal-body">
      <div class="top">
        <span class="tag" style="background:rgba(124,92,255,.18);color:#cfc6ff">${catLabel}</span>
        <span class="rating">${stars(g.rating)}</span>
      </div>
      <h2>${safe}</h2>
      <p class="desc">${esc(g.desc || '')}</p>
      <div>
        <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-bottom:10px;display:flex;align-items:center;gap:8px">
          <i class="fa-solid fa-microchip" style="color:var(--acc)"></i> ${esc(t('m.specs'))}
        </div>
        <div class="specs">
          <div class="spec"><div class="l"><i class="fa-solid fa-microchip"></i> ${esc(t('m.cpu'))}</div><div class="v">${esc(g.cpu||'-')}</div></div>
          <div class="spec"><div class="l"><i class="fa-solid fa-memory"></i> ${esc(t('m.ram'))}</div><div class="v">${esc(g.ram||'-')}</div></div>
          <div class="spec"><div class="l"><i class="fa-solid fa-display"></i> ${esc(t('m.gpu'))}</div><div class="v">${esc(g.gpu||'-')}</div></div>
          <div class="spec"><div class="l"><i class="fa-solid fa-hard-drive"></i> ${esc(t('m.storage'))}</div><div class="v">${esc(g.storage||'-')}</div></div>
        </div>
      </div>
      <div class="order-block">
        <div class="ob-label"><i class="fa-solid fa-paper-plane"></i> ${esc(t('order.label'))}</div>
        <textarea class="ob-text" id="obText" placeholder="${esc(t('order.placeholder'))}">${esc(tplMsg)}</textarea>
        <div class="ob-actions">
          <button class="btn primary" id="obSend"><i class="fa-brands fa-telegram"></i> ${esc(t('order.send'))}</button>
          <a class="btn ghost" href="tel:+998712009444"><i class="fa-solid fa-phone"></i> ${esc(t('order.call'))}</a>
          <button class="btn ghost" data-modal-fav="${safe}" style="flex:0 0 auto;min-width:54px">
            <i class="fa-${state.fav.includes(g.name)?'solid':'regular'} fa-heart"></i>
          </button>
        </div>
        <div class="ob-meta"><i class="fa-solid fa-location-dot"></i> ${esc(t('order.meta'))}</div>
      </div>
    </div>`;
  modal.classList.add('on');
}

modalCard.addEventListener('click', e => {
  const b = e.target.closest('[data-modal-fav]');
  if(b){ toggleFav(b.dataset.modalFav); closeModal(); return; }
  const send = e.target.closest('#obSend');
  if(send){
    const txt = document.getElementById('obText');
    const msg = encodeURIComponent(txt ? txt.value : '');
    window.open('https://t.me/aiwebuz?text=' + msg, '_blank');
  }
});

function closeModal(){ modal.classList.remove('on'); }
function changePage(d){
  state.page += d; render();
  window.scrollTo({top:document.getElementById('games').offsetTop - 60, behavior:'smooth'});
}
function gotoPage(p){
  state.page = p; render();
  window.scrollTo({top:document.getElementById('games').offsetTop - 60, behavior:'smooth'});
}
window.changePage = changePage;
window.gotoPage = gotoPage;
window.closeModal = closeModal;

// ===== Numbered pager =====
function renderPager(total){
  const cur = state.page;
  const nums = $('#pgNums');
  let pages = [];
  if(total <= 7){
    for(let i=1;i<=total;i++) pages.push(i);
  } else {
    pages.push(1);
    if(cur > 4) pages.push('...');
    const s = Math.max(2, cur-1), e = Math.min(total-1, cur+1);
    for(let i=s;i<=e;i++) pages.push(i);
    if(cur < total-3) pages.push('...');
    pages.push(total);
  }
  nums.innerHTML = pages.map(p =>
    p === '...' ? `<span class="pg-dots">…</span>`
    : `<button class="pg-num${p===cur?' on':''}" data-p="${p}">${p}</button>`
  ).join('');
}
document.getElementById('prev').addEventListener('click', () => changePage(-1));
document.getElementById('next').addEventListener('click', () => changePage(1));
document.getElementById('pgNums').addEventListener('click', e => {
  const b = e.target.closest('.pg-num'); if(!b) return;
  gotoPage(+b.dataset.p);
});

// ===== PWA install banner =====
let deferredPrompt = null;
const installCard = document.getElementById('installCard');
const icInstall   = document.getElementById('icInstall');
const icClose     = document.getElementById('icClose');

function isStandalone(){
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
         window.navigator.standalone === true;
}
function showInstall(){
  if(isStandalone()) return;
  if(sessionStorage.getItem('gh_inst_dismiss') === '1') return;
  installCard.hidden = false;
}
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  setTimeout(showInstall, 1500);
});
icInstall.addEventListener('click', async () => {
  if(deferredPrompt){
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch(_){}
    deferredPrompt = null;
    installCard.hidden = true;
  } else {
    // iOS / unsupported — show hint
    alert(t('install.hint'));
  }
});
icClose.addEventListener('click', () => {
  installCard.hidden = true;
  sessionStorage.setItem('gh_inst_dismiss','1');
});
window.addEventListener('appinstalled', () => { installCard.hidden = true; });

// iOS Safari has no beforeinstallprompt — show banner anyway after delay
setTimeout(() => {
  if(!deferredPrompt && !isStandalone() && /iPad|iPhone|iPod/.test(navigator.userAgent)){
    showInstall();
  }
}, 2500);

search.addEventListener('input', e => { state.q = e.target.value; state.page = 1; render(); });
cats.addEventListener('click', e => {
  const b = e.target.closest('.cat'); if(!b) return;
  cats.querySelectorAll('.cat').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  state.cat = b.dataset.c; state.page = 1;
  render();
});
document.addEventListener('keydown', e => { if(e.key==='Escape') closeModal(); });

// ===== Lang dropdown =====
const langDD   = document.getElementById('langDD');
const langTrig = document.getElementById('langTrig');
const langList = document.getElementById('langList');

langTrig.addEventListener('click', e => {
  e.stopPropagation();
  const open = langDD.classList.toggle('on');
  langTrig.setAttribute('aria-expanded', open);
});
document.addEventListener('click', () => {
  langDD.classList.remove('on');
  langTrig.setAttribute('aria-expanded','false');
});
langList.querySelectorAll('button').forEach(b => {
  b.addEventListener('click', () => {
    applyLang(b.dataset.lang);
    langDD.classList.remove('on');
    langTrig.setAttribute('aria-expanded','false');
  });
});

// ===== Info modal (footer About/Support items) =====
const infoModal = document.getElementById('infoModal');
const infoTitle = document.getElementById('infoTitle');
const infoBody  = document.getElementById('infoBody');

function openInfo(key){
  infoTitle.textContent = t('info.' + key + '.title');
  infoBody.innerHTML    = t('info.' + key + '.body');
  infoModal.classList.add('on');
  document.body.style.overflow = 'hidden';
}
function closeInfo(){
  infoModal.classList.remove('on');
  document.body.style.overflow = '';
}
window.closeInfo = closeInfo;

document.addEventListener('click', e => {
  const a = e.target.closest('[data-info]');
  if(!a) return;
  e.preventDefault();
  openInfo(a.dataset.info);
});
document.addEventListener('keydown', e => { if(e.key==='Escape'){ closeInfo(); }});

// ===== Init lang (URL ?lang=, then localStorage, then browser) =====
(function initLang(){
  const urlLang = new URLSearchParams(location.search).get('lang');
  let lang = urlLang || localStorage.getItem('gh_lang');
  if(!lang){
    const nav = (navigator.language || 'en').toLowerCase();
    if(nav.startsWith('uz')) lang = 'uz';
    else if(nav.startsWith('ru')) lang = 'ru';
    else if(nav.startsWith('tk') || nav.startsWith('tm')) lang = 'tk';
    else lang = 'en';
  }
  if(!['uz','en','ru','tk'].includes(lang)) lang = 'en';
  applyLang(lang);
})();

render();
