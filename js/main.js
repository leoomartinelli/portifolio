/* ==========================================================================
   Leonardo Martinelli — Portfólio 2026
   Sem dependências. Um único loop de rAF lê o scroll e escreve variáveis CSS
   (--hp, --f, --cp, …); o CSS cuida do resto. Leituras de layout acontecem
   antes de qualquer escrita para evitar layout thrashing.
   ========================================================================== */
(() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const root = document.documentElement;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  let vw = innerWidth;
  let vh = innerHeight;

  /* ------------------------------------------------------------------------
     Estado compartilhado
     ------------------------------------------------------------------------ */
  const mouse = { x: 0, y: 0, nx: 0, ny: 0 };   // px e normalizado (-1..1)
  let mx = 0, my = 0;                            // versão suavizada de nx/ny
  let lastY = scrollY, vel = 0, isFast = false;

  /* ------------------------------------------------------------------------
     Loader (claquete)
     ------------------------------------------------------------------------ */
  function boot() {
    const loader = $('.loader');
    if (!loader) return root.classList.add('is-loaded');
    if (reduced) { loader.remove(); return root.classList.add('is-loaded'); }

    const num = $('#ldNum');
    const t0 = performance.now();
    const DUR = 1500;
    let loaded = document.readyState === 'complete';
    addEventListener('load', () => { loaded = true; }, { once: true });

    const finish = () => {
      loader.classList.add('is-out');
      root.classList.add('is-loaded');
      setTimeout(() => loader.remove(), 1300);
    };

    (function tick(now) {
      const k = clamp((now - t0) / DUR);
      const e = 1 - Math.pow(1 - k, 3);
      num.textContent = pad(Math.round(e * 100), 3);
      loader.style.setProperty('--k', e.toFixed(3));
      if (k < 1 || !loaded) return requestAnimationFrame(tick);
      finish();
    })(t0);

    setTimeout(() => { if (!root.classList.contains('is-loaded')) finish(); }, 6000); // failsafe
  }

  /* ------------------------------------------------------------------------
     Helpers de DOM
     ------------------------------------------------------------------------ */
  // quebra um texto em <span class="w"> por palavra, preservando <em> internos
  function splitWords(el) {
    const out = [];
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) return frag.append(' ');
            const s = document.createElement('span');
            s.className = 'w';
            s.textContent = part;
            frag.append(s);
            out.push(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    return out;
  }

  // realce de sintaxe mínimo (PHP + JS); devolve as folhas para revelar letra a letra
  const TOKEN = /(\/\/.*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(<\?php)|(\$[A-Za-z_]\w*)|\b(\d+)\b|\b(final|class|private|public|function|return|echo|new|const|async|await)\b|\b(string|int|array)\b|\b([A-Z]\w*)\b|\b([A-Za-z_]\w*)(?=\()/g;
  const TOKEN_CLS = ['tk-c', 'tk-s', 'tk-k', 'tk-v', 'tk-n', 'tk-k', 'tk-t', 'tk-t', 'tk-f'];

  function highlight(pre) {
    const src = pre.textContent;
    const frag = document.createDocumentFragment();
    const leaves = [];
    const push = (txt, cls) => {
      if (!txt) return;
      const el = document.createElement('span');
      if (cls) el.className = cls;
      el.textContent = txt;
      frag.append(el);
      leaves.push({ el, txt, cur: txt.length });
    };
    let last = 0, m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(src))) {
      push(src.slice(last, m.index));
      push(m[0], TOKEN_CLS[m.slice(1).findIndex(Boolean)]);
      last = TOKEN.lastIndex;
    }
    push(src.slice(last));
    pre.textContent = '';
    pre.append(frag);
    return { pre, leaves, total: src.length, shown: src.length, lines: src.split('\n').length };
  }

  /* ------------------------------------------------------------------------
     Módulos por seção
     ------------------------------------------------------------------------ */
  const scenes = $$('[data-scene]').map((el) => ({ el, name: el.dataset.scene, r: null }));

  /* --- seções "pinned": altura de scroll = tempo da animação --- */
  const pins = $$('.pin').map((el) => ({
    el, stick: $('.pin__stick', el), mode: el.dataset.pin, stickH: 0, r: null,
  }));
  const pinP = (p) => (p.el.offsetHeight - p.stickH > 1 ? clamp(-p.r.top / (p.el.offsetHeight - p.stickH)) : 0);
  const pinById = (id) => pins.find((p) => p.el.id === id);

  /* --- hero --- */
  const hero = $('.hero');
  const nameA = $('.name__a');
  const letters = $$('.ch', nameA);
  letters.forEach((c, i) => c.firstElementChild.style.setProperty('--ci', i));
  let nameW = 1200;

  function measureName() {
    const box = nameA.getBoundingClientRect();
    nameW = box.width;
    nameA.style.setProperty('--W', nameW.toFixed(0));
    letters.forEach((c) => c.firstElementChild.style.setProperty('--lx', (c.getBoundingClientRect().left - box.left).toFixed(1)));
  }

  function updHero(r, y) {
    if (r.bottom < 0) return;
    const hp = clamp(-r.top / r.height);
    hero.style.setProperty('--hp', hp.toFixed(4));
    hero.style.setProperty('--mx', mx.toFixed(4));
    hero.style.setProperty('--my', my.toFixed(4));
    const span = nameW * 1.5;
    nameA.style.setProperty('--shift', (((mx * .5 + .5) * nameW * .55 + y * .4) % span).toFixed(1));
  }

  /* --- fita em X --- */
  const ribbons = $$('.ribbon__row').map((row) => {
    const inner = row.firstElementChild;
    return { row, inner, base: inner.innerHTML, dir: +row.dataset.dir, pos: 0, w: 1 };
  });
  const ribbonEl = $('.ribbon');

  function fillRibbons() {
    ribbons.forEach((r) => {
      r.inner.innerHTML = r.base;
      const one = r.inner.scrollWidth;
      const n = Math.max(1, Math.ceil((vw * 1.4) / Math.max(one, 1)));
      r.inner.innerHTML = r.base.repeat(n * 2);
      const gap = parseFloat(getComputedStyle(r.inner).columnGap) || 0;
      r.w = (r.inner.scrollWidth + gap) / 2;
    });
  }

  function updRibbon(r, dv) {
    if (r.bottom < -50 || r.top > vh + 50) return;
    const sk = clamp(-vel * .18, -5, 5).toFixed(2);
    ribbons.forEach((b) => {
      b.pos = (((b.pos + b.dir * (.8 + Math.abs(dv) * .7)) % b.w) + b.w) % b.w;
      b.inner.style.transform = `translate3d(${(-b.pos).toFixed(1)}px,0,0) skewX(${sk}deg)`;
    });
  }

  /* --- sobre: manifesto que acende palavra por palavra --- */
  const aboutPin = pinById('sobre');
  const manifesto = $('[data-words]');
  const words = manifesto ? splitWords(manifesto) : [];
  let lit = 0;

  function updAbout(p) {
    const n = Math.round(clamp(p / .78) * words.length);
    if (n === lit) return;
    const [a, b] = n > lit ? [lit, n] : [n, lit];
    for (let i = a; i < b; i++) words[i].classList.toggle('lit', i < n);
    lit = n;
  }

  /* --- trajetória: trilho horizontal com scroll vertical --- */
  const film = (() => {
    const pin = pinById('trajetoria');
    if (!pin) return null;
    const track = $('.film__track', pin.el);
    const frames = $$('.frame', track).map((el) => ({ el, x: 0, w: 0 }));
    return { pin, track, frames, max: 0, idx: -1,
      count: $('#filmCount'), stick: pin.stick };
  })();

  function measureFilm() {
    if (!film) return;
    film.max = Math.max(0, film.track.scrollWidth - vw);
    film.frames.forEach((f) => { f.x = f.el.offsetLeft; f.w = f.el.offsetWidth; });
  }

  function updFilm(p) {
    const tx = -p * film.max;
    film.track.style.transform = `translate3d(${tx.toFixed(1)}px,0,0)`;
    film.stick.style.setProperty('--fpg', p.toFixed(4));
    let best = 0, bestD = Infinity;
    film.frames.forEach((f, i) => {
      const d = (f.x + f.w / 2 + tx - vw / 2) / vw;
      f.el.style.setProperty('--fa', clamp(1 - Math.abs(d) * 1.15).toFixed(3));
      f.el.style.setProperty('--fp', d.toFixed(3));
      if (Math.abs(d) < bestD) { bestD = Math.abs(d); best = i; }
    });
    if (best !== film.idx) {
      film.idx = best;
      film.count.textContent = `${pad(best + 1)} / ${pad(film.frames.length)}`;
    }
  }

  /* --- stack: código que se escreve com o scroll --- */
  const stackPin = pinById('stack');
  const editors = $$('.ed pre').map(highlight);
  const maxLines = Math.max(...editors.map((e) => e.lines));
  editors.forEach((e) => { e.pre.style.minHeight = `${maxLines * 1.7}em`; });
  const caret = Object.assign(document.createElement('span'), { className: 'caret' });
  const tabs = $$('.ed__tabs b');
  const skills = $$('.skill');
  const outEl = $('[data-out]');
  const promptEl = $('[data-prompt]');
  const PROMPTS = ['$ php leonardo.php', '$ node leonardo.js'];
  let activeTab = -1;

  function reveal(ed, prog) {
    const n = Math.round(clamp(prog) * ed.total);
    if (n === ed.shown) return;
    ed.shown = n;
    let left = n, tail = null;
    for (const lf of ed.leaves) {
      const take = clamp(left, 0, lf.txt.length);
      if (take !== lf.cur) { lf.el.textContent = lf.txt.slice(0, take); lf.cur = take; }
      if (take > 0) tail = lf.el;
      left -= take;
    }
    if (n < ed.total && tail) tail.after(caret); else caret.remove();
  }

  function updStack(p) {
    const progs = [clamp(p / .44), clamp((p - .5) / .44)];
    const tab = p < .5 ? 0 : 1;
    editors.forEach((ed, i) => reveal(ed, progs[i]));
    if (tab !== activeTab) {
      activeTab = tab;
      editors.forEach((ed, i) => { ed.pre.hidden = i !== tab; });
      tabs.forEach((t, i) => t.classList.toggle('is-on', i === tab));
      skills.forEach((s, i) => s.classList.toggle('is-on', i === tab));
      promptEl.textContent = PROMPTS[tab];
    }
    skills.forEach((s, i) => s.style.setProperty('--sp', progs[i].toFixed(3)));
    const done = progs[tab] >= .995;
    outEl.classList.toggle('on', done);
    if (done) outEl.textContent = outEl.dataset[`out${tab}`];
  }

  /* --- lente: foco puxado + visor --- */
  const lensPin = pinById('lente');
  const lensEl = lensPin && lensPin.el;
  const ISO = [100, 200, 400, 800, 1600, 3200];
  const AP = ['1.4', '2', '2.8', '4', '5.6', '8', '11'];
  const SH = ['1/30', '1/60', '1/125', '1/250', '1/500', '1/1000'];
  const vf = {
    tc: $('#vfTc'), iso: $('#vfIso'), ap: $('#vfAp'), sh: $('#vfSh'),
    ret: $('#vfRet'), focus: $('#vfFocus'), hist: $('#vfHist'), last: {},
  };
  let histAt = 0;

  (function buildLens() {
    const bokeh = $('.lens__bokeh');
    if (!bokeh) return;
    let s = 42;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const COLORS = ['255,74,28', '255,138,76', '143,211,255', '238,232,222', '255,74,28', '255,138,76'];
    for (let i = 0; i < 22; i++) {
      const b = document.createElement('i');
      const size = 50 + rnd() * 230;
      b.className = 'bk';
      b.style.cssText = `width:${size.toFixed(0)}px;height:${size.toFixed(0)}px;left:${(rnd() * 100).toFixed(1)}%;top:${(rnd() * 100).toFixed(1)}%;--c:${COLORS[i % COLORS.length]};--bs:${(.3 + rnd() * 1.6).toFixed(2)}`;
      bokeh.append(b);
    }
    for (let i = 0; i < 18; i++) vf.hist.append(document.createElement('i'));
  })();

  const setText = (key, el, val) => { if (vf.last[key] !== val) { vf.last[key] = val; el.textContent = val; } };

  function updLens(p, now) {
    const f = clamp((p - .06) / .58);
    lensEl.style.setProperty('--f', f.toFixed(4));
    lensEl.style.setProperty('--lp', p.toFixed(4));
    setText('iso', vf.iso, ISO[Math.min(ISO.length - 1, Math.floor(p * ISO.length))]);
    setText('ap', vf.ap, AP[Math.min(AP.length - 1, Math.floor(p * AP.length))]);
    setText('sh', vf.sh, SH[Math.min(SH.length - 1, Math.floor(p * SH.length))]);
    const ok = f > .93;
    vf.ret.classList.toggle('is-ok', ok);
    setText('focus', vf.focus, ok ? 'Foco ok' : f > .4 ? 'Ajustando…' : 'Sem foco');
    setText('tc', vf.tc, `00:00:${pad(Math.floor(p * 59))}:${pad(Math.floor((now / 1000) * 24) % 24)}`);
    if (now - histAt > 90) {
      histAt = now;
      [...vf.hist.children].forEach((b, i) => {
        const base = Math.sin(i * .55 + p * 7) * .5 + .5;
        b.style.setProperty('--h', `${(12 + 88 * base * (.55 + Math.random() * .45)).toFixed(0)}%`);
      });
    }
  }

  /* --- contato --- */
  const contact = $('.contact');
  function updContact(r) {
    if (r.top > vh) return root.classList.remove('at-end');
    const cp = clamp((vh - r.top) / (vh * .85));
    contact.style.setProperty('--cp', cp.toFixed(4));
    root.classList.toggle('at-end', cp > .7);
  }

  /* --- HUD fixo --- */
  const hudTc = $('#hudTc');
  const hudScene = $('#hudScene');
  let sceneNow = '';
  function updHud(y, now) {
    const total = Math.max(1, document.documentElement.scrollHeight - vh);
    const secs = Math.floor((y / total) * 119);
    const ff = Math.floor((now / 1000) * 24) % 24;
    hudTc.textContent = `00:${pad(Math.floor(secs / 60))}:${pad(secs % 60)}:${pad(ff)}`;
    let cur = scenes[0].name;
    for (const s of scenes) if (s.r.top <= vh * .5) cur = s.name;
    if (cur !== sceneNow) { sceneNow = cur; hudScene.textContent = cur; }
  }

  /* ------------------------------------------------------------------------
     Layout / medidas
     ------------------------------------------------------------------------ */
  function measure() {
    vw = innerWidth;
    vh = innerHeight;
    if (!reduced) {
      pins.forEach((p) => {
        p.stickH = p.stick.offsetHeight;
        const h = p.mode === 'film' ? 0 : (parseFloat(p.mode) / 100) * p.stickH;
        if (p.mode !== 'film') p.el.style.setProperty('--pin-h', `${h}px`);
      });
      measureFilm();
      if (film) film.pin.el.style.setProperty('--pin-h', `${film.max + film.pin.stickH}px`);
    }
    fillRibbons();
    measureName();
  }

  let resizeQ = 0;
  addEventListener('resize', () => { cancelAnimationFrame(resizeQ); resizeQ = requestAnimationFrame(measure); });

  /* ------------------------------------------------------------------------
     Loop principal
     ------------------------------------------------------------------------ */
  const heroScene = scenes.find((s) => s.el === hero);
  const contactScene = scenes.find((s) => s.el === contact);
  const ribbonScene = { el: ribbonEl, r: null };

  function frame(now) {
    const y = scrollY;
    const dv = y - lastY;
    lastY = y;
    vel = lerp(vel, dv, .18);

    // ---- leituras ----
    scenes.forEach((s) => { s.r = s.el.getBoundingClientRect(); });
    ribbonScene.r = ribbonEl.getBoundingClientRect();
    pins.forEach((p) => { p.r = p.el.getBoundingClientRect(); });

    // ---- escritas ----
    if (!fine) {
      mouse.nx = Math.sin(now / 2600) * .45;
      mouse.ny = Math.cos(now / 3100) * .25;
    }
    mx = lerp(mx, mouse.nx, .06);
    my = lerp(my, mouse.ny, .06);

    const fast = Math.abs(vel) > 3.4;
    if (fast !== isFast) { isFast = fast; root.classList.toggle('is-fast', fast); }
    if (fast) root.style.setProperty('--rgb', Math.min(12, Math.abs(vel) * .32).toFixed(2));

    updHero(heroScene.r, y);
    updRibbon(ribbonScene.r, dv);
    updHud(y, now);
    updContact(contactScene.r);

    const near = (p) => p.r.bottom > -vh * .3 && p.r.top < vh * 1.3;
    if (near(aboutPin)) updAbout(pinP(aboutPin));
    if (film && near(film.pin)) updFilm(pinP(film.pin));
    if (near(stackPin)) updStack(pinP(stackPin));
    if (near(lensPin)) updLens(pinP(lensPin), now);

    cursorFrame();
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------------
     Cursor em forma de visor + magnetismo
     ------------------------------------------------------------------------ */
  const cur = $('.cur');
  const curLb = $('.cur__lb');
  const magnets = $$('.magnet').map((el) => ({ el, x: 0, y: 0, tx: 0, ty: 0 }));
  let cx = -100, cy = -100;
  if (fine && !reduced) root.classList.add('has-cur');

  function cursorFrame() {
    magnets.forEach((m) => {
      m.x = lerp(m.x, m.tx, .18);
      m.y = lerp(m.y, m.ty, .18);
      m.el.style.transform = `translate3d(${m.x.toFixed(2)}px,${m.y.toFixed(2)}px,0)`;
    });
    if (!fine || reduced) return;
    cx = lerp(cx, mouse.x, .25);
    cy = lerp(cy, mouse.y, .25);
    cur.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
  }

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mouse.x = e.clientX; mouse.y = e.clientY;
    mouse.nx = (e.clientX / vw - .5) * 2;
    mouse.ny = (e.clientY / vh - .5) * 2;
    if (fine && !reduced) {
      const t = e.target.closest && e.target.closest('a,button,[data-cursor]');
      cur.classList.toggle('is-hover', !!t);
      if (t) curLb.textContent = t.dataset.cursor || '';
    }
    magnets.forEach((m) => {
      const r = m.el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2 - m.x);
      const dy = e.clientY - (r.top + r.height / 2 - m.y);
      const near = Math.hypot(dx, dy) < Math.max(r.width, 120);
      m.tx = near ? dx * .28 : 0;
      m.ty = near ? dy * .28 : 0;
    });
  }, { passive: true });
  addEventListener('pointerdown', () => cur && cur.classList.add('is-down'));
  addEventListener('pointerup', () => cur && cur.classList.remove('is-down'));
  document.addEventListener('mouseleave', () => { mouse.nx = 0; mouse.ny = 0; });

  /* ------------------------------------------------------------------------
     Pôsteres com inclinação 3D
     ------------------------------------------------------------------------ */
  $$('.poster').forEach((p) => {
    if (!fine) return;
    p.addEventListener('pointermove', (e) => {
      const r = p.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      p.classList.add('is-tilt');
      p.style.setProperty('--ry', `${((px - .5) * 14).toFixed(2)}deg`);
      p.style.setProperty('--rx', `${((.5 - py) * 14).toFixed(2)}deg`);
      p.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
      p.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
    });
    p.addEventListener('pointerleave', () => {
      p.classList.remove('is-tilt');
      p.style.setProperty('--ry', '0deg');
      p.style.setProperty('--rx', '0deg');
    });
  });

  /* ------------------------------------------------------------------------
     Revelações, contadores, menu, relógio
     ------------------------------------------------------------------------ */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { threshold: .15, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]').forEach((el, i) => { el.style.setProperty('--i', i % 3); io.observe(el); });

  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const el = e.target, to = +el.dataset.count, t0 = performance.now();
      (function step(now) {
        const k = clamp((now - t0) / 1400);
        el.textContent = Math.round(to * (1 - Math.pow(1 - k, 4)));
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    });
  }, { threshold: .6 });
  if (!reduced) $$('[data-count]').forEach((el) => { el.textContent = '0'; countIO.observe(el); });

  const menuBtn = $('.nav__menu');
  const menu = $('#menu');
  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? 'Fechar' : 'Menu';
    root.classList.toggle('menu-open', open);
  }
  menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  const clock = $('#clock');
  const fmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  const tickClock = () => { clock.textContent = fmt.format(new Date()); };
  tickClock();
  setInterval(tickClock, 20000);

  /* ------------------------------------------------------------------------
     Partida
     ------------------------------------------------------------------------ */
  boot();
  measure();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  addEventListener('load', measure);

  if (reduced) {
    // estado final, sem animação
    updAbout(1);
    editors.forEach((ed) => { reveal(ed, 1); ed.pre.hidden = false; });
    outEl.textContent = outEl.dataset.out0;
    outEl.classList.add('on');
    lensEl && (lensEl.style.setProperty('--f', 1), lensEl.style.setProperty('--lp', .5));
    updContact({ top: 0 });
    hero.style.setProperty('--mx', 0);
  } else {
    requestAnimationFrame(frame);
  }
})();
