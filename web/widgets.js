/* Live pointer placement is provisional; only a completed drop saves the order. */
(function (global) {
  'use strict';
  const instances = new WeakMap();
  let serial = 0;
  const keys = ['ArrowUp', 'ArrowDown', 'Home', 'End'];
  const noop = () => {};
  let dropped = null;
  // Re-rendering after a drop must not turn the pointer's click into a study action.
  global.addEventListener('click', event => {
    if (!dropped || !event.detail || Date.now() - dropped.time > 350) return;
    if (Math.hypot(event.clientX - dropped.x, event.clientY - dropped.y) > 8) return;
    dropped = null; event.preventDefault(); event.stopImmediatePropagation();
  }, true);

  function enhance(container, options = {}) {
    if (!container?.querySelectorAll || typeof options.onReorder !== 'function') return noop;
    instances.get(container)?.();
    const doc = container.ownerDocument;
    const itemSelector = options.itemSelector || '.dashboard-widget[data-widget]';
    const surfaceSelector = options.dragSurfaceSelector || '.widget-drag-title';
    const currentContainer = () => container.isConnected ? container : doc.getElementById(container.id);
    const children = owner => Array.from(owner?.children || []).filter(node => node.matches(itemSelector));
    const widgets = () => children(container);
    const ids = () => widgets().map(node => node.dataset.widget);
    const initialIds = ids();
    if (new Set(initialIds).size !== initialIds.length) return noop;
    const help = doc.createElement('p'), status = doc.createElement('p');
    help.id = 'widget-move-help-' + (++serial);
    help.className = status.className = 'widget-move-status';
    help.textContent = 'Drag to move. Use Arrow Up or Down, Home or End to reorder. Escape cancels a drag.';
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); status.setAttribute('aria-atomic', 'true');
    container.append(help, status);
    const handles = widgets().flatMap(node => Array.from(node.querySelectorAll('.widget-drag-handle')));
    const originals = handles.map(handle => ({handle,description:handle.getAttribute('aria-describedby'),shortcuts:handle.getAttribute('aria-keyshortcuts')}));
    for (const {handle,description} of originals) {
      handle.setAttribute('aria-describedby', [description,help.id].filter(Boolean).join(' '));
      handle.setAttribute('aria-keyshortcuts', keys.join(' '));
    }
    let drag = null, disposed = false;
    const movement = new Map();
    const label = node => (node.querySelector('.widget-drag-handle')?.getAttribute('aria-label') || node.dataset.widget).replace(/^Move\s+/i, '');
    const announce = message => {
      const live = status.isConnected ? status : currentContainer()?.querySelector('.widget-move-status[role="status"]');
      if (live) live.textContent = message;
    };
    const restore = nodes => { for (const node of nodes) container.append(node); };
    const stopMovement = () => {
      for (const animation of movement.values()) animation.cancel();
      movement.clear();
    };
    function moveBefore(node, reference) {
      if (reference === node || node.nextSibling === reference) return false;
      // Animate from the currently visible positions, including any unfinished move.
      const previous = new Map(widgets().map(item => [item,item.getBoundingClientRect()]));
      stopMovement();
      container.insertBefore(node,reference);
      if (document.documentElement.dataset.reduceMotion !== 'true' && !global.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        for (const item of widgets()) {
          if (item === node || typeof item.animate !== 'function') continue;
          const from = previous.get(item), to = item.getBoundingClientRect();
          if (!from) continue;
          const x = from.left - to.left, y = from.top - to.top;
          if (Math.abs(x) < 1 && Math.abs(y) < 1) continue;
          const animation = item.animate([
            {transform:`translate(${x}px,${y}px)`}, {transform:'translate(0,0)'},
          ], {duration:180,easing:'cubic-bezier(.2,.75,.25,1)'});
          movement.set(item,animation);
          animation.onfinish = () => { if (movement.get(item) === animation) movement.delete(item); };
        }
      }
      return true;
    }
    const removeIndicators = () => widgets().forEach(node => node.classList.remove('widget-drop-before','widget-drop-after'));
    const focusHandle = id => {
      const node = children(currentContainer()).find(item => item.dataset.widget === id);
      node?.querySelector('.widget-drag-handle')?.focus({preventScroll:true});
    };
    function commit(before, movingId, name, restoreFocus) {
      const order = ids();
      if (order.every((id,index) => id === before[index].dataset.widget)) {
        if (restoreFocus) focusHandle(movingId);
        announce(name + ' kept in position ' + (order.indexOf(movingId) + 1) + '. Widget order unchanged.');
        return;
      }
      try { options.onReorder(order, {id:movingId}); }
      catch (error) { restore(before); throw error; }
      if (restoreFocus) focusHandle(movingId);
      announce(name + ' moved to position ' + (order.indexOf(movingId) + 1) + ' of ' + order.length + '.');
      options.onMove?.();
    }
    function finish(save) {
      if (!drag) return;
      const previous = drag; drag = null;
      if (previous.started) dropped = {x:previous.x,y:previous.y,time:Date.now()};
      global.cancelAnimationFrame(previous.frame);
      previous.preview?.remove();
      stopMovement();
      previous.node.classList.remove('widget-dragging');
      container.classList.remove('is-reordering'); removeIndicators();
      try { if (container.hasPointerCapture?.(previous.pointerId)) container.releasePointerCapture(previous.pointerId); } catch {}
      if (!save || !previous.started) {
        if (previous.started) {
          restore(previous.before);
          if (previous.restoreFocus) previous.handle.focus({preventScroll:true});
          announce('Move canceled. Widget order unchanged.');
        }
      } else {
        commit(previous.before, previous.node.dataset.widget, previous.name, previous.restoreFocus);
      }
    }
    function scrollHost() {
      for (let node = container; node && node !== doc.body; node = node.parentElement) {
        if (/(auto|scroll)/.test(global.getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight + 1) return node;
      }
      return null;
    }
    function inBounds(x,y) {
      const box = container.getBoundingClientRect(), visible = scrollBounds();
      return x >= box.left - 24 && x <= box.right + 24
        && y >= Math.max(box.top, visible.top) - 24 && y <= Math.min(box.bottom, visible.bottom) + 24;
    }
    function scrollBounds() {
      const host = drag?.scrollHost;
      const box = host?.getBoundingClientRect() || { top: 0, bottom: global.innerHeight };
      const sticky = host?.querySelector('.widget-panel-heading')?.getBoundingClientRect();
      const nav = doc.querySelector('.mobile-bottom-nav');
      const navTop = nav && global.getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect().top : global.innerHeight;
      return { top: Math.max(0, sticky?.bottom || box.top), bottom: Math.min(box.bottom, navTop, global.innerHeight) };
    }
    function atScrollEdge(x,y) {
      const box = container.getBoundingClientRect(), bounds = scrollBounds();
      return x >= box.left - 24 && x <= box.right + 24 && y >= bounds.top - 24 && y <= bounds.bottom + 24
        && (y <= bounds.top + 52 || y >= bounds.bottom - 52);
    }
    function canDrop(x,y) { return inBounds(x,y) || (!!drag?.insertion && atScrollEdge(x,y)); }
    function createPreview() {
      const preview = doc.createElement('div'), heading = doc.createElement('div');
      const image = doc.createElement('div'), caption = doc.createElement('div');
      preview.className = 'widget-drag-preview'; preview.setAttribute('aria-hidden','true');
      preview.setAttribute('inert','');
      heading.className = 'widget-drag-label'; heading.textContent = 'Moving ' + drag.name;
      image.className = 'widget-drag-image'; caption.className = 'widget-drag-caption';
      const snapshot = drag.node.cloneNode(true);
      snapshot.classList.remove('dashboard-widget','widget-order-item','widget-dragging','widget-just-moved','widget-drop-before','widget-drop-after');
      snapshot.classList.add('widget-drag-card');
      if (drag.node.classList.contains('widget-order-item')) snapshot.classList.add('is-order-row');
      const sourceChildren = Array.from(drag.node.children), copiedChildren = Array.from(snapshot.children);
      sourceChildren.forEach((element,index) => {
        if (global.getComputedStyle(element).display === 'none') copiedChildren[index]?.remove();
      });
      snapshot.querySelectorAll('.dropdown-menu,.gloss-tooltip,[role="dialog"],[role="listbox"]').forEach(element => element.remove());
      // This is a visual snapshot, never another learning item or focusable control.
      for (const element of [snapshot,...snapshot.querySelectorAll('*')]) {
        for (const attribute of Array.from(element.attributes)) {
          if (attribute.name === 'id' || attribute.name === 'for' || attribute.name.startsWith('data-')
            || ['aria-controls','aria-labelledby','aria-describedby','aria-owns','aria-activedescendant','name','form'].includes(attribute.name))
            element.removeAttribute(attribute.name);
        }
        if (element.matches('button,input,select,textarea,a,summary,[tabindex],[contenteditable]')) {
          element.setAttribute('tabindex','-1'); element.removeAttribute('contenteditable');
        }
      }
      image.append(snapshot); preview.append(heading,image,caption);
      preview.style.width = Math.max(160,Math.min(drag.sourceBox.width,420,global.innerWidth - 24)) + 'px';
      doc.body.append(preview);
      const clipped = image.scrollHeight > image.clientHeight + 1;
      preview.classList.toggle('is-clipped',clipped);
      caption.textContent = clipped ? 'Content preview · release to place' : 'Release to place · Escape cancels';
      drag.preview = preview; drag.previewLabel = heading;
      drag.previewOffsetX = Math.max(20,Math.min(drag.startX - drag.sourceBox.left,preview.offsetWidth - 24));
      drag.previewOffsetY = Math.max(30,Math.min(drag.startY - drag.sourceBox.top + heading.offsetHeight,120));
    }
    function positionPreview() {
      const {x,y,preview} = drag;
      const bottom = Math.max(preview.offsetHeight + 16,scrollBounds().bottom);
      preview.style.left = Math.max(8,Math.min(x - drag.previewOffsetX,global.innerWidth - preview.offsetWidth - 8)) + 'px';
      preview.style.top = Math.max(8,Math.min(y - drag.previewOffsetY,bottom - preview.offsetHeight - 8)) + 'px';
    }
    function place() {
      if (!drag?.started) return;
      const {x,y,node,preview} = drag;
      positionPreview();
      if (!inBounds(x,y) && !atScrollEdge(x,y)) { removeIndicators(); drag.insertion = null; return; }
      const location = {x,y,scrollX:global.scrollX,scrollY:global.scrollY,hostScroll:drag.scrollHost?.scrollTop || 0};
      const previous = drag.lastPlacement;
      // Releasing at the same point must not target a neighbor that our preview just moved.
      if (previous && Math.hypot(x - previous.x,y - previous.y) < 2
        && Math.abs(location.scrollX - previous.scrollX) < 1
        && Math.abs(location.scrollY - previous.scrollY) < 1
        && Math.abs(location.hostScroll - previous.hostScroll) < 1) return;
      drag.lastPlacement = location;
      const candidates = widgets().filter(item => item !== node);
      let target = doc.elementFromPoint(x,y)?.closest(itemSelector);
      if (!target || target === node || target.parentElement !== container) {
        const nearby = candidates.reduce((nearest,item) => {
          const r = item.getBoundingClientRect();
          const dx = Math.max(r.left - x,0,x - r.right), dy = Math.max(r.top - y,0,y - r.bottom);
          const distance = dy * 2 + dx;
          return !nearest || distance < nearest.distance ? {item,distance,dx,dy} : nearest;
        },null);
        // Crossing a long lesson's empty drag slot must not move an offscreen neighbor.
        target = nearby && nearby.dx <= 36 && nearby.dy <= 36 ? nearby.item : null;
      }
      if (!target) { removeIndicators(); drag.insertion = null; return; }
      const box = target.getBoundingClientRect();
      const fullWidth = box.width > container.clientWidth * .7;
      // Across a two-column row, horizontal position defines order; full rows use vertical position.
      const sameRow = !fullWidth && y >= box.top && y <= box.bottom;
      const before = sameRow ? x < box.left + box.width / 2 : y < box.top + box.height / 2;
      removeIndicators();
      target.classList.add(before ? 'widget-drop-before' : 'widget-drop-after');
      drag.insertion = { target, before };
      const reference = before ? target : target.nextSibling;
      if (moveBefore(node,reference)) {
        const position = widgets().indexOf(node) + 1;
        drag.previewLabel.textContent = 'Moving ' + drag.name + ' · position ' + position;
        positionPreview();
        announce(drag.name + ' previewed in position ' + position + ' of ' + widgets().length + '. Release to save; Escape cancels.');
      }
    }
    function autoScroll() {
      if (!drag?.started) return;
      const host = drag.scrollHost;
      const bounds = scrollBounds();
      const edge = 52;
      let delta = drag.y < bounds.top + edge ? -Math.ceil((bounds.top + edge - drag.y) / 5)
        : drag.y > bounds.bottom - edge ? Math.ceil((drag.y - bounds.bottom + edge) / 5) : 0;
      delta = Math.max(-14,Math.min(14,delta));
      if (delta && atScrollEdge(drag.x,drag.y)) {
        if (host) host.scrollTop += delta;
        else global.scrollBy({top:delta,behavior:'instant'});
        place();
      }
      drag.frame = global.requestAnimationFrame(autoScroll);
    }
    function begin(event) {
      if (disposed || drag || event.button !== 0 || event.isPrimary === false) return;
      const node = event.target?.closest?.(itemSelector);
      const explicit = event.target?.closest?.('.widget-drag-handle');
      const surface = event.target?.closest?.(surfaceSelector);
      const background = options.allowBackground !== false && (event.pointerType === 'mouse' || options.touchBackground === true) && event.target === node;
      if (!explicit && !surface && !background) return;
      if (!explicit && event.target.closest('button,a,input,select,textarea,label,summary,[contenteditable]')) return;
      const handle = explicit || node?.querySelector('.widget-drag-handle');
      if (!handle || node?.parentElement !== container || handle.disabled || widgets().length < 2) return;
      const before = widgets();
      const sourceBox = node.getBoundingClientRect();
      const restoreFocus = event.pointerType !== 'touch';
      if (restoreFocus) handle.focus({preventScroll:true});
      drag = {node,handle,before,sourceBox,name:label(node),pointerId:event.pointerId,x:event.clientX,y:event.clientY,
        startX:event.clientX,startY:event.clientY,started:false,frame:0,preview:null,insertion:null,lastPlacement:null,scrollHost:scrollHost(),restoreFocus};
    }
    function move(event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      drag.x = event.clientX; drag.y = event.clientY;
      if (!drag.started && Math.hypot(drag.x - drag.startX,drag.y - drag.startY) < 7) return;
      if (event.cancelable) event.preventDefault();
      if (!drag.started) {
        drag.started = true;
        try { container.setPointerCapture?.(drag.pointerId); } catch {}
        container.classList.add('is-reordering'); drag.node.classList.add('widget-dragging');
        createPreview();
        announce('Moving ' + drag.name + '. Release to place; Escape cancels.');
        drag.frame = global.requestAnimationFrame(autoScroll);
      }
      place();
    }
    const up = event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      drag.x = event.clientX; drag.y = event.clientY;
      if (drag.started) {
        if (event.cancelable) event.preventDefault();
        dropped = {x:event.clientX,y:event.clientY,time:Date.now()};
        place();
      }
      finish(canDrop(event.clientX,event.clientY));
    };
    const cancel = event => { if (drag && (!event || event.pointerId === drag.pointerId)) finish(false); };
    const lostCapture = event => {
      // Touch initially captures on the handle; its release bubbles when we take ownership.
      if (event.target !== container || !drag || event.pointerId !== drag.pointerId) return;
      if (container.hasPointerCapture?.(event.pointerId)) return;
      finish(false);
    };
    const escape = event => {
      if (event.key === 'Escape' && drag) { event.preventDefault(); event.stopPropagation(); finish(false); }
    };
    function keyboard(event) {
      if (!keys.includes(event.key) || event.altKey || event.ctrlKey || event.metaKey || drag) return;
      const handle = event.target?.closest?.('.widget-drag-handle');
      const node = handle?.closest(itemSelector);
      if (!handle || node?.parentElement !== container || handle.disabled) return;
      event.preventDefault(); event.stopPropagation();
      const before = widgets(), from = before.indexOf(node);
      const to = event.key === 'Home' ? 0 : event.key === 'End' ? before.length - 1
        : Math.max(0,Math.min(before.length - 1,from + (event.key === 'ArrowUp' ? -1 : 1)));
      if (from === to) return;
      const target = before[to];
      container.insertBefore(node,from > to ? target : target.nextSibling);
      commit(before,node.dataset.widget,label(node),true);
    }
    const blur = () => finish(false);
    container.addEventListener('pointerdown',begin);
    container.addEventListener('keydown',keyboard);
    container.addEventListener('lostpointercapture',lostCapture);
    doc.addEventListener('pointermove',move,{passive:false,capture:true});
    doc.addEventListener('pointerup',up,true);
    doc.addEventListener('pointercancel',cancel,true);
    doc.addEventListener('keydown',escape,true);
    global.addEventListener('blur',blur);

    const cleanup = () => {
      if (disposed) return;
      disposed = true; finish(false);
      stopMovement();
      container.removeEventListener('pointerdown',begin);
      container.removeEventListener('keydown',keyboard);
      container.removeEventListener('lostpointercapture',lostCapture);
      doc.removeEventListener('pointermove',move,true);
      doc.removeEventListener('pointerup',up,true);
      doc.removeEventListener('pointercancel',cancel,true);
      doc.removeEventListener('keydown',escape,true);
      global.removeEventListener('blur',blur);
      for (const {handle,description,shortcuts} of originals) {
        if (description === null) handle.removeAttribute('aria-describedby'); else handle.setAttribute('aria-describedby',description);
        if (shortcuts === null) handle.removeAttribute('aria-keyshortcuts'); else handle.setAttribute('aria-keyshortcuts',shortcuts);
      }
      help.remove(); status.remove();
      if (instances.get(container) === cleanup) instances.delete(container);
    };
    instances.set(container,cleanup);
    return cleanup;
  }

  global.KotobaWidgets = {enhance};
})(window);
