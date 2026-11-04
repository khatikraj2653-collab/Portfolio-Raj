/* 3D holographic tilt on .entry cards.
   Adds a glare overlay and rotates on mousemove. No wrapping, no dependencies. */
(function () {
  'use strict';
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var MAX_DEG = 6, cards = document.querySelectorAll('.entry');
  if (!cards.length) return;

  cards.forEach(function (card) {
    var glare = document.createElement('div');
    glare.className = 'tilt-glare';
    card.appendChild(glare);

    card.addEventListener('mousemove', function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      var ry = (px - 0.5) * MAX_DEG * 2;
      var rx = (0.5 - py) * MAX_DEG * 2;
      card.style.transform = 'perspective(800px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) scale(1.012)';
      glare.style.setProperty('--gx', (px * 100) + '%');
      glare.style.setProperty('--gy', (py * 100) + '%');
    });

    card.addEventListener('mouseleave', function () {
      card.style.transform = '';
    });
  });
})();
