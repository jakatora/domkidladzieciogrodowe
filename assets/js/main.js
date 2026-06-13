
document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const page = body.dataset.page;
  const topbar = document.querySelector('.topbar');

  document.querySelectorAll('.main-nav a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (href.includes(page === 'home' ? 'index.html' : page)) a.classList.add('active');
  });


  const menuToggle = document.querySelector('.menu-toggle');
  const navShell = document.querySelector('.nav-shell');

  const closeMenu = () => {
    if (!menuToggle || !topbar) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Otwórz menu');
    topbar.classList.remove('menu-open');
    body.classList.remove('menu-open');
  };

  const openMenu = () => {
    if (!menuToggle || !topbar) return;
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Zamknij menu');
    topbar.classList.add('menu-open');
    body.classList.add('menu-open');
  };

  menuToggle?.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    expanded ? closeMenu() : openMenu();
  });

  navShell?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => closeMenu());
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeMenu();
  });

  const onScroll = () => {
    if (!topbar) return;
    topbar.classList.toggle('scrolled', window.scrollY > 8);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Hero parallax
  const hero = document.querySelector('.hero-card');
  if (hero && window.matchMedia('(pointer:fine)').matches) {
    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 10;
      hero.style.setProperty('--hero-x', `${x}px`);
      hero.style.setProperty('--hero-y', `${y}px`);
    });
    hero.addEventListener('mouseleave', () => {
      hero.style.setProperty('--hero-x', '0px');
      hero.style.setProperty('--hero-y', '0px');
    });
  }

  // Reveal on scroll
  const revealTargets = [
    '.hero-card', '.home-model-card', '.gallery-top', '.gallery-tile', '.model-detail-card',
    '.masonry-item', '.exec-intro', '.exec-band-grid', '.spec-section', '.contact-card-main', '.info-box', '.footer-grid > *'
  ].flatMap(sel => [...document.querySelectorAll(sel)]);

  revealTargets.forEach((el, idx) => {
    el.classList.add('will-reveal');
    el.style.transitionDelay = `${Math.min(idx % 6, 5) * 55}ms`;
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });

  revealTargets.forEach(el => observer.observe(el));

  // image load state
  document.querySelectorAll('img').forEach((img) => {
    if (img.complete) {
      img.closest('.gallery-tile, .masonry-item, .model-thumb, .model-gallery-main, .home-model-image')?.classList.add('is-loaded');
    } else {
      img.addEventListener('load', () => {
        img.closest('.gallery-tile, .masonry-item, .model-thumb, .model-gallery-main, .home-model-image')?.classList.add('is-loaded');
      }, { once: true });
    }
  });

  // Lightbox
  const modal = document.getElementById('lightbox');
  const modalImg = modal?.querySelector('.lightbox-image');
  const closeBtn = modal?.querySelector('.lightbox-close');
  const prevBtn = modal?.querySelector('.lightbox-nav.prev');
  const nextBtn = modal?.querySelector('.lightbox-nav.next');
  const counterEl = modal?.querySelector('.lightbox-counter');
  const captionEl = modal?.querySelector('.lightbox-caption');
  const thumbsEl = modal?.querySelector('.lightbox-thumbs');
  let currentGroup = [];
  let currentIndex = 0;
  let touchStartX = null;
  let touchStartY = null;

  const itemsByGroup = {};
  document.querySelectorAll('[data-gallery-item]').forEach(item => {
    const group = item.dataset.galleryGroup || 'default';
    (itemsByGroup[group] ||= []).push(item);
  });

  document.querySelectorAll('.model-gallery-block').forEach(block => {
    const group = block.dataset.modelGroup;
    const thumbs = [...block.querySelectorAll('.model-thumb[data-gallery-group]')];
    if (group && thumbs.length) {
      itemsByGroup[group] = thumbs;
    }
  });

  function getItemData(item) {
    const img = item?.querySelector('img');
    return {
      src: img?.currentSrc || img?.src || '',
      alt: img?.alt || '',
      thumb: img?.currentSrc || img?.src || '',
    };
  }

  function buildThumbs() {
    if (!thumbsEl) return;
    thumbsEl.innerHTML = '';
    currentGroup.forEach((item, idx) => {
      const { thumb, alt } = getItemData(item);
      const btn = document.createElement('button');
      btn.className = 'lightbox-thumb' + (idx === currentIndex ? ' is-active' : '');
      btn.type = 'button';
      btn.setAttribute('aria-label', `Pokaż zdjęcie ${idx + 1}`);
      btn.innerHTML = `<img src="${thumb}" alt="${alt}" loading="lazy" decoding="async">`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setLightboxIndex(idx);
      });
      thumbsEl.appendChild(btn);
    });
    thumbsEl.scrollLeft = Math.max(0, currentIndex * 76 - thumbsEl.clientWidth / 2 + 36);
  }

  function updateThumbs() {
    if (!thumbsEl) return;
    [...thumbsEl.children].forEach((el, idx) => el.classList.toggle('is-active', idx === currentIndex));
    const active = thumbsEl.querySelector('.lightbox-thumb.is-active');
    active?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }

  function renderLightbox() {
    const item = currentGroup[currentIndex];
    if (!item || !modalImg) return;
    const { src, alt } = getItemData(item);
    modalImg.classList.add('is-changing');
    const preload = new Image();
    preload.onload = () => {
      modalImg.src = src;
      modalImg.alt = alt || '';
      counterEl && (counterEl.textContent = `${currentIndex + 1} / ${currentGroup.length}`);
      captionEl && (captionEl.textContent = alt || '');
      modalImg.classList.remove('is-changing');
      updateThumbs();
    };
    preload.src = src;
  }

  function setLightboxIndex(index) {
    if (!currentGroup.length) return;
    currentIndex = (index + currentGroup.length) % currentGroup.length;
    renderLightbox();
  }

  function openLightbox(group, index) {
    currentGroup = itemsByGroup[group] || [];
    currentIndex = index;
    buildThumbs();
    renderLightbox();
    body.classList.add('has-modal');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    closeBtn?.focus({ preventScroll: true });
  }

  function syncModelGalleryState() {
    if (!currentGroup.length) return;
    const activeItem = currentGroup[currentIndex];
    const group = activeItem?.dataset.galleryGroup;
    if (!group) return;

    const block = document.querySelector(`.model-gallery-block[data-model-group="${group}"]`);
    const mainImg = document.getElementById('main-' + group);
    const count = document.getElementById('count-' + group);
    const trigger = block?.querySelector('[data-gallery-item][data-main-image]');
    const thumbs = [...(block?.querySelectorAll('.model-thumb') || [])];
    const sourceImg = activeItem?.querySelector('img');

    if (!block || !mainImg || !sourceImg) return;

    mainImg.src = sourceImg.currentSrc || sourceImg.src;
    mainImg.alt = sourceImg.alt || '';
    if (count) count.textContent = `${currentIndex + 1} / ${thumbs.length || currentGroup.length}`;
    if (trigger) trigger.setAttribute('data-index', currentIndex);
    thumbs.forEach((thumb, idx) => thumb.classList.toggle('active', idx === currentIndex));
  }

  function closeLightbox() {
    syncModelGalleryState();
    modal?.classList.remove('open');
    modal?.setAttribute('aria-hidden', 'true');
    body.classList.remove('has-modal');
  }

  function navLightbox(dir) {
    if (!currentGroup.length) return;
    setLightboxIndex(currentIndex + dir);
  }

  document.querySelectorAll('[data-gallery-item]').forEach(item => {
    item.addEventListener('click', () => {
      const group = item.dataset.galleryGroup || 'default';
      const index = Number(item.dataset.index ?? (itemsByGroup[group] || []).indexOf(item));
      openLightbox(group, index);
    });
  });

  closeBtn?.addEventListener('click', closeLightbox);
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeLightbox(); });
  prevBtn?.addEventListener('click', (e) => { e.stopPropagation(); navLightbox(-1); });
  nextBtn?.addEventListener('click', (e) => { e.stopPropagation(); navLightbox(1); });

  modal?.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }, { passive: true });

  modal?.addEventListener('touchend', (e) => {
    if (touchStartX == null || touchStartY == null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) navLightbox(deltaX > 0 ? -1 : 1);
    touchStartX = null;
    touchStartY = null;
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (!modal?.classList.contains('open')) return;
    if (e.key === 'Escape') { closeLightbox(); closeMenu(); }
    if (e.key === 'ArrowLeft') navLightbox(-1);
    if (e.key === 'ArrowRight') navLightbox(1);
  });

  // Model thumbnails
  document.querySelectorAll('.model-gallery-block').forEach(block => {
    const group = block.dataset.modelGroup;
    const mainImg = document.getElementById('main-' + group);
    const count = document.getElementById('count-' + group);
    const trigger = block.querySelector('[data-gallery-item][data-main-image]');
    const thumbs = [...block.querySelectorAll('.model-thumb')];

    thumbs.forEach((thumb, idx) => {
      thumb.addEventListener('click', (e) => {
        e.stopPropagation();
        const img = thumb.querySelector('img');
        if (!img || !mainImg) return;
        if (mainImg.src === img.src) return;
        mainImg.classList.add('is-swapping');
        setTimeout(() => {
          mainImg.src = img.src;
          mainImg.alt = img.alt;
          if (count) count.textContent = `${idx + 1} / ${thumbs.length}`;
          trigger?.setAttribute('data-index', idx);
          thumbs.forEach(t => t.classList.remove('active'));
          thumb.classList.add('active');
          requestAnimationFrame(() => mainImg.classList.remove('is-swapping'));
        }, 130);
      });
    });
  });



  // Subtle premium tilt interactions
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReducedMotion && window.matchMedia('(pointer:fine)').matches) {
    const tiltTargets = [...document.querySelectorAll('.home-model-card, .model-detail-card, .contact-card-main, .info-box, .gallery-tile, .masonry-item, .exec-photo, .exec-collage .small, .exec-collage .wide, .footer-socials a, .social-chip, .phone-pill, .white-btn, .ghost-btn, .outline-btn, .solid-btn')];

    tiltTargets.forEach((el) => {
      let frame = null;

      const reset = () => {
        el.style.setProperty('--tilt-x', '0deg');
        el.style.setProperty('--tilt-y', '0deg');
        el.style.setProperty('--glow-x', '50%');
        el.style.setProperty('--glow-y', '50%');
      };

      const update = (clientX, clientY) => {
        const rect = el.getBoundingClientRect();
        const relX = (clientX - rect.left) / rect.width;
        const relY = (clientY - rect.top) / rect.height;
        const tiltY = (relX - 0.5) * 5.5;
        const tiltX = (0.5 - relY) * 4.5;

        el.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
        el.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
        el.style.setProperty('--glow-x', `${(relX * 100).toFixed(1)}%`);
        el.style.setProperty('--glow-y', `${(relY * 100).toFixed(1)}%`);
      };

      el.addEventListener('mousemove', (e) => {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => update(e.clientX, e.clientY));
      });

      el.addEventListener('mouseleave', () => {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(reset);
      });

      reset();
    });
  }
  // Scrollspy for models page
  const pillLinks = [...document.querySelectorAll('.model-nav-pills a')];
  if (pillLinks.length) {
    const cards = pillLinks
      .map(link => document.querySelector(link.getAttribute('href')))
      .filter(Boolean);

    const setCurrent = (id) => {
      pillLinks.forEach(link => {
        link.classList.toggle('is-current', link.getAttribute('href') === `#${id}`);
      });
    };
    if (cards[0]?.id) setCurrent(cards[0].id);

    const cardObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]?.target?.id) setCurrent(visible[0].target.id);
    }, { threshold: [0.35, 0.6, 0.85], rootMargin: '-18% 0px -45% 0px' });

    cards.forEach(card => cardObserver.observe(card));
  }
});
