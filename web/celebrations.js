/* A finite, decorative greeting. The brand link still owns normal home navigation. */
(function (global) {
  'use strict';
  const active = new WeakMap();
  const duration = 1120;
  const noop = () => {};

  function wave(brand) {
    if (!brand?.querySelector) return noop;
    active.get(brand)?.();
    const image = brand.querySelector('.brand-mark img');
    const mark = brand.querySelector('.brand-mark');
    const source = image?.getAttribute('src');
    if (!image || !mark || !source || !/(?:^|\/)mascot\.svg(?:[?#]|$)/.test(source)) return noop;
    const motion = global.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (motion?.matches || document.documentElement.dataset.reduceMotion === 'true') return noop;

    const originalPose = mark.style.getPropertyValue('--kotoba-brand-pose');
    const originalPriority = mark.style.getPropertyPriority('--kotoba-brand-pose');
    const wavingSource = source.split('#')[0] + '#wave';
    let firstFrame = 0, secondFrame = 0, timer = 0, stopped = false;
    const requestFrame = global.requestAnimationFrame.bind(global);
    const cancelFrame = global.cancelAnimationFrame.bind(global);
    const stop = () => {
      if (stopped) return;
      stopped = true;
      cancelFrame(firstFrame); cancelFrame(secondFrame); global.clearTimeout(timer);
      motion?.removeEventListener?.('change', changed);
      brand.classList.remove('is-waving');
      if (image.getAttribute('src') === wavingSource) image.setAttribute('src', source);
      if (originalPose) mark.style.setProperty('--kotoba-brand-pose', originalPose, originalPriority);
      else mark.style.removeProperty('--kotoba-brand-pose');
      if (active.get(brand) === stop) active.delete(brand);
    };
    const changed = event => { if (event.matches) stop(); };
    active.set(brand, stop);
    motion?.addEventListener?.('change', changed);
    // Two paints separate repeated greetings without force-layout or queued effects.
    firstFrame = requestFrame(() => {
      secondFrame = requestFrame(() => {
        if (stopped || motion?.matches || document.documentElement.dataset.reduceMotion === 'true') { stop(); return; }
        const pose = global.getComputedStyle(mark).transform;
        mark.style.setProperty('--kotoba-brand-pose', !pose || pose === 'none' ? 'rotate(0deg)' : pose);
        brand.classList.add('is-waving');
        image.setAttribute('src', wavingSource);
        timer = global.setTimeout(stop, duration);
      });
    });
    return stop;
  }

  global.KotobaCelebrations = {wave};
})(window);
