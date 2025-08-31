/* Global Config */
const DEFAULT_LANG = 'en'; // change to 'ar' for Arabic default
const STATE = { lang: null, copy: null, page: null };

const qs = (s, r=document) => r.querySelector(s);
const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

function setDirAndLang(lang){
  const html = document.documentElement;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  html.setAttribute('lang', lang);
  html.setAttribute('dir', dir);
}

/* Scroll to top */
function initScrollTop(){
  const btn = qs('#scrollTop');
  if(!btn) return;
  window.addEventListener('scroll', ()=>{
    if(window.scrollY > 400) btn.classList.add('show'); else btn.classList.remove('show');
  });
  // Helper: custom smoother scroll (slower and consistent)
  function animateScrollToTop(duration){
    const startY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    if(startY === 0) return;
    // Compute duration based on distance: 700ms base + 600ms per 1000px, clamped
    const computedDuration = Math.max(100, Math.min(1000, 500 + (startY/1000)*400));
    const total = typeof duration === 'number' ? duration : computedDuration;
    const startTime = performance.now();
    // Easing: easeOutCubic for a gentle finish
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
    let rafId;

    const step = (now)=>{
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / total, 1);
      const eased = easeOutCubic(progress);
      const y = Math.round(startY * (1 - eased));
      window.scrollTo(0, y);
      if(progress < 1) rafId = requestAnimationFrame(step);
    };

    const cancel = ()=>{
      if(rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('wheel', cancel, passiveOpts);
      window.removeEventListener('touchstart', cancel, passiveOpts);
      window.removeEventListener('keydown', cancel);
    };
    const passiveOpts = { passive: true };
    window.addEventListener('wheel', cancel, passiveOpts);
    window.addEventListener('touchstart', cancel, passiveOpts);
    window.addEventListener('keydown', cancel);
    rafId = requestAnimationFrame(step);
  }

  btn.addEventListener('click', (e)=> {
    e.preventDefault();
    animateScrollToTop(); // distance-based smooth animation
    btn.blur();
  });
}

/* Stats counters */
function initStats(){
  const stats = qsa('.stat .num[data-target]');
  if(!stats.length) return;
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){ animateNumber(entry.target); io.unobserve(entry.target); }
    });
  }, {threshold:0.6});
  stats.forEach(el=> io.observe(el));
}
function animateNumber(el){
  const targetStr = el.getAttribute('data-target');
  const target = parseInt(targetStr.replace(/[^0-9]/g,''),10) || 0;
  const suffix = targetStr.replace(/[0-9]/g,'');
  let current = 0; const dur = 1200; const start = performance.now();
  function step(t){
    const p = Math.min(1, (t-start)/dur); current = Math.floor(target * (p*p));
    el.textContent = current.toLocaleString() + suffix;
    if(p<1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

async function loadCopy(lang){
  const res = await fetch(`content/copy.${lang}.json?_=${Date.now()}`);
  if(!res.ok) throw new Error('Failed to load copy');
  return await res.json();
}

function applyCopy(copy){
  // Update text nodes
  qsa('[data-i18n]').forEach(el => {
    const path = el.getAttribute('data-i18n');
    const val = get(copy, path);
    if(typeof val === 'string') el.textContent = val;
  });
  // Update meta title/description if present
  const titleKey = document.body.dataset.titleKey;
  const descKey = document.body.dataset.descKey;
  if(titleKey){ document.title = get(copy, titleKey) || document.title; }
  if(descKey){ let d = qs('meta[name="description"]'); if(d) d.setAttribute('content', get(copy, descKey) || ''); }
  // Update Open Graph tags
  const ogTitle = qs('meta[property="og:title"]'); if(ogTitle) ogTitle.setAttribute('content', document.title);
  const ogDesc = qs('meta[property="og:description"]'); if(ogDesc) ogDesc.setAttribute('content', (descKey? get(copy, descKey):'') || '');
}

function get(obj, path){
  return path.split('.').reduce((o,k)=> (o&&o[k]!=null)?o[k]:undefined, obj);
}

function saveLang(lang){ localStorage.setItem('lang', lang); }
function readLang(){ return localStorage.getItem('lang') || DEFAULT_LANG; }

/* Theme */
const THEME_KEY = 'theme';
function applyTheme(theme){
  document.body.classList.remove('light','dark');
  document.body.classList.add(theme);
}
function readTheme(){ return localStorage.getItem(THEME_KEY) || 'dark'; }
function saveTheme(theme){ localStorage.setItem(THEME_KEY, theme); }
function toggleTheme(){
  const next = document.body.classList.contains('dark') ? 'light' : 'dark';
  applyTheme(next); saveTheme(next);
}

/* Mobile Menu (burger + overlay) */
function initMobileMenu(){
  const burger = qs('.burger');
  const overlay = qs('.mobile-menu');
  if(!burger || !overlay) return;
  const panel = overlay.querySelector('.panel');
  const focusablesSel = 'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
  let lastFocused = null;

  function setScrollLock(on){ document.body.style.overflow = on? 'hidden' : ''; }

  function trapFocus(e){
    if(!overlay.classList.contains('active')) return;
    const f = Array.from(overlay.querySelectorAll(focusablesSel)).filter(el=>!el.hasAttribute('disabled'));
    if(!f.length) return;
    const first = f[0], last = f[f.length-1];
    if(e.key === 'Tab'){
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    } else if(e.key === 'Escape'){ close(); }
  }

  function open(){
    lastFocused = document.activeElement;
    overlay.classList.add('active');
    burger.setAttribute('aria-expanded','true');
    document.body.classList.add('menu-open');
    // swap icon to X
    const i = burger.querySelector('i'); if(i){ i.classList.remove('fa-bars'); i.classList.add('fa-xmark'); }
    setScrollLock(true);
    setTimeout(()=>{ (overlay.querySelector(focusablesSel)||burger).focus(); }, 0);
    document.addEventListener('keydown', trapFocus);
  }
  function close(){
    overlay.classList.remove('active');
    burger.setAttribute('aria-expanded','false');
    document.body.classList.remove('menu-open');
    // swap icon back to burger
    const i = burger.querySelector('i'); if(i){ i.classList.add('fa-bars'); i.classList.remove('fa-xmark'); }
    setScrollLock(false);
    document.removeEventListener('keydown', trapFocus);
    if(lastFocused) lastFocused.focus();
  }
  burger.addEventListener('click', ()=> overlay.classList.contains('active') ? close() : open());
  overlay.addEventListener('click', (e)=>{ if(e.target === overlay || e.target === panel) close(); });
}

/* Section reveal animations */
function initReveal(){
  const candidates = [
    ...qsa('.section > *'),
    ...qsa('.card'),
    ...qsa('.tier'),
    ...qsa('.gallery a'),
  ];
  const els = candidates.filter(el=>!el.classList.contains('reveal'));
  els.forEach(el=> el.classList.add('reveal'));
  const io = new IntersectionObserver((entries, obs)=>{
    entries.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('show'); obs.unobserve(en.target);} });
  }, {threshold: 0.2});
  els.forEach(el=> io.observe(el));
}

