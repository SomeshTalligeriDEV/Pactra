/* Standalone landing: no framework, build step, wallet SDK, or payment calls. */
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const burger = document.querySelector('.burger');
  const overlay = document.querySelector('.overlay');
  const menu = document.querySelector('.mobile-menu');
  const hero = document.querySelector('.hero');
  const stats = document.querySelector('.stats');
  const product = document.querySelector('.product-content');

  function setMenu(open, restoreFocus = false) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    menu.hidden = !open;
    overlay.hidden = !open;
    document.body.classList.toggle('menu-open', open);
    hero.inert = open;
    stats.inert = open;
    if (product) product.inert = open;
    if (open) menu.querySelector('a').focus({ preventScroll: true });
    else if (restoreFocus) burger.focus({ preventScroll: true });
  }

  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  overlay.addEventListener('click', () => setMenu(false, true));
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (menu.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setMenu(false, true);
    } else if (event.key === 'Tab') {
      const focusable = [burger, ...menu.querySelectorAll('a')];
      const current = focusable.indexOf(document.activeElement);
      const next = (current + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
      event.preventDefault();
      focusable[next].focus();
    }
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 720) setMenu(false); });
  window.addEventListener('pageshow', () => setMenu(false));

  // Font/CDN fallbacks must never clip a headline on a narrow screen.
  const headline = document.querySelector('.headline');
  function fitHeadline() {
    headline.style.fontSize = '';
    const base = parseFloat(getComputedStyle(headline).fontSize);
    const available = hero.clientWidth - 4;
    const widths = [...headline.children].map(line => {
      const range = document.createRange();
      range.selectNodeContents(line);
      return range.getBoundingClientRect().width;
    });
    const widest = Math.max(...widths);
    if (widest > available) headline.style.fontSize = `${base * available / widest}px`;
  }
  fitHeadline();
  document.fonts?.ready.then(fitHeadline);
  window.addEventListener('resize', fitHeadline);

  const counters = [...document.querySelectorAll('[data-count]')];
  const timers = new Set();
  const frames = new Set();
  const format = (node, value) => value.toFixed(Number(node.dataset.decimals)) + node.dataset.suffix;
  let observer;

  function finishCounters() {
    observer?.disconnect();
    timers.forEach(clearTimeout);
    frames.forEach(cancelAnimationFrame);
    timers.clear();
    frames.clear();
    counters.forEach(node => { node.textContent = format(node, Number(node.dataset.target)); });
  }

  function countUp(node, index) {
    const start = performance.now();
    const duration = 1500 + index * 80;
    const target = Number(node.dataset.target);
    let id;
    function frame(now) {
      frames.delete(id);
      const progress = Math.min(1, (now - start) / duration);
      node.textContent = format(node, target * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) { id = requestAnimationFrame(frame); frames.add(id); }
    }
    id = requestAnimationFrame(frame);
    frames.add(id);
  }

  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    counters.forEach(node => { node.textContent = format(node, 0); });
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        const index = counters.indexOf(entry.target);
        const timer = setTimeout(() => {
          timers.delete(timer);
          countUp(entry.target, index);
        }, 480 + index * 90);
        timers.add(timer);
      });
    }, { threshold: 0.25 });
    counters.forEach(node => observer.observe(node));
  }

  const cta = document.querySelector('.cta');
  cta.addEventListener('animationend', event => {
    if (event.animationName === 'revealPulse') cta.classList.add('entered');
  });

  const video = document.querySelector('.bg-video');
  const syncMotion = () => {
    if (reducedMotion.matches) {
      video.pause();
      finishCounters();
    } else if (!document.hidden) {
      video.play().catch(() => { /* Black background remains if autoplay is unavailable. */ });
    }
  };
  video.addEventListener('loadeddata', syncMotion, { once: true });
  document.addEventListener('visibilitychange', () => document.hidden ? video.pause() : syncMotion());
  reducedMotion.addEventListener('change', syncMotion);
  syncMotion();

  // The original purchase walkthrough, rendered to HTML and wired without React.
  const purchase = document.querySelector('#product .buy');
  let scenario = 'paid', step = 0, playing = !reducedMotion.matches;
  let purchaseTimer;
  const stepCount = () => scenario === 'paid' ? 7 : 6;
  function renderPurchase(focusSelector) {
    const template = document.getElementById(`purchase-${scenario}-${step}`);
    purchase.replaceChildren(template.content.cloneNode(true));
    purchase.dataset.scenario = scenario;
    const play = document.createElement('button');
    play.type = 'button';
    play.hidden = reducedMotion.matches;
    play.className = 'buy__play';
    play.textContent = playing ? 'Pause' : 'Play';
    play.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} purchase walkthrough`);
    purchase.querySelector('.buy__head').append(play);
    purchase.querySelectorAll('.buy__tab').forEach(tab => {
      tab.tabIndex = tab.dataset.tone === scenario ? 0 : -1;
    });
    purchase.querySelectorAll('.buy__step').forEach((button, index) => {
      if (index === step) button.setAttribute('aria-current', 'step');
    });
    if (focusSelector) purchase.querySelector(focusSelector)?.focus({preventScroll:true});
    clearTimeout(purchaseTimer);
    if (playing && !document.hidden && !reducedMotion.matches) {
      purchaseTimer = setTimeout(() => {
        const rect = purchase.getBoundingClientRect();
        if (rect.top < innerHeight && rect.bottom > 0) {
          step++;
          if (step >= stepCount()) { scenario = scenario === 'paid' ? 'refused' : 'paid'; step = 0; }
        }
        renderPurchase();
      }, step === stepCount()-1 ? 3600 : 2300);
    }
  }
  purchase.addEventListener('click', event => {
    const tab = event.target.closest('.buy__tab');
    const button = event.target.closest('.buy__step');
    const play = event.target.closest('.buy__play');
    if (tab) { scenario = tab.dataset.tone; step = 0; playing = false; renderPurchase(`[data-tone="${scenario}"].buy__tab`); }
    if (button) { step = [...purchase.querySelectorAll('.buy__step')].indexOf(button); playing = false; renderPurchase(`.buy__steps li:nth-child(${step+1}) button`); }
    if (play) { playing = !playing; renderPurchase('.buy__play'); }
  });
  purchase.addEventListener('keydown', event => {
    if (!event.target.matches('.buy__tab') || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    scenario = event.key === 'Home' ? 'paid' : event.key === 'End' ? 'refused' : scenario === 'paid' ? 'refused' : 'paid';
    step = 0; playing = false; renderPurchase(`[data-tone="${scenario}"].buy__tab`);
  });
  document.addEventListener('visibilitychange', () => renderPurchase());
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) playing = false; renderPurchase(); });
  renderPurchase();
  document.querySelectorAll('[data-purchase-scenario]').forEach(link => {
    link.addEventListener('click', () => {
      scenario = link.dataset.purchaseScenario;
      step = 0;
      playing = false;
      renderPurchase();
    });
  });

  // The same seven-node drawing and ancestor debits as the original component.
  document.querySelectorAll('#how .tree').forEach((tree, treeIndex) => {
    const bounded = treeIndex === 1;
    const nodes = [...tree.querySelectorAll('g')].filter(group => group.querySelector(':scope > .tree__node'));
    let spent = Array(7).fill(0), tick = 0, held = 0;
    const status = tree.querySelector('.tree__status');
    const updateTree = () => {
      const rect = tree.getBoundingClientRect();
      if (reducedMotion.matches || document.hidden || rect.bottom < 0 || rect.top > innerHeight) return;
      if (held) { if (--held === 0) spent.fill(0); else return; }
      const leaf = 3 + tick++ % 4;
      const chain = [leaf, leaf < 5 ? 1 : 2, 0];
      const refused = bounded && spent[0] + .05 > 1.001;
      if (!refused) chain.forEach(i => spent[i] += .05);
      nodes.forEach((node, index) => {
        const ring = node.querySelector('.tree__ring-used, .tree__ring-breached');
        const circumference = 2 * Math.PI * Number(ring.getAttribute('r'));
        ring.setAttribute('stroke-dasharray', `${circumference * Math.min(1,spent[index])} ${circumference}`);
        ring.setAttribute('class', spent[index] > 1.01 ? 'tree__ring-breached' : 'tree__ring-used');
        node.querySelector('.tree__node').classList.toggle('tree__node--refused', refused && index === 0);
      });
      status.dataset.state = refused ? 'refused' : spent[0] > 1.01 ? 'over' : 'ok';
      status.textContent = refused ? 'Refused at the root. This draw would break the window the owner signed.'
        : spent[0] > 1.01 ? `Root window over by ${Math.round((spent[0]-1)*100)}%, and every local check passed.`
        : bounded ? 'Every draw is charged to every parent above it.' : 'Each child obeys its own limit. Nobody adds them up.';
      if (refused || spent[0] >= 1.3) held = 4;
    };
    setInterval(updateTree, 700);
  });
})();
