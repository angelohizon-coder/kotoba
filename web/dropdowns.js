/* Accessible local dropdowns, progressively enhancing ordinary single-select controls.
   enhance(container) returns a disposer; the application calls it once after each render. */
(() => {
  'use strict';
  let serial = 0;
  let closeOpenMenu = null;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function icon(path, className) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 20 20');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', className);
    const shape = document.createElementNS(SVG_NS, 'path');
    shape.setAttribute('d', path);
    shape.setAttribute('stroke', 'currentColor');
    shape.setAttribute('stroke-width', '2.2');
    shape.setAttribute('stroke-linecap', 'round');
    shape.setAttribute('stroke-linejoin', 'round');
    svg.append(shape);
    return svg;
  }

  function enhanceSelect(select) {
    if (select.multiple || select.size > 1 || select.dataset.dropdownEnhanced || select.hidden) return null;
    const nativeState = { hidden: select.hidden, tabIndex: select.getAttribute('tabindex'), ariaHidden: select.getAttribute('aria-hidden') };
    const uid = select.id || `kotoba-dropdown-${++serial}`;
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = `${uid}-trigger`;
    trigger.className = 'dropdown-trigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', `${uid}-listbox`);
    if (select.getAttribute('aria-describedby')) trigger.setAttribute('aria-describedby', select.getAttribute('aria-describedby'));
    const labels = [...(select.labels || [])].map(label => ({ label, for: label.getAttribute('for') }));
    const labelText = labels.map(({ label }) => label.querySelector('.field-label')?.textContent || label.querySelector('span')?.textContent || [...label.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join(' ')).join(' ').trim();
    trigger.setAttribute('aria-label', select.getAttribute('aria-label') || labelText || select.name || 'Choose an option');
    labels.forEach(({ label }) => label.setAttribute('for', trigger.id));

    const value = document.createElement('span');
    value.className = 'dropdown-value';
    trigger.append(value, icon('m5 7.5 5 5 5-5', 'dropdown-chevron'));
    const wrapper = document.createElement('div');
    wrapper.className = 'dropdown';
    select.before(wrapper);
    wrapper.append(select, trigger);
    select.dataset.dropdownEnhanced = 'true';
    select.hidden = true;
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    const popup = document.createElement('div');
    popup.id = `${uid}-listbox`;
    popup.className = 'dropdown-menu';
    popup.setAttribute('role', 'listbox');
    popup.setAttribute('aria-label', trigger.getAttribute('aria-label'));
    let rows = [];
    let activeIndex = select.selectedIndex;
    let isOpen = false;
    let typeBuffer = '';
    let typeAt = 0;
    let frame = 0;

    const enabled = index => index >= 0 && index < select.options.length && !select.options[index].disabled && !select.options[index].parentElement?.disabled;
    function firstEnabled(backwards = false) {
      const indexes = [...select.options].map((_, index) => index);
      return (backwards ? indexes.reverse() : indexes).find(enabled) ?? -1;
    }
    function sync() {
      value.textContent = select.selectedOptions[0]?.label || 'Choose an option';
      trigger.disabled = select.disabled;
      if (select.required) trigger.setAttribute('aria-required', 'true'); else trigger.removeAttribute('aria-required');
      if (select.getAttribute('aria-invalid')) trigger.setAttribute('aria-invalid', select.getAttribute('aria-invalid')); else trigger.removeAttribute('aria-invalid');
      rows.forEach(({ node, index }) => {
        node.setAttribute('aria-selected', String(index === select.selectedIndex));
        node.classList.toggle('selected', index === select.selectedIndex);
      });
      if (select.disabled && isOpen) close();
    }
    function ensureActiveVisible() {
      const node = rows.find(row => row.index === activeIndex)?.node;
      if (!node) return;
      const top = node.offsetTop, bottom = top + node.offsetHeight;
      if (top < popup.scrollTop + 6) popup.scrollTop = Math.max(0, top - 6);
      else if (bottom > popup.scrollTop + popup.clientHeight - 6) popup.scrollTop = bottom - popup.clientHeight + 6;
    }
    function setActive(index) {
      if (!enabled(index)) return;
      activeIndex = index;
      rows.forEach(({ node, index: rowIndex }) => node.classList.toggle('active', rowIndex === index));
      trigger.setAttribute('aria-activedescendant', `${uid}-option-${index}`);
      ensureActiveVisible();
    }
    function position() {
      if (!isOpen || !trigger.isConnected) return;
      const rect = trigger.getBoundingClientRect();
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft || 0, top = viewport?.offsetTop || 0;
      const width = viewport?.width || window.innerWidth, height = viewport?.height || window.innerHeight;
      const nav = document.querySelector('.mobile-bottom-nav');
      const navTop = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect().top : Infinity;
      const bottomLimit = Math.min(top + height, navTop);
      const menuWidth = Math.min(Math.max(rect.width, 240), width - 16);
      popup.style.width = `${menuWidth}px`;
      popup.style.left = `${Math.max(left + 8, Math.min(rect.left, left + width - menuWidth - 8))}px`;
      const below = bottomLimit - rect.bottom - 14, above = rect.top - top - 14;
      const upwards = below < Math.min(180, popup.scrollHeight) && above > below;
      const available = Math.max(44, Math.min(320, upwards ? above : below));
      popup.style.maxHeight = `${available}px`;
      const actualHeight = Math.min(available, popup.scrollHeight);
      popup.style.top = `${upwards ? Math.max(top + 8, rect.top - actualHeight - 6) : rect.bottom + 6}px`;
      popup.dataset.direction = upwards ? 'up' : 'down';
    }
    function schedulePosition() {
      if (!isOpen || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = trigger.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) close(); else position();
      });
    }
    function buildOptions() {
      rows = [];
      popup.replaceChildren();
      let lastGroup = null;
      [...select.options].forEach((option, index) => {
        const group = option.parentElement?.tagName === 'OPTGROUP' ? option.parentElement : null;
        if (group && group !== lastGroup) {
          const heading = document.createElement('div');
          heading.className = 'dropdown-group';
          heading.setAttribute('role', 'presentation');
          heading.textContent = group.label;
          popup.append(heading);
        }
        lastGroup = group;
        const row = document.createElement('div');
        row.id = `${uid}-option-${index}`;
        row.className = 'dropdown-option';
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', String(index === select.selectedIndex));
        row.setAttribute('aria-disabled', String(!enabled(index)));
        if (option.lang || select.lang) row.lang = option.lang || select.lang;
        const text = document.createElement('span');
        text.textContent = option.label;
        row.append(text, icon('m4 10 4 4 8-8', 'dropdown-check'));
        row.addEventListener('pointermove', () => { if (enabled(index)) setActive(index); });
        row.addEventListener('pointerdown', event => event.preventDefault());
        row.addEventListener('click', () => { if (enabled(index)) choose(index); });
        rows.push({ node: row, index });
        popup.append(row);
      });
      sync();
    }
    function open() {
      if (isOpen || select.disabled) return;
      if (closeOpenMenu) closeOpenMenu();
      sync();
      buildOptions();
      isOpen = true;
      closeOpenMenu = close;
      wrapper.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      document.body.append(popup);
      position();
      setActive(enabled(select.selectedIndex) ? select.selectedIndex : firstEnabled());
      document.addEventListener('pointerdown', outside, true);
      document.addEventListener('scroll', schedulePosition, true);
      window.addEventListener('resize', schedulePosition);
      window.visualViewport?.addEventListener('resize', schedulePosition);
      window.visualViewport?.addEventListener('scroll', schedulePosition);
    }
    function close() {
      if (!isOpen) return;
      isOpen = false;
      if (closeOpenMenu === close) closeOpenMenu = null;
      wrapper.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
      popup.remove();
      typeBuffer = '';
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('scroll', schedulePosition, true);
      window.removeEventListener('resize', schedulePosition);
      window.visualViewport?.removeEventListener('resize', schedulePosition);
      window.visualViewport?.removeEventListener('scroll', schedulePosition);
    }
    function outside(event) { if (!wrapper.contains(event.target) && !popup.contains(event.target)) close(); }
    function choose(index) {
      const changed = select.selectedIndex !== index;
      select.selectedIndex = index;
      sync();
      close();
      trigger.focus({ preventScroll: true });
      if (changed) {
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    function move(delta) {
      let next = activeIndex + delta;
      while (next >= 0 && next < select.options.length) {
        if (enabled(next)) { setActive(next); return; }
        next += delta;
      }
    }
    function keydown(event) {
      if (event.ctrlKey || event.metaKey) return;
      // Keep flashcard/page shortcuts from treating a focused filter as the study card.
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); return; }
      if (event.key === 'Tab') { close(); return; }
      if (event.key === 'Escape' && isOpen) { event.preventDefault(); event.stopPropagation(); close(); return; }
      if (event.altKey && event.key === 'ArrowUp') { event.preventDefault(); close(); return; }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        if (event.key === 'Enter' || event.key === ' ') { if (isOpen && enabled(activeIndex)) choose(activeIndex); else open(); }
        else {
          const wasOpen = isOpen;
          open();
          if (event.key === 'Home') setActive(firstEnabled());
          else if (event.key === 'End') setActive(firstEnabled(true));
          else if (wasOpen) move(event.key === 'ArrowDown' ? 1 : -1);
        }
        return;
      }
      if (event.key.length === 1 && !event.altKey) {
        event.preventDefault();
        open();
        const now = Date.now(), char = event.key.toLocaleLowerCase();
        typeBuffer = now - typeAt > 700 ? char : typeBuffer + char;
        typeAt = now;
        const prefix = [...typeBuffer].every(letter => letter === char) ? char : typeBuffer;
        const count = select.options.length;
        const start = prefix.length === 1 ? activeIndex + 1 : activeIndex;
        for (let offset = 0; offset < count; offset++) {
          const index = (start + offset + count) % count;
          if (enabled(index) && select.options[index].label.trim().toLocaleLowerCase().startsWith(prefix)) { setActive(index); break; }
        }
      }
    }
    function toggle() { if (isOpen) close(); else open(); }
    function blur(event) { if (!popup.contains(event.relatedTarget)) close(); }
    trigger.addEventListener('click', toggle);
    trigger.addEventListener('keydown', keydown);
    trigger.addEventListener('focus', sync);
    trigger.addEventListener('blur', blur);
    select.addEventListener('change', sync);
    const observer = new MutationObserver(() => { sync(); if (isOpen) { buildOptions(); position(); setActive(enabled(activeIndex) ? activeIndex : firstEnabled()); } });
    observer.observe(select, { attributes: true, childList: true, subtree: true, characterData: true });
    sync();

    return () => {
      close();
      observer.disconnect();
      trigger.removeEventListener('click', toggle);
      trigger.removeEventListener('keydown', keydown);
      trigger.removeEventListener('focus', sync);
      trigger.removeEventListener('blur', blur);
      select.removeEventListener('change', sync);
      labels.forEach(({ label, for: originalFor }) => { if (originalFor === null) label.removeAttribute('for'); else label.setAttribute('for', originalFor); });
      select.hidden = nativeState.hidden;
      if (nativeState.tabIndex === null) select.removeAttribute('tabindex'); else select.setAttribute('tabindex', nativeState.tabIndex);
      if (nativeState.ariaHidden === null) select.removeAttribute('aria-hidden'); else select.setAttribute('aria-hidden', nativeState.ariaHidden);
      delete select.dataset.dropdownEnhanced;
      wrapper.before(select);
      wrapper.remove();
    };
  }

  window.KotobaDropdowns = {
    enhance(container) {
      const disposers = [...container.querySelectorAll('select')].map(enhanceSelect).filter(Boolean);
      return () => disposers.forEach(dispose => dispose());
    },
  };
})();
