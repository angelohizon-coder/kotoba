/* Context vocabulary help. The matcher decides which words are safe to explain. */
(function (global) {
  'use strict';
  let nextId = 0;

  function create(ctx, tokenize = global.KotobaGlossary.tokens) {
    const { el } = global.KotobaUI;
    const tooltip = el('div', {
      id: `gloss-tooltip-${++nextId}`,
      className: 'gloss-tooltip',
      role: 'tooltip',
      lang: 'en',
      hidden: true,
    });
    document.body.append(tooltip);
    let active = null;
    let hoveredTrigger = null;
    let popupHovered = false;
    let pinned = false;
    let closeTimer = null;
    let disposed = false;

    function cancelClose() {
      if (closeTimer !== null) clearTimeout(closeTimer);
      closeTimer = null;
    }

    function hide() {
      cancelClose();
      active?.removeAttribute('aria-describedby');
      active = null;
      pinned = false;
      popupHovered = false;
      tooltip.hidden = true;
    }

    function position() {
      if (!active?.isConnected || disposed) { hide(); return; }
      const viewport = global.visualViewport;
      const leftEdge = viewport?.offsetLeft ?? 0;
      const topEdge = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? global.innerWidth;
      const height = viewport?.height ?? global.innerHeight;
      const inset = 10;
      tooltip.style.maxWidth = `${Math.max(1, Math.min(320, width - inset * 2))}px`;
      tooltip.style.maxHeight = `${Math.max(1, height - inset * 2)}px`;
      const anchor = active.getBoundingClientRect();
      const box = tooltip.getBoundingClientRect();
      const left = Math.min(Math.max(anchor.left + anchor.width / 2 - box.width / 2, leftEdge + inset), leftEdge + width - box.width - inset);
      const below = anchor.bottom + 8;
      const above = anchor.top - box.height - 8;
      const preferredTop = below + box.height <= topEdge + height - inset ? below : above;
      const top = Math.min(Math.max(preferredTop, topEdge + inset), topEdge + height - box.height - inset);
      tooltip.style.left = `${Math.round(left)}px`;
      tooltip.style.top = `${Math.round(top)}px`;
    }

    function show(trigger, entry, pin = false) {
      if (disposed) return;
      cancelClose();
      const same = active === trigger;
      if (!same) {
        active?.removeAttribute('aria-describedby');
        popupHovered = false;
      }
      active = trigger;
      pinned = pin || (same && pinned);
      tooltip.replaceChildren(
        el('span', { className: 'gloss-tooltip-reading', lang: 'ja' }, entry.reading || entry.word),
        el('span', { className: 'gloss-tooltip-meaning' }, entry.meaning),
      );
      tooltip.hidden = false;
      trigger.setAttribute('aria-describedby', tooltip.id);
      position();
    }

    function scheduleClose() {
      cancelClose();
      closeTimer = setTimeout(() => {
        closeTimer = null;
        if (!pinned && !popupHovered && hoveredTrigger !== active && document.activeElement !== active) hide();
      }, 220);
    }

    const popupEnter = () => { popupHovered = true; cancelClose(); };
    const popupLeave = () => { popupHovered = false; scheduleClose(); };
    const outsideClick = event => {
      if (active && !active.contains(event.target) && !tooltip.contains(event.target)) hide();
    };
    const keyboard = event => {
      if (event.key !== 'Escape' || !active) return;
      hide();
      event.preventDefault();
      event.stopPropagation();
    };
    const scroll = event => {
      if (!active || tooltip.contains(event.target)) return;
      // Focus may scroll a word into view. Keep its definition beside it while visible.
      if (document.activeElement === active) {
        const viewport = global.visualViewport;
        const left = viewport?.offsetLeft ?? 0;
        const top = viewport?.offsetTop ?? 0;
        const right = left + (viewport?.width ?? global.innerWidth);
        const bottom = top + (viewport?.height ?? global.innerHeight);
        const anchor = active.getBoundingClientRect();
        if (anchor.right > left && anchor.left < right && anchor.bottom > top && anchor.top < bottom) {
          position();
          return;
        }
      }
      hide();
    };
    const resize = () => { if (active) position(); };
    tooltip.addEventListener('pointerenter', popupEnter);
    tooltip.addEventListener('pointerleave', popupLeave);
    document.addEventListener('click', outsideClick, true);
    document.addEventListener('keydown', keyboard, true);
    document.addEventListener('scroll', scroll, true);
    global.addEventListener('resize', resize);
    global.visualViewport?.addEventListener('resize', resize);
    global.visualViewport?.addEventListener('scroll', resize);

    ctx.cleanup(() => {
      disposed = true;
      hide();
      tooltip.removeEventListener('pointerenter', popupEnter);
      tooltip.removeEventListener('pointerleave', popupLeave);
      document.removeEventListener('click', outsideClick, true);
      document.removeEventListener('keydown', keyboard, true);
      document.removeEventListener('scroll', scroll, true);
      global.removeEventListener('resize', resize);
      global.visualViewport?.removeEventListener('resize', resize);
      global.visualViewport?.removeEventListener('scroll', resize);
      tooltip.remove();
    });

    return function render(text, question, options = {}) {
      const outer = el('span', { lang: 'ja', className: 'gloss-text' });
      for (const token of tokenize(text, question, options)) {
        if (!token.entry) { outer.append(document.createTextNode(token.text)); continue; }
        const trigger = el('button', {
          type: 'button',
          className: 'gloss-word',
          'aria-label': `Show definition for ${token.text}`,
          'data-vocabulary-id': token.entry.id,
          onPointerenter: () => { hoveredTrigger = trigger; show(trigger, token.entry); },
          onPointerleave: () => { if (hoveredTrigger === trigger) hoveredTrigger = null; scheduleClose(); },
          onFocus: () => show(trigger, token.entry),
          onBlur: () => { pinned = false; scheduleClose(); },
          onClick: event => {
            event.preventDefault();
            event.stopPropagation();
            if (active === trigger && pinned) hide();
            else show(trigger, token.entry, true);
          },
        }, token.text);
        outer.append(trigger);
      }
      return outer;
    };
  }

  function studyAvailable(ctx) {
    const progress = typeof ctx.progress === 'function' ? ctx.progress() : null;
    const active = progress?.attempts?.find(attempt => attempt.id === progress.activeAttemptId);
    return !(active?.type === 'mock' && active.status === 'in-progress');
  }

  // Reading lessons may explain every matched dictionary word. An active mock
  // still gets plain Japanese text even if a caller bypasses the study-page guard.
  function createStudy(ctx) {
    if (!studyAvailable(ctx)) return text => global.KotobaUI.ja(text);
    const render = create(ctx, text => studyAvailable(ctx)
      ? global.KotobaGlossary.studyTokens(text)
      : [{ text: String(text ?? '') }]);
    return text => render(text);
  }

  global.KotobaGlossaryUI = { create, createStudy };
})(window);
