// Mark JS as active — reveal animations only apply once this runs,
// so content stays visible by default if JS fails to load.
document.documentElement.classList.add('js-ready');

// Dark mode toggle, persisted in localStorage
const themeToggle = document.getElementById('themeToggle');
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  if (themeToggle) themeToggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}
const savedTheme = localStorage.getItem('theme');
applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('theme', next);
  });
}

// Mobile rail toggle
const toggle = document.getElementById('mobileToggle');
const rail = document.getElementById('rail');
if (toggle && rail) {
  toggle.addEventListener('click', () => {
    rail.classList.toggle('open');
    toggle.textContent = rail.classList.contains('open') ? 'Close' : 'Menu';
  });
  rail.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    rail.classList.remove('open');
    toggle.textContent = 'Menu';
  }));
}

// Active section highlight in rail nav
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.rail-nav a');
const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(l => l.classList.remove('active'));
      const active = document.querySelector(`.rail-nav a[href="#${entry.target.id}"]`);
      if (active) active.classList.add('active');
    }
  });
}, { rootMargin: '-35% 0px -55% 0px' });
sections.forEach(s => navObserver.observe(s));

// Scroll-reveal for content blocks
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
revealEls.forEach(el => revealObserver.observe(el));

// Contact form submission — email delivery goes straight from the browser
// to Web3Forms (their free plan only accepts client-side submissions, not
// server-to-server calls), while a parallel call to our own /api/contact
// logs the submission to the admin dashboard regardless of email outcome.
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  const WEB3FORMS_ACCESS_KEY = '3dcb2bf4-66aa-4cab-bb3c-af2ff462b37d'; // public key — safe to expose client-side
  const submitBtn = document.getElementById('msgSubmitBtn');
  const statusEl = document.getElementById('msgFormStatus');

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(contactForm);
    const payload = {
      name: formData.get('name'),
      email: formData.get('email'),
      subject: formData.get('subject'),
      message: formData.get('message'),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    statusEl.textContent = '';
    statusEl.className = 'msg-form-status';

    // Log to our own dashboard — best-effort, doesn't block the email send.
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: `[Portfolio] ${payload.subject}`,
          from_name: payload.name,
          replyto: payload.email,
          message: `From: ${payload.name} <${payload.email}>\n\n${payload.message}`,
        }),
      });
      const data = await res.json();

      if (data.success) {
        statusEl.textContent = "Message sent — I'll get back to you soon.";
        statusEl.className = 'msg-form-status ok';
        contactForm.reset();
      } else {
        statusEl.textContent = data.message || 'Something went wrong. Please try again.';
        statusEl.className = 'msg-form-status err';
      }
    } catch {
      statusEl.textContent = 'Network error. Please try again.';
      statusEl.className = 'msg-form-status err';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message →';
    }
  });
}

// ===========================================================
// Scroll progress bar
// ===========================================================
const scrollProgress = document.getElementById('scrollProgress');
if (scrollProgress) {
  const updateProgress = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    scrollProgress.style.width = `${Math.min(100, Math.max(0, pct))}%`;
  };
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();
}

// ===========================================================
// Command palette (⌘K / Ctrl+K quick jump)
// ===========================================================
const cpOverlay = document.getElementById('cpOverlay');
const cpInput = document.getElementById('cpInput');
const cpResults = document.getElementById('cpResults');
const paletteTrigger = document.getElementById('paletteTrigger');

if (cpOverlay && cpInput && cpResults) {
  // Index built from the nav rail (sections) and project cards (deep links)
  // so it stays in sync with the page without a separate hardcoded list.
  const buildIndex = () => {
    const items = [];
    document.querySelectorAll('.rail-nav a').forEach((a) => {
      const label = a.textContent.replace(/^§\d+/, '').replace(/\d$|⌘K$/, '').trim();
      items.push({ label, kind: 'Section', href: a.getAttribute('href') });
    });
    document.querySelectorAll('#projects .entry[id]').forEach((entry) => {
      const title = entry.querySelector('h3')?.textContent?.trim();
      if (title) items.push({ label: title, kind: 'Project', href: `#${entry.id}` });
    });
    return items;
  };
  const index = buildIndex();

  let activeIndex = -1;
  let filtered = index;

  const render = () => {
    cpResults.innerHTML = '';
    if (filtered.length === 0) {
      cpResults.innerHTML = '<li class="cp-empty">No matches</li>';
      return;
    }
    filtered.forEach((item, i) => {
      const li = document.createElement('li');
      li.className = 'cp-result' + (i === activeIndex ? ' is-active' : '');
      li.innerHTML = `<span>${item.label}</span><span class="cp-kind">${item.kind}</span>`;
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        go(item);
      });
      cpResults.appendChild(li);
    });
  };

  const go = (item) => {
    closePalette();
    const target = document.querySelector(item.href);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openPalette = () => {
    cpOverlay.classList.add('is-open');
    cpInput.value = '';
    filtered = index;
    activeIndex = -1;
    render();
    setTimeout(() => cpInput.focus(), 0);
  };
  const closePalette = () => {
    cpOverlay.classList.remove('is-open');
  };

  cpInput.addEventListener('input', () => {
    const q = cpInput.value.trim().toLowerCase();
    filtered = q ? index.filter((item) => item.label.toLowerCase().includes(q)) : index;
    activeIndex = filtered.length ? 0 : -1;
    render();
  });

  cpInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
      render();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      render();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[activeIndex]) go(filtered[activeIndex]);
    } else if (e.key === 'Escape') {
      closePalette();
    }
  });

  cpOverlay.addEventListener('mousedown', (e) => {
    if (e.target === cpOverlay) closePalette();
  });
  if (paletteTrigger) paletteTrigger.addEventListener('click', openPalette);

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      cpOverlay.classList.contains('is-open') ? closePalette() : openPalette();
    }
  });

  // ---------------------------------------------------------
  // Number-key section shortcuts (1–9, 0), disabled while
  // typing in any input/textarea or with the palette open.
  // ---------------------------------------------------------
  const sectionByKey = {
    '1': '#profile', '2': '#experience', '3': '#education', '4': '#projects',
    '5': '#papers', '6': '#dissertation', '7': '#skills', '8': '#certifications',
    '9': '#ask-ai', '0': '#contact',
  };
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (cpOverlay.classList.contains('is-open')) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
    const href = sectionByKey[e.key];
    if (!href) return;
    const target = document.querySelector(href);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

