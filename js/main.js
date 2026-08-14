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