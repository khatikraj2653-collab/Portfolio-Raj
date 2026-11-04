/* 3D scroll-reveal stagger.
   Adds incremental transition-delay to consecutive .reveal
   siblings so they cascade in instead of firing together. */
(function () {
  'use strict';
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var lists = document.querySelectorAll('.entry-list, .paper-list, .research-grid, .cert-cols');
  [].slice.call(lists).forEach(function (list) {
    var items = [].slice.call(list.querySelectorAll('.reveal'));
    items.forEach(function (el, i) {
      el.style.transitionDelay = (i * 0.09) + 's';
    });
  });
})();