async function switchLang(lang){
  STATE.lang = lang;
  setDirAndLang(lang);
  STATE.copy = await loadCopy(lang);
  applyCopy(STATE.copy);
  // toggle active
  qsa('[data-lang]').forEach(b=> b.classList.toggle('active', b.dataset.lang===lang));
  // rerender page specifics
  if(STATE.page==='home') await renderHome();
  if(STATE.page==='portfolio') await renderPortfolio();
  if(STATE.page==='packages') await renderPackages();
}

/* Home */
async function renderHome(){
  const res = await fetch('content/home.json?_=' + Date.now());
  const data = await res.json();
  // Hero
  const wrap = qs('#hero-slides');
  if(wrap){
    wrap.innerHTML = data.hero.map(s=> `
      <div class="swiper-slide">
        <img src="${s.src}" alt="${STATE.lang==='ar'? (s.alt_ar||'') : (s.alt_en||'')}" loading="eager" decoding="async"/>
        <div class="caption">${STATE.lang==='ar'? (s.caption_ar||'') : (s.caption_en||'')}</div>
      </div>`).join('');
    // init swiper
    if(window.heroSwiper){ window.heroSwiper.destroy(true,true); }
    window.heroSwiper = new Swiper('.hero .swiper', { loop:true, autoplay:{delay:3500, disableOnInteraction:false}, speed:700, effect:'fade', pagination:{el:'.swiper-pagination', clickable:true}, navigation:{nextEl:'.swiper-button-next', prevEl:'.swiper-button-prev'} });
  }
  // Wedding album 4
  const grid = qs('#wedding-grid');
  if(grid){
    grid.innerHTML = data.wedding.slice(0,4).map(s=> {
      const alt = STATE.lang==='ar'? (s.alt_ar||'') : (s.alt_en||'');
      return `<a href="${s.src}" data-lightbox="wedding" data-title="${alt}">
        <img src="${s.src}" alt="${alt}" loading="lazy" decoding="async"/>
      </a>`;
    }).join('');
    // Bind lightbox to home grid
    const items = data.wedding.slice(0,4);
    qsa('#wedding-grid a', grid).forEach((a, idx)=>{
      a.addEventListener('click', (ev)=>{
        ev.preventDefault();
        openLightbox(items, idx, a);
      });
    });
  }
  // Inject localized CTA copy if present
  const cta = qs('#home-cta-text');
  if(cta){
    cta.textContent = STATE.lang==='ar'
      ? 'احتفل بقصتكما الفريدة بالتقاط كل تفصيلة بلمسة من الأناقة والجمال الخالد'
      : 'Celebrate Your Unique Love Story By Capturing Every Detail With A Touch Of Sophistication And Timeless Beauty';
  }
}

