/* Global Config */
const STATE = { page: null };

const qs = (s, r=document) => r.querySelector(s);
const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

/* Navbar Scroll Behavior */
function initNavbarScroll(){
  const header = qs('.site-header');
  if(!header) return;
  
  let lastScroll = 0;
  const scrollThreshold = 50; // Pixels to scroll before adding class
  
  function handleScroll(){
    const currentScroll = window.scrollY || document.documentElement.scrollTop;
    
    if(currentScroll > scrollThreshold){
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    lastScroll = currentScroll;
  }
  
  // Initial check
  handleScroll();
  
  // Listen to scroll with throttle for performance
  let ticking = false;
  window.addEventListener('scroll', ()=>{
    if(!ticking){
      window.requestAnimationFrame(()=>{
        handleScroll();
        ticking = false;
      });
      ticking = true;
    }
  }, {passive: true});
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


/* Theme */
const THEME_KEY = 'theme';
function applyTheme(theme){
  document.body.classList.remove('light','dark');
  document.body.classList.add(theme);
}
function readTheme(){ return localStorage.getItem(THEME_KEY) || 'light'; }
function saveTheme(theme){ localStorage.setItem(THEME_KEY, theme); }
function toggleTheme(){
  const next = document.body.classList.contains('dark') ? 'light' : 'dark';
  applyTheme(next); saveTheme(next);
  updateThemeIcons(next);
}

function updateThemeIcons(theme){
  const icons = qsa('.theme-toggle i');
  icons.forEach(icon => {
    if(theme === 'dark'){
      icon.classList.remove('fa-sun');
      icon.classList.add('fa-moon');
    } else {
      icon.classList.remove('fa-moon');
      icon.classList.add('fa-sun');
    }
  });
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


/* Home */
async function renderHome(){
  const res = await fetch('content/home.json?_=' + Date.now());
  const data = await res.json();
  
  // Hero - Main image with infinite carousel
  const heroSection = qs('.hero');
  if(heroSection && data.hero){
    const mainImage = data.hero.mainImage || data.hero[0];
    const carouselImages = data.hero.carousel || data.hero.slice(1, 5);
    
    heroSection.innerHTML = `
      <div class="hero-main-image">
        <img src="${mainImage.src}" alt="${mainImage.alt || 'Hero Image'}" loading="eager" decoding="async"/>
        <div class="elementor-image-carousel-wrapper">
          <div class="carousel-container">
            <div class="carousel-track" id="carousel-track">
              ${carouselImages.map((img, idx) => `
                <div class="carousel-item">
                  <img src="${img.src}" alt="${img.alt || 'Wedding highlight ' + (idx + 1)}" loading="lazy" decoding="async"/>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
      <!-- Hero CTA overlay -->
      <div class="cta-wrap" aria-label="Primary call to action">
        <h1 class="cta-text">Capturing Moments That Last Forever</h1>
        <div class="cta-buttons">
          <a href="contact.html" class="btn primary" aria-label="Let's Talk – contact">
            <span>Let's Talk</span>
            <span class="icon"><i class="fa-solid fa-arrow-right"></i></span>
          </a>
          <a href="portfolio.html" class="btn secondary" aria-label="View Portfolio">
            <span>View Portfolio</span>
            <span class="icon"><i class="fa-solid fa-arrow-right"></i></span>
          </a>
        </div>
      </div>
    `;
    
    // Initialize infinite carousel
    initHeroCarousel();
  }
  
  // Wedding album 4
  const grid = qs('#wedding-grid');
  if(grid && data.wedding){
    grid.innerHTML = data.wedding.slice(0,4).map(s=> {
      const alt = s.alt || '';
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
}

/* Infinite Hero Carousel - Touch Swipe & Click-Drag */
function initHeroCarousel(){
  const container = qs('.carousel-container');
  const track = qs('#carousel-track');
  if(!container || !track) return;
  
  // Clone items for infinite loop
  const items = qsa('.carousel-item', track);
  if(items.length === 0) return;
  
  // Duplicate items multiple times for seamless infinite scroll
  const cloneCount = 3;
  for(let i = 0; i < cloneCount; i++){
    items.forEach(item => {
      const clone = item.cloneNode(true);
      track.appendChild(clone);
    });
  }
  
  let isPaused = false;
  let isDragging = false;
  let startX = 0;
  let currentTranslate = 0;
  let prevTranslate = 0;
  let animationID = null;
  let currentIndex = 0;
  
  // Get track width for infinite loop calculation
  function getTrackWidth(){
    return track.scrollWidth / (cloneCount + 1);
  }
  
  // Animation loop for smooth scrolling
  function animation(){
    if(!isPaused && !isDragging){
      currentTranslate -= 0.5; // Scroll speed
      
      // Reset position for infinite loop
      const trackWidth = getTrackWidth();
      if(Math.abs(currentTranslate) >= trackWidth){
        currentTranslate = 0;
      }
      
      track.style.transform = `translateX(${currentTranslate}px)`;
    }
    animationID = requestAnimationFrame(animation);
  }
  
  // Start animation
  animation();
  
  // Pause/Resume functions
  function pauseCarousel(){
    isPaused = true;
    container.classList.add('paused');
  }
  
  function resumeCarousel(){
    isPaused = false;
    container.classList.remove('paused');
  }
  
  // Mouse hover - pause only
  container.addEventListener('mouseenter', pauseCarousel);
  container.addEventListener('mouseleave', resumeCarousel);
  
  // Touch/Mouse drag start
  function dragStart(e){
    isDragging = true;
    startX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
    prevTranslate = currentTranslate;
    container.style.cursor = 'grabbing';
    pauseCarousel();
  }
  
  // Touch/Mouse drag move
  function dragMove(e){
    if(!isDragging) return;
    
    const currentX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
    const diff = currentX - startX;
    currentTranslate = prevTranslate + diff;
    
    track.style.transform = `translateX(${currentTranslate}px)`;
  }
  
  // Touch/Mouse drag end
  function dragEnd(){
    if(!isDragging) return;
    
    isDragging = false;
    container.style.cursor = 'grab';
    
    // Normalize position for infinite loop
    const trackWidth = getTrackWidth();
    if(currentTranslate > 0){
      currentTranslate = -trackWidth + (currentTranslate % trackWidth);
    } else if(Math.abs(currentTranslate) >= trackWidth){
      currentTranslate = currentTranslate % trackWidth;
    }
    
    prevTranslate = currentTranslate;
    resumeCarousel();
  }
  
  // Touch events
  container.addEventListener('touchstart', dragStart, {passive: true});
  container.addEventListener('touchmove', dragMove, {passive: true});
  container.addEventListener('touchend', dragEnd, {passive: true});
  
  // Mouse events
  container.addEventListener('mousedown', dragStart);
  container.addEventListener('mousemove', dragMove);
  container.addEventListener('mouseup', dragEnd);
  container.addEventListener('mouseleave', (e)=>{
    if(isDragging){
      dragEnd();
    }
  });
  
  // Prevent context menu on long press
  container.addEventListener('contextmenu', (e)=>{
    if(isDragging) e.preventDefault();
  });
  
  // Keyboard accessibility - Space/Enter to pause/resume
  container.setAttribute('tabindex', '0');
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', 'Continuous image gallery carousel');
  container.setAttribute('aria-live', 'polite');
  
  container.addEventListener('keydown', (e)=>{
    if(e.key === ' ' || e.key === 'Enter'){
      e.preventDefault();
      if(isPaused){
        resumeCarousel();
        container.setAttribute('aria-label', 'Continuous image gallery carousel - playing');
      } else {
        pauseCarousel();
        container.setAttribute('aria-label', 'Continuous image gallery carousel - paused');
      }
    }
  });
  
  // Focus management
  container.addEventListener('focus', ()=>{
    container.style.outline = '2px solid var(--accent)';
    container.style.outlineOffset = '4px';
  });
  
  container.addEventListener('blur', ()=>{
    container.style.outline = 'none';
  });
  
  // Add alt text to images if missing
  qsa('.carousel-item img', track).forEach((img, idx)=>{
    if(!img.alt || img.alt === ''){
      img.alt = `Carousel image ${idx + 1}`;
    }
  });
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', ()=>{
    if(animationID) cancelAnimationFrame(animationID);
  });
}

/* Load and Render Videos */
async function loadVideos(){
  try{
    const res = await fetch('content/videos.json?_=' + Date.now());
    const data = await res.json();
    return data.videos || [];
  }catch(err){
    console.error('Failed to load videos:', err);
    return [];
  }
}

function renderVideoGrid(videos, containerId){
  const container = qs(`#${containerId}`);
  if(!container) return;
  
  container.innerHTML = videos.map((video, idx) => `
    <div class="video-item" data-video-url="${video.videoUrl}" data-video-id="${video.id || idx}">
      <div class="video-wrapper">
        <img src="${video.thumbnail}" alt="${video.title}" loading="lazy" decoding="async"/>
      </div>
      <div class="play-overlay">
        <div class="play-icon">
          <i class="fa-solid fa-play"></i>
        </div>
      </div>
      <div class="video-title">${video.title}</div>
    </div>
  `).join('');
  
  // Add click handlers
  qsa('.video-item', container).forEach(item => {
    item.addEventListener('click', ()=>{
      const videoUrl = item.dataset.videoUrl;
      const videoId = item.dataset.videoId;
      // Here you would open a video modal or redirect
      console.log('Play video:', videoUrl, 'ID:', videoId);
      // Future: openVideoModal(videoUrl, videoId);
    });
  });
}

async function renderCinematography(){
  const videos = await loadVideos();
  // Render first 6 for home page
  renderVideoGrid(videos.slice(0, 4), 'video-grid');
  // Render all for cinematography page
  renderVideoGrid(videos, 'cinematography-grid');
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
    const label = id==='all' ? 'All' : (categories.find(c=>c.id===id)?.en || id);
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
      const alt = s.alt || '';
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
async function renderPackages(){
  // Packages rendering would need static content or a packages.json file
  // For now, this is a placeholder
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
    if(submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }
    const fd = new FormData(form);
    try{
      const res = await fetch('contact.php', { method:'POST', body: fd });
      const data = await res.json();
      alert.classList.add(data.success? 'ok':'err');
      alert.textContent = data.message || (data.success? 'Success':'Error');
      if(data.success) form.reset();
    }catch(err){
      alert.classList.add('err');
      alert.textContent = 'Error sending message. Please try again.';
    } finally {
      if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = prevLabel; }
    }
  });
}

/* Init */
document.addEventListener('DOMContentLoaded', async ()=>{
  STATE.page = document.body.dataset.page;
  // theme
  const currentTheme = readTheme();
  applyTheme(currentTheme);
  updateThemeIcons(currentTheme);
  qsa('.theme-toggle').forEach(btn=> btn.addEventListener('click', toggleTheme));
  // mobile menu
  initMobileMenu();
  // navbar scroll behavior
  initNavbarScroll();

  // page specifics
  if(STATE.page==='home'){
    await renderHome();
    await renderCinematography();
  }
  if(STATE.page==='portfolio') await renderPortfolio();
  if(STATE.page==='cinematography') await renderCinematography();
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

// document.addEventListener('contextmenu', function(event) {
//   event.preventDefault();
  
//   if (!document.getElementById('custom-overlay')) {
//     // Create fullscreen transparent black background overlay
//     var overlay = document.createElement('div');
//     overlay.id = 'custom-overlay';
//     overlay.style.position = 'fixed';
//     overlay.style.top = '0';
//     overlay.style.left = '0';
//     overlay.style.width = '100vw';
//     overlay.style.height = '100vh';
//     overlay.style.background = 'rgba(0, 0, 0, 0.7)'; // transparent black
//     overlay.style.display = 'flex';
//     overlay.style.justifyContent = 'center';
//     overlay.style.alignItems = 'center';
//     overlay.style.zIndex = '10000';

//     // Create the message box with fade-in animation
//     var msg = document.createElement('div');
//     msg.textContent = 'Hah, nice try!';
//     msg.style.color = '#fff';
//     msg.style.fontSize = '2rem';
//     msg.style.padding = '20px 50px';
//     msg.style.borderRadius = '10px';
//     msg.style.background = 'rgba(0, 0, 0, 0.8)';
//     msg.style.opacity = '0';
//     msg.style.transition = 'opacity 0.5s ease';

//     overlay.appendChild(msg);
//     document.body.appendChild(overlay);

//     // Trigger fade-in
//     setTimeout(() => {
//       msg.style.opacity = '1';
//     }, 10);

//     // Fade out and remove after 2 seconds
//     setTimeout(() => {
//       msg.style.opacity = '0';
//       setTimeout(() => {
//         overlay.remove();
//       }, 500);
//     }, 2000);
//   }
// });

