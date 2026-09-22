/* EDU SEF — estudo de caso: só revelação suave ao rolar. Página leve, sem
   dependências, sem o motor de scroll pesado do portfólio principal. */
(() => {
  'use strict';
  const els = [...document.querySelectorAll('[data-reveal]')];
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { threshold: .15, rootMargin: '0px 0px -8% 0px' });
  els.forEach((el, i) => { el.style.setProperty('--i', i % 5); io.observe(el); });
})();