/* Portfolio */
let portfolioCache = null;
async function loadGallery(){
  if(portfolioCache) return portfolioCache;
  const res = await fetch('content/gallery.json?_=' + Date.now());
  portfolioCache = await res.json();
  return portfolioCache;
}

async function renderPortfolio(){
  const data = await loadGallery();
  const categories = data.categories;
  const images = data.images;
  const bar = qs('.filter-bar');
  const gallery = qs('.gallery');
  if(!bar || !gallery) return;
  // render buttons
  bar.innerHTML = ['all', ...categories.map(c=>c.id)].map(id=>{
    const label = id==='all' ? (STATE.lang==='ar'? 'الكل' : 'All') : (categories.find(c=>c.id===id)[STATE.lang] || id);
    return `<button type="button" data-filter="${id}">${label}</button>`;
  }).join('');
  // click handlers
  bar.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-filter]');
    if(!btn) return;
    qsa('.filter-bar button').forEach(b=>b.classList.toggle('active', b===btn));
    const id = btn.dataset.filter;
    drawGrid(id);
  });
  // initial
  qsa('.filter-bar button')[0]?.classList.add('active');
  drawGrid('all');

  function drawGrid(cat){
    const filtered = cat==='all' ? images : images.filter(im=> im.category===cat);
    gallery.innerHTML = filtered.map((s,idx)=>{
      const alt = STATE.lang==='ar'? (s.alt_ar||'') : (s.alt_en||'');
      return `<a href="${s.src}" class="g-item" data-index="${idx}" data-title="${alt}">
        <img src="${s.src}" alt="${alt}" loading="lazy" decoding="async"/>
      </a>`;
    }).join('');
    // bind lightbox open
    qsa('.gallery .g-item', gallery).forEach(a=>{
      a.addEventListener('click', (ev)=>{
        ev.preventDefault();
        const start = parseInt(a.dataset.index||'0',10);
        openLightbox(filtered, start, a);
      });
    });
  }
}

/* Lightbox using Swiper */
function ensureLightbox(){
  let modal = qs('#lightbox-modal');
  if(!modal){ return null; }
  return modal;
}
let lastLightboxTrigger = null;
function openLightbox(items, startIndex, triggerEl){
  const modal = ensureLightbox();
  if(!modal) return;
  const wrap = qs('#lightbox-wrapper');
  wrap.innerHTML = items.map(it=>`<div class="swiper-slide"><img src="${it.src}" alt="" decoding="async"></div>`).join('');
  if(window.lightboxSwiper){ window.lightboxSwiper.destroy(true,true); }
  window.lightboxSwiper = new Swiper('#lightbox-swiper', { initialSlide:startIndex||0, loop:true, navigation:{ nextEl:'#lightbox-next', prevEl:'#lightbox-prev' }, pagination:{ el:'#lightbox-pag', type:'fraction' }, keyboard:{enabled:true}, on:{ init(){ const cont = qs('#lightbox-swiper'); if(cont){ cont.addEventListener('click', (e)=>{ const isNav = e.target.closest('.swiper-button-next, .swiper-button-prev, .swiper-pagination'); if(!isNav) window.lightboxSwiper.slideNext(); }); } } } });
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  lastLightboxTrigger = triggerEl || document.activeElement;
  // Focus trap
  const focusablesSel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const trap = (e)=>{
    if(!modal.classList.contains('active')) return;
    if(e.key === 'Escape'){ closeLightbox(); return; }
    if(e.key !== 'Tab') return;
    const f = Array.from(modal.querySelectorAll(focusablesSel)).filter(el=>!el.hasAttribute('disabled'));
    if(!f.length) return;
    const first = f[0], last = f[f.length-1];
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  };
  modal.__trapHandler = trap;
  document.addEventListener('keydown', trap);
  // initial focus
  setTimeout(()=>{ (qs('#lightbox-close') || qs('#lightbox-next') || modal).focus(); }, 0);
}
function closeLightbox(){
  const modal = qs('#lightbox-modal');
  if(!modal) return;
  modal.classList.remove('active');
  document.body.style.overflow = '';
  if(modal.__trapHandler){ document.removeEventListener('keydown', modal.__trapHandler); modal.__trapHandler = null; }
  if(lastLightboxTrigger) lastLightboxTrigger.focus();
}

