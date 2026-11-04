/* Typing effect on the hero role.
   Cycles through three roles with a blinking caret.
   Reduced-motion users see all three static with pipe separators. */
(function () {
  'use strict';

  var ROLES = [
    { text: 'AI/ML Engineer', color: 'var(--indigo)' },
    { text: 'Agentic AI Systems', color: 'var(--gold)' },
    { text: 'GenAI Research', color: 'var(--green)' }
  ];

  var TYPE_MS = 65;
  var ERASE_MS = 35;
  var HOLD_MS = 1600;
  var BETWEEN_MS = 400;

  var host = document.getElementById('heroRole');
  if (!host) return;
  var typed = host.querySelector('.role-typed');
  if (!typed) return;

  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) {
    typed.textContent = ROLES.map(function (r) { return r.text; }).join(' | ');
    typed.style.color = '';
    var caret = host.querySelector('.role-caret');
    if (caret) caret.style.display = 'none';
    return;
  }

  var i = 0, ch = 0, mode = 'type';
  typed.textContent = '';
  typed.style.color = ROLES[0].color;

  function step() {
    var cur = ROLES[i];
    if (mode === 'type') {
      ch++;
      typed.textContent = cur.text.slice(0, ch);
      if (ch >= cur.text.length) { mode = 'hold'; setTimeout(step, HOLD_MS); return; }
      setTimeout(step, TYPE_MS);
    } else if (mode === 'hold') {
      mode = 'erase';
      setTimeout(step, ERASE_MS);
    } else if (mode === 'erase') {
      ch--;
      typed.textContent = cur.text.slice(0, ch);
      if (ch <= 0) {
        i = (i + 1) % ROLES.length;
        typed.style.color = ROLES[i].color;
        mode = 'type';
        setTimeout(step, BETWEEN_MS);
        return;
      }
      setTimeout(step, ERASE_MS);
    }
  }

  setTimeout(step, 800);
})();
