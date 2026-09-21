(() => {
  const cover = document.querySelector('.moon-cover');
  if (!cover) return;
  const lamp = cover.querySelector('.cozy-lamp');
  const cat = cover.querySelector('.cozy-cat');
  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let sleepTimer;
  const settleCat = () => {
    clearTimeout(sleepTimer);
    cat.classList.remove('is-awake');
  };

  // Reuse Fluid's switch so the illustration, navbar, and saved theme agree.
  const syncLamp = () => {
    const dark = root.getAttribute('data-user-color-scheme') === 'dark';
    lamp.setAttribute('aria-pressed', String(dark));
    lamp.setAttribute('aria-label', dark ? '落地灯：关灯，切换到白天' : '落地灯：开灯，切换到黑夜');
  };
  const activate = (element, action) => {
    element.addEventListener('click', action);
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!event.repeat) action();
      }
    });
  };
  activate(lamp, () => {
    document.getElementById('color-toggle-btn')?.click();
    syncLamp();
  });
  activate(cat, () => {
    // One quiet response per pet; repeated clicks do not restart the motion.
    if (cat.classList.contains('is-awake')) return;
    cat.classList.add('is-awake');
    sleepTimer = setTimeout(settleCat, reducedMotion.matches ? 600 : 2800);
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) settleCat();
  });
  new MutationObserver(syncLamp).observe(root, {
    attributes: true, attributeFilter: ['data-user-color-scheme']
  });
  syncLamp();
  // Animation plays by default. Suspend it only when the scene is out of view.
  // CSS respects the visitor's reduced-motion preference.
  let visible = true;
  const updateVisibility = () => cover.classList.toggle('is-away', document.hidden || !visible);
  document.addEventListener('visibilitychange', updateVisibility);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updateVisibility();
    }).observe(cover);
  }
  updateVisibility();
})();
