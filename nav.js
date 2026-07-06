/* ═══════════════════════════════════════
   MERKLESHOP — MEGAMENU LOGIC
═══════════════════════════════════════ */

(function () {
  const nav       = document.querySelector('.nav');
  const overlay   = document.querySelector('.nav-overlay');
  const hamburger = document.querySelector('.nav-hamburger');
  const drawer    = document.querySelector('.nav-drawer');
  const items     = document.querySelectorAll('.nav-item[data-mega]');

  // ── MEGAMENU DESKTOP ──────────────────

  function closeAll() {
    items.forEach(i => i.classList.remove('open'));
    overlay && overlay.classList.remove('active');
  }

  items.forEach(item => {
    const btn = item.querySelector('.nav-item-btn');
    btn && btn.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = item.classList.contains('open');
      closeAll();
      if (!isOpen) {
        item.classList.add('open');
        overlay && overlay.classList.add('active');
      }
    });
  });

  // Click fuori chiude
  overlay && overlay.addEventListener('click', closeAll);
  document.addEventListener('click', e => {
    if (!e.target.closest('.nav-item[data-mega]')) closeAll();
  });

  // Escape chiude
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAll();
  });

  // ── MOBILE DRAWER ────────────────────

  function openDrawer() {
    drawer && drawer.classList.add('open');
    overlay && overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer && drawer.classList.remove('open');
    overlay && overlay.classList.remove('active');
    document.body.style.overflow = '';
    // Chiudi anche eventuali accordion aperti
    document.querySelectorAll('.nav-drawer-item.open')
      .forEach(i => i.classList.remove('open'));
  }

  hamburger && hamburger.addEventListener('click', () => {
    const isOpen = drawer && drawer.classList.contains('open');
    hamburger.classList.toggle('open');
    isOpen ? closeDrawer() : openDrawer();
  });

  document.querySelector('.nav-drawer-close')
    && document.querySelector('.nav-drawer-close')
        .addEventListener('click', () => {
          hamburger && hamburger.classList.remove('open');
          closeDrawer();
        });

  // Accordion drawer mobile
  document.querySelectorAll('.nav-drawer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.nav-drawer-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.nav-drawer-item.open')
        .forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  // ── SCROLL BEHAVIOR ──────────────────
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const current = window.scrollY;
    if (current > 80) {
      nav && nav.classList.add('nav--scrolled');
    } else {
      nav && nav.classList.remove('nav--scrolled');
    }
    lastScroll = current;
  }, { passive: true });

})();