// ===========================================================
// Project filter chips — built from the tags already present
// on each project card, so it can't drift out of sync.
// ===========================================================
const projectFilters = document.getElementById('projectFilters');
if (projectFilters) {
  const projectEntries = Array.from(document.querySelectorAll('#projects .entry[id]'));
  const tagSet = new Set();
  projectEntries.forEach((entry) => {
    entry.querySelectorAll('.entry-tags span').forEach((t) => tagSet.add(t.textContent.trim()));
  });

  const makeChip = (label, isAll) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'filter-chip' + (isAll ? ' is-active' : '');
    chip.textContent = label;
    chip.dataset.tag = isAll ? '' : label;
    return chip;
  };

  const allChip = makeChip('All', true);
  projectFilters.appendChild(allChip);
  Array.from(tagSet).sort().forEach((tag) => projectFilters.appendChild(makeChip(tag, false)));

  projectFilters.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    projectFilters.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    const tag = chip.dataset.tag;
    projectEntries.forEach((entry) => {
      const tags = Array.from(entry.querySelectorAll('.entry-tags span')).map((t) => t.textContent.trim());
      const show = !tag || tags.includes(tag);
      entry.classList.toggle('is-filtered-out', !show);
    });
  });
}

// ===========================================================
// Copy-to-clipboard (Contact section)
// ===========================================================
document.querySelectorAll('.copy-btn').forEach((btn) => {
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const value = btn.dataset.copy;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard API unavailable (very old browser / insecure context) — silently no-op.
      return;
    }
    const original = btn.textContent;
    btn.textContent = 'Copied';
    btn.classList.add('is-copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('is-copied');
    }, 1500);
  });
});

// ===========================================================
// Reading-time badges for Papers and Dissertation objectives
// ===========================================================
const WORDS_PER_MINUTE = 200;
const readingTime = (text) => Math.max(1, Math.round(text.trim().split(/\s+/).length / WORDS_PER_MINUTE));

document.querySelectorAll('#papers .biblio > li').forEach((li) => {
  const text = [
    li.querySelector('.biblio-title')?.textContent,
    li.querySelector('.biblio-abstract')?.textContent,
  ].filter(Boolean).join(' ');
  const meta = li.querySelector('.biblio-meta');
  if (!text || !meta) return;
  const badge = document.createElement('span');
  badge.className = 'reading-time';
  badge.textContent = `${readingTime(text)} min read`;
  meta.insertBefore(badge, meta.firstChild);
});

document.querySelectorAll('#dissertation .entry').forEach((entry) => {
  const text = [
    entry.querySelector('h3')?.textContent,
    entry.querySelector('.entry-desc')?.textContent,
    entry.querySelector('.key-result')?.textContent,
  ].filter(Boolean).join(' ');
  const head = entry.querySelector('.entry-head');
  if (!text || !head) return;
  const badge = document.createElement('span');
  badge.className = 'reading-time';
  badge.textContent = `${readingTime(text)} min read`;
  head.appendChild(badge);
});

// ===========================================================
// Footer "last updated" — read from last-updated.json, which gets
// regenerated with the current timestamp as part of every deploy
// (Cloudflare Pages doesn't expose a reliable Last-Modified header
// on static assets, so a header-based approach can't work here).
// ===========================================================
const footerUpdated = document.getElementById('footerUpdated');
if (footerUpdated) {
  fetch('/last-updated.json', { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data?.date) return;
      const date = new Date(data.date);
      if (isNaN(date)) return;
      footerUpdated.textContent = `Last updated ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    })
    .catch(() => {});
}