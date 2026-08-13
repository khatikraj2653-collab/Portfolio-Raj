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