/* Packages */
function renderPackages(){
  const wrap = qs('#pricing');
  if(!wrap || !STATE.copy) return;
  const tiers = STATE.copy.packages.tiers;
  const currency = STATE.copy.packages.currency || '';
  wrap.innerHTML = tiers.map(t=> `
    <div class="tier">
      <div class="head">
        <div class="name" aria-label="tier-name">${t.name}</div>
        <div class="price" aria-label="tier-price">${currency}${t.price}</div>
      </div>
      <ul>
        ${t.features.map(f=>`<li>${f}</li>`).join('')}
      </ul>
    </div>
  `).join('');
}

/* Contact */
function initContact(){
  const form = qs('#contact-form');
  const alert = qs('#contact-alert');
  if(!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    // Validate using native constraints
    if(!form.checkValidity()){
      form.reportValidity();
      return;
    }
    alert.textContent=''; alert.className='alert';
    const submitBtn = form.querySelector('button[type="submit"]');
    const prevLabel = submitBtn ? submitBtn.textContent : '';
    if(submitBtn){ submitBtn.disabled = true; submitBtn.textContent = (get(STATE.copy,'contact.form.submit')||'Send') + '…'; }
    const fd = new FormData(form);
    // include current language for localized responses from PHP
    fd.append('lang', STATE.lang || DEFAULT_LANG);
    try{
      const res = await fetch('contact.php', { method:'POST', body: fd });
      const data = await res.json();
      alert.classList.add(data.success? 'ok':'err');
      alert.textContent = data.message || (data.success? 'Success':'Error');
      if(data.success) form.reset();
    }catch(err){
      alert.classList.add('err');
      alert.textContent = get(STATE.copy,'contact.messages.error') || 'Error';
    } finally {
      if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = prevLabel; }
    }
  });
}

/* Init */
document.addEventListener('DOMContentLoaded', async ()=>{
  STATE.page = document.body.dataset.page;
  // theme
  applyTheme(readTheme());
  qsa('.theme-toggle').forEach(btn=> btn.addEventListener('click', toggleTheme));
  // mobile menu
  initMobileMenu();
  // click handlers for lang
  qsa('[data-lang]').forEach(btn=> btn.addEventListener('click', async ()=>{
    const lang = btn.dataset.lang;
    saveLang(lang);
    await switchLang(lang);
  }));
  // initial language
  const lang = readLang();
  await switchLang(lang);

  // page specifics
  if(STATE.page==='home') await renderHome();
  if(STATE.page==='portfolio') await renderPortfolio();
  if(STATE.page==='packages') renderPackages();
  if(STATE.page==='contact') initContact();
  // global
  initScrollTop();
  initReveal();
  if(STATE.page==='home' || STATE.page==='about') initStats();
  // ensure canonical link
  let canonical = qs('link[rel="canonical"]');
  const cleanUrl = location.origin + location.pathname;
  if(!canonical){ canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
  canonical.setAttribute('href', cleanUrl);
  // Open Graph URL
  const ogUrl = qs('meta[property="og:url"]'); if(ogUrl) ogUrl.setAttribute('content', cleanUrl);
  // lightbox close
  const closeBtn = qs('#lightbox-close');
  if(closeBtn) closeBtn.addEventListener('click', closeLightbox);
  qs('#lightbox-modal')?.addEventListener('click', (e)=>{ if(e.target.id==='lightbox-modal') closeLightbox(); });
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && qs('#lightbox-modal')?.classList.contains('active')) closeLightbox(); });
});

document.addEventListener('contextmenu', function(event) {
  event.preventDefault();
  
  if (!document.getElementById('custom-overlay')) {
    // Create fullscreen transparent black background overlay
    var overlay = document.createElement('div');
    overlay.id = 'custom-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0, 0, 0, 0.7)'; // transparent black
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '10000';

    // Create the message box with fade-in animation
    var msg = document.createElement('div');
    msg.textContent = 'Hah, nice try!';
    msg.style.color = '#fff';
    msg.style.fontSize = '2rem';
    msg.style.padding = '20px 50px';
    msg.style.borderRadius = '10px';
    msg.style.background = 'rgba(0, 0, 0, 0.8)';
    msg.style.opacity = '0';
    msg.style.transition = 'opacity 0.5s ease';

    overlay.appendChild(msg);
    document.body.appendChild(overlay);

    // Trigger fade-in
    setTimeout(() => {
      msg.style.opacity = '1';
    }, 10);

    // Fade out and remove after 2 seconds
    setTimeout(() => {
      msg.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
      }, 500);
    }, 2000);
  }
});

