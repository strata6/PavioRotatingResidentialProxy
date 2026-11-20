(() => {
  const networkHosts = [...document.querySelectorAll('.hero, .page-hero')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  networkHosts.forEach((host) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'network-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.insertBefore(canvas, host.firstChild);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0, height = 0, dpr = 1, nodes = [], frame = 0, lastTime = 0, inView = true;
    const pointer = { x: -1000, y: -1000, active: false };
    const pointerRadius = 120;
    let lastPointerMove = 0;
    let hasInteracted = false;
    const clockNow = () => window.performance && typeof window.performance.now === 'function' ? window.performance.now() : Date.now();
    const copyOpacityAt = (x) => {
      const fadeStart = width * (host.classList.contains('hero') ? .43 : .48);
      const fadeEnd = width * (host.classList.contains('hero') ? .68 : .72);
      const t = Math.max(0, Math.min(1, (x - fadeStart) / Math.max(1, fadeEnd - fadeStart)));
      const smooth = t * t * (3 - 2 * t);
      return .22 + smooth * .78;
    };
    const makeNodes = () => {
      const count = Math.max(28, Math.min(86, Math.round((width * height) / 9500)));
      nodes = Array.from({ length: count }, () => {
        const x = Math.random() * width;
        const y = Math.random() * height;
        return {
          homeX: x, homeY: y,
          x, y,
          vx: (Math.random() - .5) * 12,
          vy: (Math.random() - .5) * 12,
          z: Math.random(),
          phase: Math.random() * Math.PI * 2,
          pulse: 0
        };
      });
    };
    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeNodes();
      paint(0, false);
    };
    const paint = (time, animate) => {
      ctx.clearRect(0, 0, width, height);
      const dt = animate && lastTime ? Math.min((time - lastTime) / 1000, .04) : 0;
      if (animate) lastTime = time;
      if (animate) {
        const idleMs = hasInteracted && !pointer.active ? Math.max(0, time - lastPointerMove) : 0;
        const returnT = hasInteracted ? Math.max(0, Math.min(1, (idleMs - 500) / 1100)) : 0;
        const returnBlend = returnT * returnT * (3 - 2 * returnT);
        nodes.forEach((node) => {
          if (pointer.active) {
            const dx = pointer.x - node.x, dy = pointer.y - node.y;
            const distance = Math.hypot(dx, dy);
            if (distance < pointerRadius && returnBlend < 1) {
              const pull = (1 - distance / pointerRadius) * .52 * (1 - returnBlend);
              node.vx += dx * pull * dt;
              node.vy += dy * pull * dt;
              node.pulse = Math.max(node.pulse, pull * .65);
            }
          }
          node.vx += (node.homeX - node.x) * returnBlend * 1.8 * dt;
          node.vy += (node.homeY - node.y) * returnBlend * 1.8 * dt;
          node.vx *= .997;
          node.vy *= .997;
          const depthSpeed = 1.7 + node.z * .6;
          node.x += node.vx * dt * depthSpeed;
          node.y += node.vy * dt * depthSpeed;
          if (node.x < 0 || node.x > width) node.vx *= -1;
          if (node.y < 0 || node.y > height) node.vy *= -1;
          node.x = Math.max(0, Math.min(width, node.x));
          node.y = Math.max(0, Math.min(height, node.y));
          node.pulse *= .965;
        });
      }

      const linkDistance = Math.min(155, Math.max(92, width * .115));
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance > linkDistance) continue;
          const nearA = pointer.active ? Math.max(0, 1 - Math.hypot(pointer.x - a.x, pointer.y - a.y) / pointerRadius) : 0;
          const nearB = pointer.active ? Math.max(0, 1 - Math.hypot(pointer.x - b.x, pointer.y - b.y) / pointerRadius) : 0;
          const pointerBoost = Math.max(nearA, nearB) * .07;
          const averageDepth = (a.z + b.z) / 2;
          const alpha = ((1 - distance / linkDistance) * (.03 + averageDepth * .09) + pointerBoost) * copyOpacityAt((a.x + b.x) / 2);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
          ctx.lineWidth = .45 + averageDepth * .3 + pointerBoost;
          ctx.stroke();
        }
      }
      if (pointer.active) {
        nodes.forEach((node) => {
          const distance = Math.hypot(pointer.x - node.x, pointer.y - node.y);
          if (distance < pointerRadius) {
            ctx.beginPath();
            ctx.moveTo(pointer.x, pointer.y);
            ctx.lineTo(node.x, node.y);
            ctx.strokeStyle = `rgba(217,255,63,${(1 - distance / pointerRadius) * (.09 + node.z * .09) * copyOpacityAt(node.x)})`;
            ctx.lineWidth = .75;
            ctx.stroke();
          }
        });
      }
      nodes.forEach((node) => {
        const twinkle = animate ? .64 + Math.sin(time * .0012 + node.phase) * .24 : .72;
        const radius = (.85 + node.z * 1.35 + node.pulse * 1.3);
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        const brightness = .42 + node.z * .58;
        ctx.fillStyle = `rgba(245,247,239,${Math.min(1, (twinkle + node.pulse * .25) * brightness) * copyOpacityAt(node.x)})`;
        ctx.shadowColor = node.pulse > .08 ? '#d9ff3f' : '#e9f4ff';
        ctx.shadowBlur = 2 + node.z * 4 + node.pulse * 15;
        ctx.fill();
        ctx.shadowBlur = 0;
        if (node.pulse > .12) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 4 + (1 - node.pulse) * 12, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(217,255,63,${node.pulse * .22 * copyOpacityAt(node.x)})`;
          ctx.lineWidth = .7;
          ctx.stroke();
        }
      });
    };
    const animate = (time) => {
      frame = 0;
      if (!inView || document.hidden || reduceMotion) return;
      paint(time, true);
      frame = window.requestAnimationFrame(animate);
    };
    const start = () => {
      if (reduceMotion) { paint(0, false); return; }
      if (inView && !document.hidden && !frame) frame = window.requestAnimationFrame(animate);
    };
    const stop = () => { if (frame) window.cancelAnimationFrame(frame); frame = 0; };
    const pointFromEvent = (event) => {
      const rect = host.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
      hasInteracted = true;
      lastPointerMove = clockNow();
      if (reduceMotion) paint(0, false);
    };
    host.addEventListener('pointermove', pointFromEvent, { passive: true });
    host.addEventListener('pointerdown', (event) => {
      pointFromEvent(event);
      nodes.forEach((node) => {
        if (Math.hypot(pointer.x - node.x, pointer.y - node.y) < pointerRadius) node.pulse = 1;
      });
      if (reduceMotion) paint(0, false);
    }, { passive: true });
    host.addEventListener('pointerleave', () => { pointer.active = false; lastPointerMove = clockNow(); if (reduceMotion) paint(0, false); });
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(host);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        inView = entries[0].isIntersecting;
        inView ? start() : stop();
      }).observe(host);
    }
    resize();
    start();
  });

  const emblemFrames = [...document.querySelectorAll('.emblem-frame')];
  if (!reduceMotion) emblemFrames.forEach((frame) => {
    const logo = frame.querySelector('img');
    if (!logo) return;
    frame.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      const rect = frame.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - .5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - .5) * 2;
      logo.style.setProperty('--tilt-x', `${x * 5}deg`);
      logo.style.setProperty('--tilt-y', `${-y * 5}deg`);
    }, { passive: true });
    frame.addEventListener('pointerleave', () => {
      logo.style.setProperty('--tilt-x', '0deg');
      logo.style.setProperty('--tilt-y', '0deg');
    });
  });

  const vortexCard = document.getElementById('vortexCard');
  const vortexCanvas = document.getElementById('cursorVortex');
  if (vortexCard && vortexCanvas) {
    const vortexCtx = vortexCanvas.getContext('2d');
    if (vortexCtx) {
      let vortexWidth = 0, vortexHeight = 0, vortexDpr = 1;
      let hovered = false, dragging = false, ready = false, vortexTime = 0;
      let localMouse = { x: -999, y: -999 };
      const defaultStar = { x: 0, y: 0 };
      const star = { x: 0, y: 0 };
      const targetStar = { x: 0, y: 0 };
      const IDLE_SPEED = .0014, HOVER_SPEED = .0052;
      let currentSpeed = IDLE_SPEED;
      const resizeVortex = () => {
        const rect = vortexCard.getBoundingClientRect();
        vortexWidth = rect.width;
        vortexHeight = rect.height;
        vortexDpr = Math.min(window.devicePixelRatio || 1, 1.75);
        vortexCanvas.width = Math.round(vortexWidth * vortexDpr);
        vortexCanvas.height = Math.round(vortexHeight * vortexDpr);
        vortexCtx.setTransform(vortexDpr, 0, 0, vortexDpr, 0, 0);
        defaultStar.x = vortexWidth * .76;
        defaultStar.y = vortexHeight * .46;
        if (!ready) {
          star.x = targetStar.x = defaultStar.x;
          star.y = targetStar.y = defaultStar.y;
          ready = true;
        } else if (!dragging) {
          star.x = targetStar.x = defaultStar.x;
          star.y = targetStar.y = defaultStar.y;
        }
      };
      const gaussian = () => ((Math.random() + Math.random() + Math.random()) / 3 - .5) * 2;
      const cursorSprite = (color, glow) => {
        const sprite = document.createElement('canvas');
        sprite.width = sprite.height = 32;
        const ctx = sprite.getContext('2d');
        ctx.translate(6, 4);
        if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 6; }
        const size = 11;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0, size * 1.4); ctx.lineTo(size * .38, size * 1.05);
        ctx.lineTo(size * .72, size * 1.65); ctx.lineTo(size * .92, size * 1.53);
        ctx.lineTo(size * .58, size * .93); ctx.lineTo(size * 1.05, size * .93); ctx.closePath();
        ctx.fillStyle = color; ctx.fill();
        return sprite;
      };
      const whiteSprite = cursorSprite('#FFFFFF', false);
      const limeSprite = cursorSprite('#D4FF00', true);
      const NUM_CURSORS = 770;
      const cursors = Array.from({ length: NUM_CURSORS }, () => {
        const depth = Math.random();
        return {
          t: Math.pow(Math.random(), .78), speed: .65 + Math.random() * .7,
          perpOffset: gaussian(), isOutlier: Math.random() < .22,
          wobblePhase: Math.random() * Math.PI * 2, wobbleFreq: 1.5 + Math.random() * 2.5,
          depth, baseScale: .22 + Math.pow(depth, 1.8) * .62,
          isLime: Math.random() < .18, pushX: 0, pushY: 0
        };
      }).sort((a, b) => a.depth - b.depth);
      const streamPoint = (t, w, h, headX, headY) => {
        const p0 = { x: w * -.05, y: h * .68 };
        const dxHead = headX - w * .76, dyHead = headY - h * .46;
        const p1 = { x: w * .22 + dxHead * .25, y: h * .14 + dyHead * .25 };
        const p2 = { x: w * .58 + dxHead * .65, y: h * .18 + dyHead * .65 };
        const p3 = { x: headX, y: headY };
        const u = 1 - t, tt = t * t, uu = u * u;
        const x = uu * u * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + tt * t * p3.x;
        const y = uu * u * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + tt * t * p3.y;
        const tx = 3 * uu * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * tt * (p3.x - p2.x);
        const ty = 3 * uu * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * tt * (p3.y - p2.y);
        const length = Math.hypot(tx, ty) || 1;
        return { x, y, angle: Math.atan2(ty, tx), nx: -ty / length, ny: tx / length };
      };
      const drawVortex = () => {
        vortexCtx.clearRect(0, 0, vortexWidth, vortexHeight);
        if (!reduceMotion) vortexTime += .016;
        if (!dragging) {
          star.x += (targetStar.x - star.x) * .015;
          star.y += (targetStar.y - star.y) * .015;
        }
        const speedGoal = hovered && !reduceMotion ? HOVER_SPEED : IDLE_SPEED;
        currentSpeed += (speedGoal - currentSpeed) * .045;
        const intensity = Math.max(0, (currentSpeed - IDLE_SPEED) / (HOVER_SPEED - IDLE_SPEED));
        const streamGlow = vortexCtx.createRadialGradient(star.x, star.y, 4, star.x, star.y, 210);
        streamGlow.addColorStop(0, `rgba(212,255,0,${.22 + intensity * .18})`);
        streamGlow.addColorStop(.35, `rgba(212,255,0,${.06 + intensity * .08})`);
        streamGlow.addColorStop(1, 'rgba(212,255,0,0)');
        vortexCtx.fillStyle = streamGlow;
        vortexCtx.fillRect(0, 0, vortexWidth, vortexHeight);
        cursors.forEach((cursor) => {
          if (!reduceMotion) { cursor.t += currentSpeed * cursor.speed; if (cursor.t > 1) cursor.t -= 1; }
          const t = cursor.t, point = streamPoint(t, vortexWidth, vortexHeight, star.x, star.y);
          const coneWidth = (1 - Math.pow(t, .85)) * 125 + 5;
          const wave = reduceMotion ? 0 : Math.sin(vortexTime * cursor.wobbleFreq + cursor.wobblePhase) * (1 - t) * 10;
          const spread = cursor.perpOffset * coneWidth * (cursor.isOutlier ? 1.85 : 1) + wave;
          let x = point.x + point.nx * spread, y = point.y + point.ny * spread;
          const dx = x - localMouse.x, dy = y - localMouse.y, distSq = dx * dx + dy * dy;
          const repulseRadius = 65;
          if (distSq < repulseRadius * repulseRadius && distSq > .1) {
            const dist = Math.sqrt(distSq), force = (1 - dist / repulseRadius) * 24 * cursor.depth;
            cursor.pushX += ((dx / dist) * force - cursor.pushX) * .22;
            cursor.pushY += ((dy / dist) * force - cursor.pushY) * .22;
          } else { cursor.pushX *= .88; cursor.pushY *= .88; }
          x += cursor.pushX; y += cursor.pushY;
          const alpha = (.18 + cursor.depth * .78) * Math.min(1, t * 4.5) * Math.min(1, (1 - t) * 7.5) * Math.max(.15, 1 - Math.abs(cursor.perpOffset) * .55);
          if (alpha <= .01) return;
          const scale = cursor.baseScale * (.55 + (1 - t) * .55);
          vortexCtx.save(); vortexCtx.translate(x, y);
          vortexCtx.rotate(point.angle + Math.PI * .75 + cursor.perpOffset * .28 * (1 - t));
          vortexCtx.globalAlpha = alpha;
          const sprite = cursor.isLime ? limeSprite : whiteSprite, size = 32 * scale;
          vortexCtx.drawImage(sprite, -6 * scale, -4 * scale, size, size);
          vortexCtx.restore();
        });
        vortexCtx.save();
        const pulse = 1 + (reduceMotion ? 0 : Math.sin(vortexTime * 2.5) * .06) + (dragging ? .25 : intensity * .18);
        const orb = vortexCtx.createRadialGradient(star.x, star.y, 1, star.x, star.y, 38 * pulse);
        orb.addColorStop(0, 'rgba(255,255,255,1)'); orb.addColorStop(.28, 'rgba(212,255,0,.85)');
        orb.addColorStop(.65, 'rgba(212,255,0,.18)'); orb.addColorStop(1, 'rgba(212,255,0,0)');
        vortexCtx.fillStyle = orb; vortexCtx.beginPath(); vortexCtx.arc(star.x, star.y, 38 * pulse, 0, Math.PI * 2); vortexCtx.fill();
        vortexCtx.fillStyle = '#FFFFFF'; vortexCtx.beginPath(); vortexCtx.arc(star.x, star.y, 6 * (1 + intensity * .15), 0, Math.PI * 2); vortexCtx.fill();
        vortexCtx.restore();
        if (hovered && localMouse.x > 0) {
          vortexCtx.save(); vortexCtx.strokeStyle = dragging ? '#FFFFFF' : '#D4FF00'; vortexCtx.lineWidth = 1.5;
          vortexCtx.beginPath(); vortexCtx.arc(localMouse.x, localMouse.y, dragging ? 14 : 10, 0, Math.PI * 2); vortexCtx.stroke();
          vortexCtx.fillStyle = dragging ? '#FFFFFF' : '#D4FF00'; vortexCtx.beginPath(); vortexCtx.arc(localMouse.x, localMouse.y, 2, 0, Math.PI * 2); vortexCtx.fill();
          vortexCtx.restore();
        }
      };
      const animateVortex = () => { drawVortex(); if (!reduceMotion) window.requestAnimationFrame(animateVortex); };
      const localPoint = (event) => {
        const rect = vortexCard.getBoundingClientRect();
        localMouse.x = event.clientX - rect.left; localMouse.y = event.clientY - rect.top;
      };
      vortexCard.addEventListener('pointerenter', () => { hovered = true; });
      vortexCard.addEventListener('pointerleave', () => {
        hovered = false; localMouse = { x: -999, y: -999 };
        if (dragging) { dragging = false; targetStar.x = defaultStar.x; targetStar.y = defaultStar.y; }
        if (reduceMotion) drawVortex();
      });
      vortexCard.addEventListener('pointermove', (event) => {
        localPoint(event);
        if (dragging) {
          targetStar.x = Math.max(30, Math.min(vortexWidth - 30, localMouse.x));
          targetStar.y = Math.max(30, Math.min(vortexHeight - 30, localMouse.y));
          star.x = targetStar.x; star.y = targetStar.y;
        }
        if (reduceMotion) drawVortex();
      }, { passive: true });
      vortexCard.addEventListener('pointerdown', (event) => {
        localPoint(event);
        if (Math.hypot(localMouse.x - star.x, localMouse.y - star.y) < 75) {
          dragging = true;
          targetStar.x = Math.max(30, Math.min(vortexWidth - 30, localMouse.x));
          targetStar.y = Math.max(30, Math.min(vortexHeight - 30, localMouse.y));
          star.x = targetStar.x; star.y = targetStar.y;
          if (vortexCard.setPointerCapture) vortexCard.setPointerCapture(event.pointerId);
          if (reduceMotion) drawVortex();
        }
      });
      vortexCard.addEventListener('keydown', (event) => {
        const step = event.shiftKey ? 28 : 12;
        const directions = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        const direction = directions[event.key];
        if (!direction) return;
        event.preventDefault();
        targetStar.x = Math.max(30, Math.min(vortexWidth - 30, targetStar.x + direction[0]));
        targetStar.y = Math.max(30, Math.min(vortexHeight - 30, targetStar.y + direction[1]));
        star.x = targetStar.x; star.y = targetStar.y;
        if (reduceMotion) drawVortex();
      });
      const releaseVortex = () => {
        if (!dragging) return;
        dragging = false; targetStar.x = defaultStar.x; targetStar.y = defaultStar.y;
        if (reduceMotion) drawVortex();
      };
      window.addEventListener('pointerup', releaseVortex);
      window.addEventListener('pointercancel', releaseVortex);
      window.addEventListener('resize', resizeVortex, { passive: true });
      resizeVortex();
      animateVortex();
    }
  }

  const motionTargets = [...document.querySelectorAll(
    'main .page-hero .eyebrow, main .page-hero h1, main .page-hero .lede, main .section-head, main .grid-3 > *, main .features-grid > *, main .product-card, main .price-card, main .detail-panel, main .supported-card, main .notice, main .strip, main .content-split > div, main .faq-list details, main .directory-group, main .buy-option, main .buy-summary'
  )];
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    motionTargets.forEach((el, index) => {
      el.classList.add('reveal');
      el.style.setProperty('--reveal-delay', `${(index % 5) * 65}ms`);
      revealObserver.observe(el);
    });
  } else {
    motionTargets.forEach((el) => el.classList.add('is-visible'));
  }

  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav-links');
  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      menuButton.textContent = open ? '×' : '☰';
    });
  }

  const navItems = [...document.querySelectorAll('[data-nav-item]')];
  const closeNavItems = (except) => navItems.forEach((item) => {
    if (item === except) return;
    item.classList.remove('is-open');
    const button = item.querySelector('[data-nav-toggle]');
    if (button) button.setAttribute('aria-expanded', 'false');
  });
  navItems.forEach((item) => {
    const button = item.querySelector('[data-nav-toggle]');
    if (!button) return;
    button.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      closeNavItems(item);
      item.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', `${open ? 'Close' : 'Open'} ${item.dataset.menu} menu`);
    });
    item.addEventListener('pointerenter', () => button.setAttribute('aria-expanded', 'true'));
    item.addEventListener('pointerleave', () => button.setAttribute('aria-expanded', String(item.classList.contains('is-open'))));
    item.addEventListener('focusin', () => button.setAttribute('aria-expanded', 'true'));
    item.addEventListener('focusout', (event) => {
      if (!item.contains(event.relatedTarget) && !item.classList.contains('is-open')) button.setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('[data-nav-item]')) closeNavItems();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    closeNavItems();
    if (nav?.classList.contains('open')) {
      nav.classList.remove('open');
      menuButton?.setAttribute('aria-expanded', 'false');
      menuButton?.setAttribute('aria-label', 'Open navigation');
      if (menuButton) menuButton.textContent = '☰';
    }
  });

  const toggle = document.querySelector('[data-pricing-toggle]');
  if (toggle) {
    const amounts = [...document.querySelectorAll('[data-monthly][data-annual]')];
    const notes = [...document.querySelectorAll('[data-billing-note]')];
    const setAnnual = (annual) => {
      toggle.setAttribute('aria-pressed', String(annual));
      toggle.setAttribute('aria-label', annual ? 'Switch to monthly billing' : 'Switch to annual billing');
      amounts.forEach((el) => { el.textContent = annual ? el.dataset.annual : el.dataset.monthly; });
      notes.forEach((el) => { el.textContent = annual ? 'Billed yearly · save 58%' : 'Billed monthly'; });
      document.querySelectorAll('[data-note]').forEach((el) => {
        el.textContent = annual ? 'per year' : 'per month';
      });
    };
    toggle.addEventListener('click', () => setAnnual(toggle.getAttribute('aria-pressed') !== 'true'));
    setAnnual(false);
  }

  const buyOptions = [...document.querySelectorAll('[data-select-plan]')];
  if (buyOptions.length) {
    const plans = {
      basic: { name: 'Pavio Basic', monthly: 2, annual: 10 },
      standard: { name: 'Pavio Standard', monthly: 4, annual: 20 },
      core: { name: 'Pavio Core', monthly: 6, annual: 30 },
      pro: { name: 'Pavio Pro', monthly: 8, annual: 40 }
    };
    const params = new URLSearchParams(window.location.search);
    let selected = plans[params.get('plan')] ? params.get('plan') : '';
    let billing = 'monthly';
    const name = document.querySelector('[data-buy-name]');
    const description = document.querySelector('[data-buy-description]');
    const price = document.querySelector('[data-buy-price]');
    const period = document.querySelector('[data-buy-period]');
    const status = document.querySelector('[data-buy-status]');
    const continueButton = document.querySelector('[data-buy-continue]');
    const renderSelection = () => {
      const plan = plans[selected];
      buyOptions.forEach((option) => {
        const active = option.dataset.selectPlan === selected;
        option.classList.toggle('selected', active);
        option.setAttribute('aria-pressed', String(active));
      });
      document.querySelectorAll('[data-buy-billing]').forEach((button) => {
        button.classList.toggle('selected', button.dataset.buyBilling === billing);
      });
      if (!plan) return;
      const amount = plan[billing];
      name.textContent = plan.name;
      description.textContent = billing === 'annual' ? 'Annual billing · charged once per year' : 'Monthly billing · charged each month';
      price.textContent = `$${amount}`;
      period.textContent = billing === 'annual' ? 'per year' : 'per month';
      continueButton.disabled = false;
      status.textContent = '';
    };
    buyOptions.forEach((option) => option.addEventListener('click', () => {
      selected = option.dataset.selectPlan;
      renderSelection();
    }));
    document.querySelectorAll('[data-buy-billing]').forEach((button) => button.addEventListener('click', () => {
      billing = button.dataset.buyBilling;
      renderSelection();
    }));
    if (continueButton) continueButton.addEventListener('click', () => {
      if (!plans[selected]) return;
      status.textContent = `${plans[selected].name} selected · ${billing === 'annual' ? 'annual' : 'monthly'} billing · $${plans[selected][billing]} ${billing === 'annual' ? 'per year' : 'per month'}.`;
    });
    renderSelection();
  }

  const directoryCards = [...document.querySelectorAll('[data-directory-card]')];
  const directorySearch = document.querySelector('[data-directory-search]');
  const directoryFilters = [...document.querySelectorAll('[data-directory-filter]')];
  if (directoryCards.length) {
    let selectedTopic = 'all';
    const result = document.querySelector('[data-directory-result]');
    const empty = document.querySelector('[data-directory-empty]');
    const updateDirectory = () => {
      const query = (directorySearch?.value || '').trim().toLowerCase();
      let visible = 0;
      directoryCards.forEach((card) => {
        const matchesTopic = selectedTopic === 'all' || card.dataset.topic === selectedTopic;
        const matchesQuery = !query || card.textContent.toLowerCase().includes(query);
        card.hidden = !(matchesTopic && matchesQuery);
        if (!card.hidden) visible += 1;
      });
      if (result) result.textContent = `Showing ${visible} of ${directoryCards.length} guides`;
      if (empty) empty.hidden = visible !== 0;
    };
    directorySearch?.addEventListener('input', updateDirectory);
    directoryFilters.forEach((button) => button.addEventListener('click', () => {
      selectedTopic = button.dataset.directoryFilter || 'all';
      directoryFilters.forEach((item) => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      updateDirectory();
    }));
    updateDirectory();
  }

  const allowanceSelect = document.querySelector('[data-allowance-select]');
  if (allowanceSelect) {
    const allowanceData = {
      basic: { weekly: 'No access', monthly: 'No access', hosting: 'On by default', control: 'No off switch' },
      standard: { weekly: '2 GB', monthly: '5 GB', hosting: 'On by default', control: 'No off switch' },
      core: { weekly: '5 GB', monthly: '15 GB', hosting: 'On by default', control: 'No off switch' },
      pro: { weekly: '10 GB', monthly: '30 GB', hosting: 'On by default', control: 'Can turn off' }
    };
    const updateAllowance = () => {
      const data = allowanceData[allowanceSelect.value] || allowanceData.basic;
      document.querySelector('[data-weekly]').textContent = data.weekly;
      document.querySelector('[data-monthly]').textContent = data.monthly;
      document.querySelector('[data-hosting]').textContent = data.hosting;
      document.querySelector('[data-host-control]').textContent = data.control;
    };
    allowanceSelect.addEventListener('change', updateAllowance);
    updateAllowance();
  }

  const siteTierSelect = document.querySelector('[data-site-tier]');
  if (siteTierSelect) {
    const note = document.querySelector('[data-site-tier-note]');
    const table = siteTierSelect.closest('section')?.querySelector('table');
    const updateSiteTier = () => {
      if (!table) return;
      const column = { basic: 1, standard: 2, core: 3, pro: 4 }[siteTierSelect.value];
      table.querySelectorAll('tr').forEach((row) => row.querySelectorAll('th,td').forEach((cell, index) => {
        cell.classList.toggle('selected-tier-cell', column !== undefined && index === column);
      }));
      if (note) note.textContent = column === undefined ? 'Showing access across all plans' : `Highlighting ${siteTierSelect.value[0].toUpperCase()}${siteTierSelect.value.slice(1)} access; unspecified entries stay visible`;
    };
    siteTierSelect.addEventListener('change', updateSiteTier);
    updateSiteTier();
  }

  const launchFilters = [...document.querySelectorAll('[data-launch-filter]')];
  const launchSites = [...document.querySelectorAll('[data-launch-site]')];
  if (launchFilters.length && launchSites.length) {
    launchFilters.forEach((button) => button.addEventListener('click', () => {
      const topic = button.dataset.launchFilter;
      launchFilters.forEach((filter) => {
        const active = filter === button;
        filter.classList.toggle('is-active', active);
        filter.setAttribute('aria-pressed', String(active));
      });
      launchSites.forEach((site) => {
        const siteTopic = site.dataset.topic;
        const matches = topic === 'all' || siteTopic === topic || (topic === 'reading-writing' && ['reading','writing'].includes(siteTopic));
        site.hidden = !matches;
      });
    }));
  }

  // Shared Supabase Auth. Only the browser-safe publishable key is used here.
  const config = window.PAVIO_SUPABASE_CONFIG;
  const sdk = window.supabase;
  const client = config && sdk?.createClient ? sdk.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  }) : null;
  const guestLinks = [...document.querySelectorAll('[data-auth-guest]')];
  const memberEls = [...document.querySelectorAll('[data-auth-member]')];
  const emailLabel = document.querySelector('[data-auth-email]');
  const renderAuth = (session) => {
    guestLinks.forEach((el) => { el.hidden = Boolean(session); });
    memberEls.forEach((el) => { el.hidden = !session; });
    if (emailLabel) emailLabel.textContent = session?.user?.user_metadata?.username || 'Signed in';
  };
  if (client) {
    client.auth.getSession().then(({ data }) => renderAuth(data?.session || null));
    client.auth.onAuthStateChange((_event, session) => renderAuth(session));
  } else renderAuth(null);
  const signOut = document.querySelector('[data-auth-signout]');
  if (signOut && client) signOut.addEventListener('click', async () => {
    signOut.disabled = true;
    const { error } = await client.auth.signOut();
    signOut.disabled = false;
    if (error) window.alert('Could not sign out right now. Please try again.');
  });

  const authForm = document.querySelector('[data-auth-form]');
  if (authForm) {
    const params = new URLSearchParams(window.location.search);
    const heading = document.querySelector('[data-auth-heading]');
    const description = document.querySelector('[data-auth-description]');
    const message = document.querySelector('[data-auth-message]');
    const confirmField = document.querySelector('[data-confirm-field]');
    const submit = authForm.querySelector('[type=submit]');
    const tabs = [...document.querySelectorAll('[data-auth-tab]')];
    const candidate = params.get('next') || '';
    const next = /^[a-z0-9-]+\.html$/i.test(candidate) && !/^auth\.html$/i.test(candidate) ? candidate : 'index.html';
    let mode = params.get('mode') === 'signup' ? 'signup' : 'signin';
    const tell = (text, state = '') => { message.textContent = text; message.dataset.state = state; };
    const setMode = (value) => {
      mode = value === 'signup' ? 'signup' : 'signin';
      confirmField.hidden = mode !== 'signup';
      heading.textContent = mode === 'signup' ? 'Create your account' : 'Welcome back';
      description.textContent = mode === 'signup' ? 'Set up your Pavio account to keep your study tools and plan in one place.' : 'Sign in to continue to your Pavio study space.';
      submit.textContent = mode === 'signup' ? 'Create account' : 'Sign in';
      tabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.authTab === mode)));
      tell('');
    };
    tabs.forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.authTab)));
    setMode(mode);
    authForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!client) { tell('Account access is temporarily unavailable. Please try again later.', 'error'); return; }
      const username = authForm.elements.username.value.trim().toLowerCase();
      const password = authForm.elements.password.value;
      if (!/^[a-z0-9][a-z0-9._-]{1,22}[a-z0-9]$/.test(username)) { tell('Use a username with 3–24 letters, numbers, dots, underscores, or hyphens.', 'error'); return; }
      if (mode === 'signup' && password !== authForm.elements.confirmPassword.value) { tell('Those passwords do not match.', 'error'); return; }
      submit.disabled = true;
      tell(mode === 'signup' ? 'Creating your account…' : 'Signing you in…');
      try {
        const accountEmail = `pavio_${username}@accounts.invalid`;
        if (mode === 'signup') {
          const functionName = config?.signupFunction || 'pavio-username-signup';
          const { error } = await client.functions.invoke(functionName, { body: { username, password } });
          if (error) throw error;
          const { error: signInError } = await client.auth.signInWithPassword({ email: accountEmail, password });
          if (signInError) throw signInError;
          window.location.assign(next);
        } else {
          const { error } = await client.auth.signInWithPassword({ email: accountEmail, password });
          if (error) throw error;
          window.location.assign(next);
        }
      } catch (error) {
        let raw = String(error?.message || 'Please try again.');
        if (error?.context && typeof error.context.json === 'function') {
          try { raw = String((await error.context.json()).error || raw); } catch { /* keep the safe fallback message */ }
        }
        const safeError = /invalid login credentials/i.test(raw) ? 'Username or password is incorrect.' : /already exists|already registered|unavailable/i.test(raw) ? 'That username is unavailable. Try signing in or choose another.' : raw;
        tell(safeError, 'error');
      } finally { submit.disabled = false; }
    });
  }
})();
