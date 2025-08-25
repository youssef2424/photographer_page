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
}

function get(obj, path){
  return path.split('.').reduce((o,k)=> (o&&o[k]!=null)?o[k]:undefined, obj);
}

function saveLang(lang){ localStorage.setItem('lang', lang); }
function readLang(){ return localStorage.getItem('lang') || DEFAULT_LANG; }

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
        <img src="${s.src}" alt="${STATE.lang==='ar'? (s.alt_ar||'') : (s.alt_en||'')}" loading="eager"/>
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
        <img src="${s.src}" alt="${alt}" loading="lazy"/>
      </a>`;
    }).join('');
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
    gallery.innerHTML = filtered.map(s=>{
      const alt = STATE.lang==='ar'? (s.alt_ar||'') : (s.alt_en||'');
      return `<a href="${s.src}" data-lightbox="portfolio" data-title="${alt}">
        <img src="${s.src}" alt="${alt}" loading="lazy"/>
      </a>`;
    }).join('');
  }
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
    alert.textContent=''; alert.className='alert';
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
    }
  });
}

/* Init */
document.addEventListener('DOMContentLoaded', async ()=>{
  STATE.page = document.body.dataset.page;
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
});
