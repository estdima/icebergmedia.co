/* Iceberg Media, icebergmedia.co
   The dive (pinned hero scene), button scrolls that glide through it, reveals, FAQ, sample ad videos and the contact form.
   Every part also works without this file: the page is then one still hero and plain sections. */
(() => {
  'use strict';

  /* Google Apps Script web app that saves each enquiry to the leads sheet and sends the Thanks email.
     Its /exec URL (see README.md). If this is ever left empty, the form opens a pre-filled email instead. */
  const FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx7N1-xY9TWDVgGRzZ_6G2Z09bMYGWSb-3dHD-hfCo8MRjAAvRhhQ32cl1W55fKdbLXzQ/exec';
  const CONTACT_EMAIL = 'dimitrius@icebergmedia.co';

  const root = document.documentElement;
  const $ = (id) => document.getElementById(id);
  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // accelerate, then decelerate
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const tryRun = (fn) => {
    try { fn(); return true; } catch (err) { if (window.console) console.error(err); return false; }
  };

  root.classList.add('ready');
  if (!reduce) root.classList.add('anim');

  /* ------------------------------------------------------------------ the dive */

  const IMG = { ox: 0.655, wl: 0.497, peak: 0.247 }; // iceberg centre x, waterline y, peak y (fractions of the square photo)
  const D = {};
  let G = null; // geometry for the current screen size
  let p = 0; // 0 = hero, 1 = the dive's last frame

  // When each part of the dive moves, as fractions of the dive. render() and diveCss() both read these.
  const K = {
    sink: 0.82, // the camera sinks (accelerating, then slowing) until here, then holds
    blurMid: 0.36, // the brief blur peaks when the waterline is 36% down the screen...
    blurHalf: 0.2, // ...and is gone 20% of the screen either side
    textFade: [0.22, 0.32], // the hero text fades out
    textRise: 0.35, // by here the hero text has risen by its own height
    line: [0.8, 0.95], // "Below every great ad is the work you don't see." rises in
    lineRise: 40, // from 40px lower
    hint: 0.05, // the Scroll hint fades
  };

  // Browsers with scroll timelines (Chrome, Edge, Samsung Internet, Safari 26 and later) play the dive in CSS, tied to
  // the scroll by the browser itself. That stays smooth where scripts are held to 30 frames a second: an iPhone in Low
  // Power Mode, or the page shown inside another site, like a preview. Other browsers get the same frames from render().
  const SDA = !reduce && !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()') && CSS.supports('animation-range', '0px 1px'));

  // Scroll progress through the dive. Positions are measured in layout(), so a frame only reads scrollY.
  function measureP() {
    return G && G.total > 0 ? clamp((window.scrollY - G.top) / G.total) : 0;
  }

  function layout() {
    const W = D.stage.clientWidth;
    const HL = D.stage.clientHeight; // painted height (large viewport on phones)
    const H = Math.min(HL, D.probe.offsetHeight || HL); // composed height (small viewport: always visible)
    const headH = D.header ? D.header.offsetHeight : 72;
    const narrow = W < 760;
    const k = IMG.wl - IMG.peak;

    // Waterline 76% down, photo at least 12px wider than the screen on both sides (so the blur never shows an edge).
    let wlY = 0.76 * H;
    let S = Math.max(W + 24, wlY / IMG.wl);

    // Keep the peak below the header, and on phones (iceberg centred under the text) below the hero buttons.
    let minPeak = headH + 0.05 * H;
    if (narrow) minPeak = Math.max(minPeak, D.heroText.offsetTop + D.heroText.offsetHeight + 24);
    if (wlY - k * S < minPeak) {
      let need = minPeak + k * (W + 24);
      if (need / IMG.wl > W + 24) need = minPeak / (1 - k / IMG.wl);
      wlY = Math.min(0.9 * H, need);
      S = Math.max(W + 24, wlY / IMG.wl);
    }

    const T = wlY - IMG.wl * S;
    const ox = IMG.ox * S;
    const oy = IMG.wl * S;
    const cx = narrow ? 0.5 * W : 0.655 * W;
    const L = Math.min(-12, Math.max(W + 12 - S, cx - ox));

    // No zoom, no sideways move: the camera only sinks, until the waterline is hidden under the header
    // (or further, so the photo's navy bottom reaches the bottom of the screen).
    const target = Math.min(0.06 * H, headH - 16);
    const tyEnd = Math.min(target - (T + oy), HL - (T + S));

    G = {
      W, H, HL, S, T, L, oy, tyEnd,
      top: D.sec.getBoundingClientRect().top + window.scrollY,
      total: D.sec.offsetHeight - D.stage.offsetHeight,
    };

    D.scene.style.left = L.toFixed(1) + 'px';
    D.scene.style.top = T.toFixed(1) + 'px';
    D.scene.style.width = S.toFixed(1) + 'px';
    D.scene.style.height = S.toFixed(1) + 'px';
    D.line.style.top = (0.74 * H).toFixed(1) + 'px';
    if (SDA) diveCss();
  }

  // The camera's offset and the waterline's height (fraction of the screen) at a point q of the dive.
  const camAt = (q) => ease(clamp(q / K.sink)) * G.tyEnd;
  const waterAt = (q) => (G.T + G.oy + camAt(q)) / G.H;
  const blurAt = (q) => Math.max(0, 1 - Math.abs(waterAt(q) - K.blurMid) / K.blurHalf); // brief blur mid-dive only

  function render() {
    if (!G || SDA) return;
    D.scene.style.transform = 'translate3d(0,' + camAt(p).toFixed(1) + 'px,0)';
    if (D.blur) D.blur.style.opacity = reduce ? '0' : blurAt(p).toFixed(3);

    // Hero text sits in the sky and scrolls up with the photo (parallax), fading as it goes.
    const text = 1 - clamp((p - K.textFade[0]) / (K.textFade[1] - K.textFade[0]));
    D.hero.style.opacity = text.toFixed(3);
    D.hero.style.transform = 'translate3d(0,' + (-100 * clamp(p / K.textRise)).toFixed(2) + '%,0)';
    D.hero.style.pointerEvents = text < 0.2 ? 'none' : '';
    D.hero.style.visibility = text <= 0 ? 'hidden' : '';

    // "Below every great ad is the work you don't see." rises in at the end.
    const line = clamp((p - K.line[0]) / (K.line[1] - K.line[0]));
    D.lineP.style.opacity = line.toFixed(3);
    D.lineP.style.transform = 'translate3d(0,' + (K.lineRise * (1 - line)).toFixed(1) + 'px,0)';

    D.hint.style.opacity = (1 - clamp(p / K.hint)).toFixed(3);
  }

  // The same dive as CSS keyframes on the page's scroll timeline, over the scroll range of the dive.
  // Rewritten only when the screen size changes the geometry.
  function diveCss() {
    const pc = (q) => +(100 * clamp(q)).toFixed(4) + '%';
    const px = (v) => +v.toFixed(2) + 'px';
    const move = (y) => 'transform:translate3d(0,' + y + ',0)';

    // The camera: ease() is x³ and then its mirror image, which two cubic-bezier halves draw exactly.
    let css = '@keyframes dive-cam{0%{' + move('0px') + ';animation-timing-function:cubic-bezier(.3333,0,.6667,0)}'
      + pc(K.sink / 2) + '{' + move(px(G.tyEnd / 2)) + ';animation-timing-function:cubic-bezier(.3333,1,.6667,1)}'
      + pc(K.sink) + ',100%{' + move(px(G.tyEnd)) + '}}';

    // The blur: where the waterline passes 56%, 36% and 16% of the screen (it only rises), with points in between.
    const cross = (v) => {
      if (waterAt(0) <= v) return 0;
      if (waterAt(K.sink) > v) return K.sink;
      let lo = 0;
      let hi = K.sink;
      for (let i = 0; i < 40; i++) {
        const m = (lo + hi) / 2;
        if (waterAt(m) > v) lo = m;
        else hi = m;
      }
      return (lo + hi) / 2;
    };
    const q0 = cross(K.blurMid + K.blurHalf);
    const q1 = cross(K.blurMid);
    const q2 = cross(K.blurMid - K.blurHalf);
    const qs = [0];
    for (let i = 0; i <= 12; i++) qs.push(q0 + ((q1 - q0) * i) / 12);
    for (let i = 1; i <= 12; i++) qs.push(q1 + ((q2 - q1) * i) / 12);
    qs.push(1);
    css += '@keyframes dive-blur{' + qs.map((q) => pc(q) + '{opacity:' + +blurAt(q).toFixed(4) + '}').join('') + '}';

    css += '@keyframes dive-text{0%{opacity:1;visibility:visible;' + move('0px') + '}'
      + pc(K.textFade[0]) + '{opacity:1}'
      + pc(K.textFade[1]) + '{opacity:0;visibility:hidden}'
      + pc(K.textRise) + ',100%{opacity:0;visibility:hidden;' + move('-100%') + '}}';
    css += '@keyframes dive-line{0%,' + pc(K.line[0]) + '{opacity:0;' + move(K.lineRise + 'px') + '}'
      + pc(K.line[1]) + ',100%{opacity:1;' + move('0px') + '}}';
    css += '@keyframes dive-hint{0%{opacity:1}' + pc(K.hint) + ',100%{opacity:0}}';

    const run = (name) => '{animation:' + name + ' linear both;animation-timeline:scroll(root);animation-range:'
      + px(G.top) + ' ' + px(G.top + G.total) + '}';
    css += '.anim #dive-scene' + run('dive-cam') + '.anim #dive-blur' + run('dive-blur') + '.anim #hero' + run('dive-text')
      + '.anim #dive-line p' + run('dive-line') + '.anim #scroll-hint' + run('dive-hint');

    if (!D.css) {
      D.css = document.createElement('style');
      D.css.id = 'dive-css';
      document.head.appendChild(D.css);
    }
    if (D.css.textContent !== css) D.css.textContent = css;
  }

  // Draw the dive for the current scroll position (only when it changed).
  function syncDive() {
    if (!G || SDA) return;
    const np = measureP();
    if (np !== p) {
      p = np;
      render();
    }
  }

  function initDive() {
    D.sec = $('dive');
    D.stage = $('dive-stage');
    D.scene = $('dive-scene');
    D.img = $('dive-img');
    D.blur = $('dive-blur');
    D.hero = $('hero');
    D.heroText = $('hero-text');
    D.line = $('dive-line');
    D.lineP = D.line.querySelector('p');
    D.hint = $('scroll-hint');
    D.header = document.querySelector('.site-header');

    D.probe = document.createElement('div');
    D.probe.setAttribute('aria-hidden', 'true');
    D.probe.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
    D.stage.appendChild(D.probe);

    layout();
    p = measureP();
    render();

    let raf = 0;
    const frame = () => {
      raf = 0;
      syncDive();
    };
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(frame); }, { passive: true });

    let rraf = 0;
    const relayout = () => {
      rraf = 0;
      layout();
      p = measureP();
      render();
    };
    window.addEventListener('resize', () => { if (!rraf) rraf = requestAnimationFrame(relayout); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
    window.addEventListener('load', relayout);
  }

  /* ------------------------------------------------------------------ reveals */

  let io = null;

  function initReveals() {
    const items = document.querySelectorAll('.reveal');
    if (!root.classList.contains('anim') || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('in'));
      return;
    }
    io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    items.forEach((el) => io.observe(el));
  }

  // A button scroll skips the fade-ins: every section it passes, and the screen it lands on, is simply there.
  function revealBetween(from, to) {
    const lo = Math.min(from, to);
    const hi = Math.max(from, to) + window.innerHeight;
    const shown = [];
    document.querySelectorAll('.reveal:not(.in)').forEach((el) => {
      const r = el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      const bottom = r.bottom + window.scrollY;
      if (bottom > lo && top < hi) {
        if (io) io.unobserve(el);
        el.classList.add('now', 'in');
        shown.push(el);
      }
    });
    if (shown.length) {
      void shown[0].offsetHeight;
      shown.forEach((el) => el.classList.remove('now'));
    }
  }

  /* ------------------------------------------------------------------ button scrolls */

  // A button scroll glides to its section, accelerating, then decelerating. When the way passes through the dive,
  // the dive plays on the way, like a quick scroll: the whole dive takes DIVE_MS, then the glide carries on.
  const DIVE_MS = 1300;

  let tok = 0;
  let gliding = false;

  // The header underline (set up in initNav). While a button glides somewhere, that link stays underlined,
  // and it stays on where the glide landed until the page is scrolled by hand.
  const spy = { held: false, id: null, endY: null, update() {} };
  const holdNav = (id) => {
    spy.held = true;
    spy.id = id;
    spy.endY = null;
    spy.update();
  };
  const landNav = () => {
    spy.endY = window.scrollY;
    spy.update();
  };
  const releaseNav = () => {
    spy.held = false;
    spy.endY = null;
    spy.update();
  };

  const stopGlide = () => {
    if (gliding) {
      tok++;
      gliding = false;
      releaseNav();
    }
  };
  window.addEventListener('wheel', stopGlide, { passive: true });
  window.addEventListener('touchstart', stopGlide, { passive: true });
  window.addEventListener('keydown', stopGlide);

  const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  // The scroll position after a given number of milliseconds, and how long the whole glide takes.
  function planGlide(from, to) {
    const dist = to - from;
    const plain = () => {
      const dur = Math.min(1800, Math.max(800, Math.abs(dist) * 0.4));
      return { dur, at: (ms) => from + dist * ease(clamp(ms / dur)) };
    };
    if (!G || G.total <= 0) return plain();
    const a = G.top;
    const b = G.top + G.total;
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    if (Math.min(hi, b) - Math.max(lo, a) < 0.03 * G.total) return plain();

    // Split the way at the dive's edges, in the order it is travelled: the part inside the dive plays at the dive's
    // pace, the rest glides at the normal pace (0.6 to 1.2 s).
    const cuts = [a, b].filter((x) => x > lo + 1 && x < hi - 1);
    const pts = [from].concat(dist > 0 ? cuts : cuts.reverse(), [to]);
    const parts = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const len = Math.abs(pts[i + 1] - pts[i]);
      const mid = (pts[i] + pts[i + 1]) / 2;
      const inside = mid >= a && mid <= b;
      const T = inside ? Math.max(300, (DIVE_MS * len) / G.total) : Math.min(1200, Math.max(600, len * 0.4));
      parts.push({ d: pts[i + 1] - pts[i], T, t0: 0 });
    }
    // Each part starts while the one before is still slowing down, so the glide never comes to a halt halfway.
    let t = 0;
    parts.forEach((pt, i) => {
      pt.t0 = t;
      if (parts[i + 1]) t += pt.T - 0.3 * Math.min(pt.T, parts[i + 1].T);
    });
    const last = parts[parts.length - 1];
    return {
      dur: last.t0 + last.T,
      at: (ms) => parts.reduce((y, pt) => y + pt.d * ease(clamp((ms - pt.t0) / pt.T)), from),
    };
  }

  function glide(from, to, my, done) {
    if (Math.abs(to - from) < 1) {
      if (done) done();
      return;
    }
    const plan = planGlide(from, to);
    const t0 = performance.now();
    gliding = true;
    const step = (now) => {
      if (my !== tok) return;
      const ms = Math.min(plan.dur, now - t0);
      window.scrollTo(0, plan.at(ms));
      syncDive(); // the dive's frame for exactly this position, painted together with it
      syncBubbles();
      if (ms < plan.dur) requestAnimationFrame(step);
      else {
        gliding = false;
        if (done) done();
      }
    };
    requestAnimationFrame(step);
  }

  // Fetch and decode the Contact photo before a glide reaches it.
  function warmContact() {
    const im = document.querySelector('#contact-photo img');
    if (!im || im.dataset.warm) return;
    im.dataset.warm = '1';
    im.loading = 'eager';
    if (im.decode) im.decode().catch(() => {});
  }

  function goTo(id) {
    if (id === 'book') warmContact();
    const el = id === 'top' ? null : $(id);
    if (id !== 'top' && !el) return;
    const start = window.scrollY;
    // Sections land just below the fixed header; Contact starts with its own sky band, so it lands at the top.
    const header = document.querySelector('.site-header');
    const offset = el && id !== 'book' && header ? header.offsetHeight : 0;
    const end = el ? Math.max(0, Math.min(maxScroll(), el.getBoundingClientRect().top + start - offset)) : 0;
    const done = () => {
      landNav();
      if (el) el.focus({ preventScroll: true });
    };

    holdNav(id);
    revealBetween(start, end);

    if (reduce || !G) {
      window.scrollTo(0, end);
      done();
      return;
    }
    glide(start, end, ++tok, done);
  }

  function initScrollLinks() {
    // Load the Contact photo once the page is idle, so it is ready before anyone scrolls to it.
    window.addEventListener('load', () => {
      const later = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
      later(warmContact);
    });
    document.addEventListener('click', (e) => {
      const a = e.target.closest ? e.target.closest('a[data-scroll]') : null;
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const id = a.getAttribute('data-scroll') || (a.getAttribute('href') || '').replace(/^#/, '');
      if (!id) return;
      e.preventDefault();
      goTo(id);
    });
  }

  /* ------------------------------------------------------------------ header: underline the section on screen */

  // The section on screen is the last one whose top has passed a line 30% down the screen below the header (at most
  // 240px down, so on tall screens a short section still counts once it reaches the top).
  // Section positions are measured up front and again whenever the page changes size, so a scroll only compares numbers.
  function initNav() {
    const nav = $('site-nav');
    if (!nav) return;
    const links = new Map();
    nav.querySelectorAll('a[href*="#"]').forEach((a) => links.set(a.getAttribute('href').split('#')[1], a));
    const ids = ['dive'].concat(Array.from(links.keys())).filter((id) => $(id));
    if (ids.length < 2) return;
    const header = document.querySelector('.site-header');
    let tops = [];
    let headH = 0;
    let current;

    const docTop = (el) => {
      let y = 0;
      for (let n = el; n; n = n.offsetParent) y += n.offsetTop; // ignores transforms, so fade-ins don't shift it
      return y;
    };
    const measure = () => {
      headH = header ? header.offsetHeight : 0;
      tops = ids.map((id) => ({ id, top: docTop($(id)) })).sort((a, b) => a.top - b.top);
    };
    const mark = (id) => {
      if (id === current) return;
      current = id;
      links.forEach((a, key) => {
        if (key === id) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
    };
    const update = () => {
      const y = window.scrollY;
      if (spy.held && spy.endY !== null && Math.abs(y - spy.endY) > 4) {
        spy.held = false; // scrolled by hand since the glide landed
        spy.endY = null;
      }
      if (spy.held) return mark(links.has(spy.id) ? spy.id : null);
      const line = y + headH + Math.min(0.3 * (window.innerHeight - headH), 240);
      let id = null;
      tops.forEach((s) => { if (s.top <= line) id = s.id; });
      if (y > 0 && y >= maxScroll() - 2) id = tops[tops.length - 1].id; // the very bottom shows the last section
      mark(id === 'dive' ? null : id); // nothing is underlined during the dive
    };
    spy.update = update;

    let raf = 0;
    const frame = () => {
      raf = 0;
      update();
    };
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(frame); }, { passive: true });

    const remeasure = () => {
      measure();
      update();
    };
    let rraf = 0;
    window.addEventListener('resize', () => { if (!rraf) rraf = requestAnimationFrame(() => { rraf = 0; remeasure(); }); });
    window.addEventListener('load', remeasure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
    if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(document.body); // e.g. a FAQ answer opening
    remeasure();
  }

  /* ------------------------------------------------------------------ header: slides away while scrolling down */

  // The bar slides up out of view while the page is scrolled down by hand, and back in as soon as it is scrolled up.
  // It stays in view at the very top, while a button glides, and after a glide lands (with its link underlined)
  // until the page is scrolled by hand.
  function initBarHide() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    let headH = 0;
    let max = 0;
    const measure = () => {
      headH = header.offsetHeight;
      max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    };
    let away = false;
    const set = (hide) => {
      if (hide === away) return;
      away = hide;
      header.classList.toggle('away', hide);
    };
    let lastY = window.scrollY;
    let travel = 0; // how far the page has moved in its current direction
    const frame = () => {
      const y = Math.min(Math.max(window.scrollY, 0), max); // ignores the rubber-band bounce at either end
      const dy = y - lastY;
      lastY = y;
      if (gliding || spy.held || y < headH) {
        travel = 0;
        set(false);
        return;
      }
      if (!dy) return;
      if ((dy > 0) !== (travel > 0)) travel = 0;
      travel += dy;
      if (travel > 12) set(true);
      else if (travel < -8) set(false);
    };
    let raf = 0;
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; frame(); }); }, { passive: true });
    header.addEventListener('focusin', () => set(false)); // tabbing to a link brings it back
    let rraf = 0;
    window.addEventListener('resize', () => { if (!rraf) rraf = requestAnimationFrame(() => { rraf = 0; measure(); }); });
    window.addEventListener('load', measure);
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);
    measure();
  }

  /* ------------------------------------------------------------------ bubbles */

  // A few faint bubbles in the empty spots of the deep. Each sits beside an element: x and y are fractions of that
  // element's box, dx and dy pixels added to that, s the size. min and max are the screen widths it shows at.
  // Bigger bubbles are a little brighter and rise a little faster, as if nearer.
  const BUBBLES = [
    // beside the Sample ads heading
    { el: '#ads .section-head', x: 1, y: 0.45, dx: -170, s: 48, min: 900 },
    { el: '#ads .section-head', x: 1, y: 0.62, dx: -48, s: 36, min: 761, max: 899 },
    { el: '#ads .section-head', x: 1, y: 0.95, dx: -280, s: 18, min: 761 },
    { el: '#ads .section-head', x: 1, y: 0.05, dx: -70, s: 11, min: 761 },
    // in the margins beside the row of ads
    { el: '#ads .ads-row', x: 0, y: 0.2, dx: -64, s: 26, min: 1360 },
    { el: '#ads .ads-row', x: 0, y: 0.62, dx: -70, s: 30, min: 1360 },
    { el: '#ads .ads-row', x: 0, y: 0.8, dx: -40, s: 12, min: 1360 },
    { el: '#ads .ads-row', x: 1, y: 0.15, dx: 62, s: 22, min: 1360 },
    { el: '#ads .ads-row', x: 1, y: 0.5, dx: 70, s: 34, min: 1360 },
    { el: '#ads .ads-row', x: 1, y: 0.68, dx: 48, s: 13, min: 1360 },
    // the open water between the ads and How it works
    { el: '#how', x: 0.34, dy: 14, s: 18, min: 761 },
    { el: '#how', x: 0.6, dy: 58, s: 10, min: 761 },
    // beside the How it works heading
    { el: '#how .section-head', x: 1, y: 0.3, dx: -260, s: 40, min: 900 },
    { el: '#how .section-head', x: 1, y: 0.4, dx: -120, s: 34, min: 761, max: 899 },
    { el: '#how .section-head', x: 1, y: -0.4, dx: -150, s: 15, min: 761 },
    // under the three steps
    { el: '#how', x: 0.9, y: 1, dy: -50, s: 22, min: 761 },
    { el: '#how', x: 0.55, y: 1, dy: -28, s: 10, min: 761 },
    // above the guarantee seal
    { el: '#guarantee .g-seal', x: 0.8, dy: -56, s: 20, min: 1200 },
    // right of the guarantee's small print
    { el: '#guarantee .g-act', x: 1, y: 0.2, dx: -110, s: 30, min: 1200 },
    // beside the FAQ heading (tablets), then both sides of the FAQ
    { el: '#faq .section-head', x: 1, y: 0.3, dx: -150, s: 26, min: 761, max: 1279 },
    { el: '#faq', x: 0, dy: 250, dx: -150, s: 54, min: 1280 },
    { el: '#faq', x: 0, dy: 380, dx: -62, s: 20, min: 1280 },
    { el: '#faq', x: 0, dy: 150, dx: -175, s: 12, min: 1280 },
    { el: '#faq', x: 0, dy: 500, dx: -100, s: 16, min: 1280 },
    { el: '#faq', x: 1, dy: 330, dx: 130, s: 34, min: 1280 },
    { el: '#faq', x: 1, dy: 210, dx: 170, s: 14, min: 1280 },
    { el: '#faq', x: 1, dy: 470, dx: 80, s: 20, min: 1280 },
    // phones: the gaps beside short lines and drawings
    { el: '#ads .section-head', x: 1, dy: 0, dx: -34, s: 22, max: 760 },
    { el: '#how', x: 0.5, dy: -40, s: 10, max: 760 },
    { el: '#how', x: 1, dy: 60, dx: -70, s: 30, max: 760 },
    { el: '#how', x: 0, dy: 30, dx: 120, s: 12, max: 760 },
    { el: '#how .step:nth-child(1) .step-art', x: 1, y: 0.45, dx: -60, s: 24, max: 760 },
    { el: '#how .step:nth-child(2) .step-art', x: 1, y: 0.3, dx: -110, s: 14, max: 760 },
    { el: '#how .step:nth-child(3) .step-art', x: 1, y: 0.55, dx: -80, s: 20, max: 760 },
    { el: '#guarantee', x: 0.8, dy: -50, s: 18, max: 760 },
    { el: '#guarantee .g-seal', x: 1, y: 0.4, dx: 110, s: 34, max: 760 },
    { el: '#guarantee .g-seal', x: 1, y: 0.9, dx: 175, s: 12, max: 760 },
    { el: '#faq', x: 0.3, dy: 40, s: 16, max: 760 },
    { el: '#faq .section-head', x: 1, dy: -4, dx: -44, s: 20, max: 760 },
  ];

  // Draws the bubbles' rise for the current scroll position, where CSS can't (browsers without scroll timelines).
  let syncBubbles = () => {};

  function initBubbles() {
    const deep = document.querySelector('.deep');
    if (!deep || !deep.querySelector('#ads')) return;
    const layer = document.createElement('div');
    layer.className = 'bubbles';
    layer.setAttribute('aria-hidden', 'true');
    const list = BUBBLES.map((b) => {
      const img = document.createElement('img');
      img.className = 'bubble';
      img.src = 'assets/img/bubble.svg';
      img.alt = '';
      img.decoding = 'async';
      const t = Math.min(1, b.s / 56);
      img.style.setProperty('--s', b.s + 'px');
      img.style.setProperty('--o', (0.16 + 0.16 * t).toFixed(3));
      img.style.setProperty('--k', (0.18 + 0.32 * t).toFixed(3)); // 1.18 to 1.5 times the page's speed
      layer.appendChild(img);
      return { b, img, k: 0.18 + 0.32 * t, cy: 0, on: false };
    });
    deep.insertBefore(layer, deep.firstChild);

    // Layout position inside .deep (offsets ignore the fade-ins' transforms).
    const offsetIn = (el) => {
      let x = 0, y = 0;
      for (let n = el; n && n !== deep; n = n.offsetParent) {
        x += n.offsetLeft;
        y += n.offsetTop;
      }
      return { x, y };
    };
    const place = () => {
      const w = window.innerWidth;
      const deepTop = deep.getBoundingClientRect().top + window.scrollY;
      list.forEach((o) => {
        const b = o.b;
        const el = deep.querySelector(b.el);
        o.on = !!el && (!b.min || w >= b.min) && (!b.max || w <= b.max);
        o.img.style.display = o.on ? '' : 'none';
        if (!o.on) return;
        const at = offsetIn(el);
        const cx = at.x + (b.x || 0) * el.offsetWidth + (b.dx || 0);
        const cy = at.y + (b.y || 0) * el.offsetHeight + (b.dy || 0);
        o.img.style.left = (cx - b.s / 2).toFixed(1) + 'px';
        o.img.style.top = (cy - b.s / 2).toFixed(1) + 'px';
        o.cy = deepTop + cy;
      });
      syncBubbles();
    };

    // Browsers with scroll timelines rise the bubbles in CSS, on the compositor; the rest get it here, per frame.
    const css = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
    if (root.classList.contains('anim') && !css) {
      syncBubbles = () => {
        const mid = window.scrollY + window.innerHeight / 2;
        list.forEach((o) => {
          if (o.on) o.img.style.transform = 'translate3d(0,' + (o.k * (o.cy - mid)).toFixed(1) + 'px,0)';
        });
      };
      let raf = 0;
      window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; syncBubbles(); }); }, { passive: true });
    }

    let rraf = 0;
    window.addEventListener('resize', () => { if (!rraf) rraf = requestAnimationFrame(() => { rraf = 0; place(); }); });
    window.addEventListener('load', place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    if ('ResizeObserver' in window) new ResizeObserver(place).observe(deep); // e.g. a FAQ answer opening
    place();
  }

  /* ------------------------------------------------------------------ FAQ */

  function initFaq() {
    const qs = Array.from(document.querySelectorAll('.faq-q'));
    const set = (btn, open) => {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      const a = $(btn.getAttribute('aria-controls'));
      if (!a) return;
      a.classList.toggle('open', open);
      if (open) a.removeAttribute('aria-hidden');
      else a.setAttribute('aria-hidden', 'true');
    };
    qs.forEach((btn) => {
      set(btn, btn.getAttribute('aria-expanded') === 'true');
      btn.addEventListener('click', () => {
        const wasOpen = btn.getAttribute('aria-expanded') === 'true';
        qs.forEach((b) => set(b, false));
        if (!wasOpen) set(btn, true);
      });
    });
  }

  /* ------------------------------------------------------------------ sample ad videos
     Each ad is a <figure class="ad" data-video="assets/ads/name.mp4" data-poster="assets/ads/name.jpg">.
     Videos load when they come near the screen, play muted while visible and pause when not.
     Tap a video (or its speaker button) to hear it; only one ad plays sound at a time. */

  function initAds() {
    const figs = Array.from(document.querySelectorAll('.ad[data-video]')).filter((f) => f.getAttribute('data-video'));
    if (!figs.length) return;
    const all = [];

    const setSound = (item, on) => {
      item.video.muted = !on;
      item.fig.classList.toggle('has-sound', on);
      item.btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      item.btn.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
    };
    const toggle = (item) => {
      const on = item.video.muted;
      all.forEach((other) => { if (other !== item) setSound(other, false); });
      setSound(item, on);
      if (on && item.video.paused) item.video.play().catch(() => {});
    };
    const load = (item) => {
      if (item.loaded) return;
      item.loaded = true;
      item.video.src = item.src;
      item.video.load();
    };

    figs.forEach((fig) => {
      const media = fig.querySelector('.ad-media');
      const btn = fig.querySelector('.ad-sound');
      const card = fig.nextElementSibling;
      const title = card && card.querySelector('.card-title') ? card.querySelector('.card-title').textContent : 'Sample';
      const v = document.createElement('video');
      v.muted = true;
      v.defaultMuted = true;
      v.loop = true;
      v.playsInline = true;
      v.setAttribute('muted', '');
      v.setAttribute('playsinline', '');
      v.preload = 'none';
      v.setAttribute('aria-label', title + ' sample ad');
      const poster = fig.getAttribute('data-poster');
      if (poster) {
        v.poster = poster;
        const ph = media.querySelector('.ad-ph');
        if (ph) ph.remove(); // the cover frame shows straight away
      }
      if (reduce) v.controls = true; // no autoplay with reduced motion: the viewer starts it
      media.insertBefore(v, media.firstChild);

      // Phones get the smaller copy of a video when there is one.
      const small = window.innerWidth <= 760 && fig.getAttribute('data-video-small');
      const item = { fig, video: v, btn, src: small || fig.getAttribute('data-video'), loaded: false, visible: false };
      all.push(item);
      fig.classList.add('has-video');

      v.addEventListener('loadeddata', () => {
        const ph = media.querySelector('.ad-ph');
        if (ph) ph.remove();
      });
      if (!reduce && btn) {
        btn.hidden = false;
        btn.setAttribute('aria-pressed', 'false');
        btn.addEventListener('click', () => toggle(item));
        v.addEventListener('click', () => toggle(item));
      }
    });

    if (!('IntersectionObserver' in window)) {
      all.forEach((item) => {
        load(item);
        if (!reduce) item.video.play().catch(() => {});
      });
      return;
    }
    const near = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const item = all.find((it) => it.fig === en.target);
        if (item) load(item);
        near.unobserve(en.target);
      });
    }, { rootMargin: '600px 0px' });
    const seen = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const item = all.find((it) => it.fig === en.target);
        if (!item) return;
        item.visible = en.isIntersecting && en.intersectionRatio >= 0.35;
        if (reduce) {
          if (!item.visible) item.video.pause();
          return;
        }
        if (item.visible) {
          load(item);
          item.video.play().catch(() => {});
        } else {
          item.video.pause();
        }
      });
    }, { threshold: [0, 0.35, 0.6] });
    all.forEach((item) => {
      near.observe(item.fig);
      seen.observe(item.fig);
    });
  }

  /* ------------------------------------------------------------------ contact form */

  function initForm() {
    const form = $('contact-form');
    if (!form) return;
    const status = $('form-status');
    const btn = form.querySelector('button[type="submit"]');
    const t0 = performance.now();
    const fields = {
      name: form.elements.namedItem('name'),
      company: form.elements.namedItem('company'),
      email: form.elements.namedItem('email'),
      notes: form.elements.namedItem('notes'),
      hp: form.elements.namedItem('website_hp'),
    };
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    const say = (text, isError, link) => {
      status.textContent = '';
      status.classList.toggle('error', !!isError);
      status.append(text);
      if (link) {
        const a = document.createElement('a');
        a.href = link.href;
        a.textContent = link.text;
        status.append(a, '.');
      }
    };

    Object.values(fields).forEach((f) => {
      if (f) f.addEventListener('input', () => f.removeAttribute('aria-invalid'));
    });

    const mailtoFor = (d) => {
      const body = [
        'Name: ' + d.name,
        'Company URL: ' + d.company,
        'Email: ' + d.email,
        '',
        d.notes,
      ].join('\n');
      return 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent('Call request: ' + d.name) + '&body=' + encodeURIComponent(body);
    };

    const sourceInfo = () => {
      const q = new URLSearchParams(window.location.search);
      return ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
        .filter((k) => q.get(k))
        .map((k) => k.replace('utm_', '') + '=' + q.get(k).slice(0, 100))
        .join(' · ');
    };

    async function post(body) {
      let res;
      try {
        res = await fetch(FORM_ENDPOINT, { method: 'POST', body });
      } catch (err) {
        // The browser may block only the answer, not the request. Send once more without reading the answer;
        // the backend ignores a repeat from the same email within a few minutes.
        await fetch(FORM_ENDPOINT, { method: 'POST', mode: 'no-cors', body });
        return { ok: true };
      }
      if (!res.ok) return { ok: false };
      try {
        return await res.json();
      } catch (err) {
        return { ok: true };
      }
    }

    const showThanks = (first, email) => {
      const box = document.createElement('div');
      box.className = 'thanks';
      box.tabIndex = -1;
      const h = document.createElement('h3');
      h.textContent = first ? 'Thanks, ' + first + '.' : 'Thanks.';
      const p1 = document.createElement('p');
      p1.textContent = "We've got your details and will reply within 60 minutes.";
      const p2 = document.createElement('p');
      p2.className = 'thanks-note';
      p2.textContent = "We've also sent a confirmation to " + email + '.';
      box.append(h, p1, p2);
      form.replaceWith(box);
      box.focus({ preventScroll: true });
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = {
        name: fields.name.value.trim(),
        company: fields.company.value.trim(),
        email: fields.email.value.trim(),
        notes: fields.notes.value.trim(),
      };

      const bad = [];
      if (!d.name) bad.push(fields.name);
      if (!EMAIL_RE.test(d.email)) bad.push(fields.email);
      Object.values(fields).forEach((f) => f && f.removeAttribute('aria-invalid'));
      if (bad.length) {
        bad.forEach((f) => f.setAttribute('aria-invalid', 'true'));
        say(!d.name && bad.length > 1 ? 'Please add your name and a valid email.' : !d.name ? 'Please add your name.' : 'Please add a valid email so we can reply.', true);
        bad[0].focus();
        return;
      }

      // A filled hidden field means a bot: act as if it worked and send nothing.
      if (fields.hp && fields.hp.value) {
        showThanks(d.name.split(/\s+/)[0], d.email);
        return;
      }

      if (!FORM_ENDPOINT) {
        window.location.href = mailtoFor(d);
        say('Your email app should open with your details. If it does not, email us at ', false, { href: 'mailto:' + CONTACT_EMAIL, text: CONTACT_EMAIL });
        return;
      }

      const body = new URLSearchParams();
      body.set('name', d.name);
      body.set('company', d.company);
      body.set('email', d.email);
      body.set('notes', d.notes);
      body.set('website_hp', fields.hp ? fields.hp.value : '');
      body.set('elapsed', String(Math.round(performance.now() - t0)));
      body.set('source', sourceInfo());
      body.set('referrer', (document.referrer || '').slice(0, 300));
      body.set('page', window.location.href.slice(0, 300));

      btn.disabled = true;
      const label = btn.textContent;
      btn.textContent = 'Sending…';
      say('', false);
      try {
        const out = await post(body);
        if (!out || out.ok === false) throw new Error((out && out.error) || 'not saved');
        showThanks(d.name.split(/\s+/)[0], d.email);
      } catch (err) {
        btn.disabled = false;
        btn.textContent = label;
        say("Sorry, that didn't go through. Please try again, or email us at ", true, { href: mailtoFor(d), text: CONTACT_EMAIL });
      }
    });
  }

  /* ------------------------------------------------------------------ start */

  if (!tryRun(initDive)) {
    root.classList.remove('anim');
    G = null;
  }
  if (!tryRun(initReveals)) document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
  tryRun(initScrollLinks);
  tryRun(initNav);
  tryRun(initBarHide);
  tryRun(initBubbles);
  tryRun(initFaq);
  tryRun(initAds);
  tryRun(initForm);
})();
