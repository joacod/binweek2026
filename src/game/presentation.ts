import { prepareImages, validateImageDimensions, type PreparedImages } from '../engine/browser/images.ts';
import { urls, sizes } from './art.ts';
import type { Run, FlightEvent } from './game.ts';
import { flight, viewScale, fragmentShape } from './content.ts';
import type { CollectibleCell } from './collection.ts';
import { minePosition, passageCenter, chapterAt, journeyLegs, type Passage } from './route.ts';

/** Whole-cel roles, drawing footprints and anchors are independent of physics. */
const courier = { cell: 512, size: 94, anchorX: .55, anchorY: .60, glide: [0, 3], thrust: [1, 3] } as const;
const beacon = { size: 124, anchorX: .52 } as const;
interface Spark { x: number; y: number; vx: number; vy: number; start: number; life: number; color: string }
interface ScorePop { x: number; y: number; start: number; points: number }
interface Viewport { width: number; height: number; ratio: number }

/** Saved simulation time makes chapter dissolves pause/retry safe and independent of lookahead. */
export function coastalBlend(checkpoints: number, elapsed: number, checkpointElapsed: number) {
  const current = chapterAt(checkpoints);
  const changing = checkpoints > 0 && checkpoints < journeyLegs;
  const progress = changing ? Math.max(0, Math.min(1, (elapsed - checkpointElapsed) / 4)) : 1;
  return { current, previous: changing ? current - 1 : current, mix: progress * progress * (3 - 2 * progress) };
}

/** Continuous, bounded travel. Landmark plates never wrap, mirror, or reverse. */
export function coastalPan(distance: number, width: number, reducedMotion = false) {
  return -width * .28 * (reducedMotion ? .5 : 1 - Math.exp(-Math.max(0, distance) / 14000));
}
const wingbeat = [0, 1, 2, 1, 0, 1, 1, 1] as const;
export function gullFrame(elapsed: number, phase: number, reducedMotion = false) {
  return reducedMotion ? 1 : wingbeat[Math.floor((elapsed * 7 + phase) % wingbeat.length)]!;
}

export function flightView(width: number, height: number) {
  const scale = viewScale(width, height);
  const y = (height - flight.height * scale) / 2;
  return { scale, width: width / scale, y, top: -y / scale, bottom: (height - y) / scale,
    x: Math.max(0, width / scale * .2 - flight.playerX) };
}

/** Simulation retires hazards behind the flight slots; artwork lives to the viewport edge. */
export function createPassageViews() {
  const passages = new Map<number, Passage>();
  return {
    update(current: readonly Passage[], distance: number, left: number) {
      for (const passage of current) passages.set(passage.id, passage);
      for (const [id, passage] of passages) {
        const right = passage.pattern === 'breather'
          ? passage.x + passage.width + flight.radius + beacon.size * (1 - beacon.anchorX)
          : passage.pattern === 'drift' ? passage.x + passage.width / 2 + 58
          : passage.x + passage.width;
        if (right - distance < left) passages.delete(id);
      }
      return passages.values();
    },
    clear() { passages.clear(); },
  };
}

export function createPresentation(surface: HTMLElement) {
  const element = document.createElement('canvas'); element.className = 'cloudwake-canvas'; element.setAttribute('aria-hidden', 'true');
  const context = element.getContext('2d');
  if (!context) throw new Error('Canvas 2D unavailable');
  const ctx = context;
  const lifetime = new AbortController();
  let art: PreparedImages | undefined, pending: Promise<void> | undefined;
  let masonry: CanvasPattern | null = null;
  function prepare(): Promise<void> {
    if (art) return Promise.resolve();
    if (pending) return pending;
    pending = (async () => {
      const prepared = await prepareImages(urls, lifetime.signal, dimensions => validateImageDimensions(dimensions, sizes));
      if (lifetime.signal.aborted) { prepared.dispose(); return; }
      masonry = ctx.createPattern(prepared.images.quartzite!, 'repeat');
      if (!masonry) { prepared.dispose(); throw new Error('Stone material unavailable'); }
      masonry.setTransform(new DOMMatrix().scale(.25));
      art = prepared;
    })().finally(() => { pending = undefined; });
    return pending;
  }
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const sparks: Spark[] = [];
  const scores: ScorePop[] = [];
  const passages = createPassageViews();
  // A gameplay miss ends collection eligibility, not the gem's visible lifetime.
  // Keep its cosmetic image until the actual viewport edge eats it, including
  // the extra space behind the courier on wide displays.
  const missedFragments: { x: number; y: number; cell: CollectibleCell }[] = [];
  let disposed = false, lastTime = 0, crashTime = -Infinity, checkpointTime = -Infinity, checkpointAt = NaN;
  surface.append(element);
  function reset() { passages.clear(); sparks.length = scores.length = missedFragments.length = 0; lastTime = 0; crashTime = checkpointTime = -Infinity; checkpointAt = NaN; }
  function consume(events: readonly FlightEvent[]) {
    for (const event of events) {
      if (event.type === 'fragment-missed') { missedFragments.push({ x: event.x, y: event.y, cell: event.cell }); continue; }
      if (event.type === 'crash') crashTime = lastTime;
      if (event.type === 'checkpoint') { checkpointTime = lastTime; checkpointAt = event.x; }
      if (event.type === 'pickup' && scores.length < 12) scores.push({ x: event.x, y: event.y, start: lastTime, points: event.points });
      if (motion.matches || event.type === 'checkpoint' || event.type === 'victory') continue;
      const count = event.type === 'crash' || event.type === 'shield-hit' ? 22 : 7;
      for (let i = 0; i < count && sparks.length < 90; i++) {
        const angle = i / count * Math.PI * 2;
        sparks.push({ x: event.x, y: event.y, vx: Math.cos(angle) * (40 + i * 4), vy: Math.sin(angle) * (40 + i * 4),
          start: lastTime, life: event.type === 'crash' ? .7 : .45, color: event.type === 'crash' ? '#ffca8b' : '#b1fff2' });
      }
    }
  }
  function draw(run: Run, viewport: Viewport, titleTime?: number, outcomeAge = 0) {
    if (disposed) return;
    const { width, height } = viewport;
    const ratio = Math.min(2, viewport.ratio);
    const backingWidth = Math.max(1, Math.round(width * ratio)), backingHeight = Math.max(1, Math.round(height * ratio));
    if (element.width !== backingWidth || element.height !== backingHeight) { element.width = backingWidth; element.height = backingHeight; }
    const images = art?.images ?? {};
    if (!images.courier) return;
    lastTime = run.elapsed;
    const time = titleTime ?? run.elapsed + Math.min(run.status === 'victory' ? 4 : .8, outcomeAge), decorative = motion.matches ? 0 : time;
    const distance = titleTime !== undefined ? decorative * 38 : run.distance;
    const view = flightView(width, height);
    ctx.reset();
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    // Keep live transforms bilinear; high-quality resampling stalls large Retina canvases.
    ctx.imageSmoothingQuality = 'low';
    ctx.fillStyle = '#79bbcd'; ctx.fillRect(0, 0, width, height);
    // Slow continuous landmark travel, faster water and nearest shoreline props.
    // All five plates share the same projection and dissolve as complete scenes.
    const skyWidth = width * 1.28, skyHeight = skyWidth / 1.5;
    const skyY = height - skyHeight;
    const skyX = coastalPan(distance, width, motion.matches);
    const travel = motion.matches ? 0 : distance * view.scale;
    const plates = [images.sky!, images.grande!, images.varese!, images.beach!, images.central!];
    const skyColors = ['#90c6d8', '#88bdd0', '#88bdd0', '#86bcd0', '#7fbedb'];
    const blend = titleTime !== undefined ? { current: 0, previous: 0, mix: 1 }
      : coastalBlend(run.checkpoint.number, run.elapsed, run.checkpoint.state.elapsed);
    function panorama(index: number, opacity: number) {
      ctx.globalAlpha = opacity;
      if (skyY > 0) { ctx.fillStyle = skyColors[index]!; ctx.fillRect(0, 0, width, skyY + 1); }
      ctx.drawImage(plates[index]!, skyX, skyY, skyWidth, skyHeight);
      if (skyY > 0) {
        const edge = ctx.createLinearGradient(0, skyY, 0, skyY + skyHeight * .12);
        edge.addColorStop(0, skyColors[index]!); edge.addColorStop(1, `${skyColors[index]}00`);
        ctx.fillStyle = edge; ctx.fillRect(0, skyY, width, skyHeight * .12);
      }
      // Small distant clouds and foam streaks have independent depth speeds.
      ctx.fillStyle = '#fff8e9'; ctx.globalAlpha = opacity * .22;
      for (let i = 0; i < 4; i++) {
        const span = width + 300, x = ((i * 439 - travel * .045) % span + span) % span - 150;
        const y = height * (.14 + (i % 3) * .14);
        ctx.beginPath(); ctx.ellipse(x, y, 55 + i * 7, 4, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = '#f3ffef'; ctx.lineWidth = 1.2;
      for (let row = 0; row < 3; row++) {
        ctx.globalAlpha = opacity * (.18 + row * .04);
        for (let i = 0; i < 7; i++) {
          const span = width + 220, x = ((i * 211 + row * 79 - travel * (.1 + row * .07)) % span + span) % span - 110;
          const y = height - skyHeight * (.22 - row * .035);
          ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 22, y + 3, x + 55, y); ctx.stroke();
        }
      }
      // Whole authored props pass at shoreline speed; only generic scenery repeats.
      const propSize = Math.max(88, Math.min(180, width * .16));
      for (let i = 0; i < 3; i++) {
        const span = width + 680, x = ((i * 683 - travel * .24) % span + span) % span - 280;
        const cell = i === 1 ? 3 : index === 0 ? 0 : index === 4 ? 2 : 1;
        ctx.globalAlpha = opacity * .92;
        const baseline = cell === 0 ? height - skyHeight * .11 + (motion.matches ? 0 : Math.sin(time * 1.6 + i) * 2) : height + 12;
        ctx.drawImage(images.scenery!, cell % 2 * 512, Math.floor(cell / 2) * 512, 512, 512,
          x, baseline - propSize, propSize, propSize);
      }
      ctx.globalAlpha = opacity;
    }
    if (blend.mix < 1) panorama(blend.previous, 1);
    if (blend.mix > 0) panorama(blend.current, blend.mix);
    ctx.globalAlpha = 1;
    ctx.setTransform(view.scale * ratio, 0, 0, view.scale * ratio, view.x * view.scale * ratio, view.y * ratio);
    const worldWidth = view.width;
    function bee(frame: number, x: number, y: number, size: number = courier.size, flip = false) {
      ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
      ctx.drawImage(images.courier!, frame % 2 * 512, Math.floor(frame / 2) * 512, 512, 512,
        -size * courier.anchorX, -size * courier.anchorY, size, size); ctx.restore();
    }
    function label(text: string, x: number, y: number, font = 10) {
      ctx.font = `700 ${font}px system-ui`; ctx.textAlign = 'center';
      const w = ctx.measureText(text).width + 18;
      ctx.fillStyle = '#fff8e9f0'; ctx.fillRect(x - w / 2, y - 13, w, 22);
      ctx.fillStyle = '#4a4a4a'; ctx.fillText(text, x, y + 2);
    }
    function reviewer(x: number, y: number, size = 1) {
      ctx.drawImage(images.reviewer!, x - 62 * size, y - 62 * size, 124 * size, 62 * size);
    }
    // Passing vignettes share continuous saved distance, fading with their coastal place.
    if (titleTime === undefined && run.status !== 'victory') {
      const scenicX = motion.matches ? worldWidth - view.x - 120
        : worldWidth - view.x + 180 - (distance * .24 % (worldWidth + 500));
      const scenicY = (height - Math.max(64 * view.scale, skyHeight * .1) - view.y) / view.scale;
      function workstation(leg: number, opacity: number) {
        ctx.globalAlpha = opacity;
        ctx.save(); ctx.translate(0, scenicY - 533);
        bee(0, scenicX + 24, 510 + Math.sin(decorative * 2) * 2, 49, true);
        ctx.fillStyle = '#996742'; ctx.fillRect(scenicX - 42, 533, 90, 5);
        ctx.fillRect(scenicX - 35, 538, 4, 17); ctx.fillRect(scenicX + 37, 538, 4, 17);
        ctx.fillStyle = '#394b50'; ctx.beginPath(); ctx.roundRect(scenicX - 26, 505, 36, 27, 3); ctx.fill();
        ctx.fillStyle = '#b1fff2'; ctx.font = '800 11px monospace'; ctx.textAlign = 'center';
        ctx.fillText(leg >= 3 ? 'AI' : '</>', scenicX - 8, 523);
        ctx.fillStyle = '#607a7c'; ctx.fillRect(scenicX - 30, 531, 44, 3);
        if (leg === 0 || leg === 4) reviewer(scenicX - 79, 548, .8);
        if (leg === 0) ctx.drawImage(images.objects!, 0, 512, 512, 512, scenicX - 64, 500, 38, 34);
        const captions = ['while (rabas) { repeat; }', 'git checkout -- playa', 'Surfing the context window.', 'Prompt: más churros.', 'LLM: Lobo Language Model'];
        label(captions[leg]!, scenicX - 12, 574, Math.max(10, 9 / view.scale));
        ctx.restore();
      }
      if (blend.mix < 1) workstation(blend.previous, 1 - blend.mix);
      if (blend.mix > 0) workstation(blend.current, blend.mix);
      ctx.globalAlpha = 1;
    }
    function drawBeacon(frame: number, x: number, y: number) {
      ctx.save(); ctx.translate(x,y);
      ctx.fillStyle = frame ? '#F59E2B' : '#fff8e9'; ctx.strokeStyle = '#a4661c'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(-22,-28,44,56,12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4a4a4a'; ctx.font='900 34px system-ui'; ctx.textAlign='center'; ctx.fillText('#',0,12);
      ctx.fillStyle='#f59e2b'; ctx.beginPath(); ctx.moveTo(-8,-31);ctx.lineTo(0,-43);ctx.lineTo(8,-31);ctx.fill(); ctx.restore();
    }
    function stone(x: number, y: number, w: number, h: number, ceiling: boolean) {
      // Promenade masonry: the full rectangle stays solid. The material is
      // anchored to the moving pier, while cornices stay inside its hit shape.
      ctx.save(); ctx.translate(x, ceiling ? y + h : y);
      const top = ceiling ? -h : 0;
      ctx.fillStyle = masonry!; ctx.fillRect(0, top, w, h);
      const shade = ctx.createLinearGradient(0, 0, w, 0);
      shade.addColorStop(0, '#fff4d94d'); shade.addColorStop(.12, '#fff4d90a');
      shade.addColorStop(.75, '#6747330a'); shade.addColorStop(1, '#59432f80');
      ctx.fillStyle = shade; ctx.fillRect(0, top, w, h);
      function band(inset: number, offset: number, depth: number, color: string) {
        ctx.fillStyle = color; ctx.fillRect(inset, ceiling ? -offset - depth : offset, w - inset * 2, depth);
      }
      // Pale stepped stone molding, with a terracotta lip at the flight edge.
      band(0, 0, 3, '#9f503b'); band(0, 3, 5, '#cd8258');
      band(0, 8, 3, '#f6dfb8'); band(0, 11, 7, '#ddc098');
      band(3, 18, 4, '#a08060'); band(6, 22, 8, '#ead2ac');
      band(6, 30, 2, '#967558');
      // Shallow dressed-stone borders, rather than window-like empty holes.
      ctx.fillStyle = '#fff1d42b'; ctx.fillRect(3, top, 7, h); ctx.fillRect(w - 13, top, 5, h);
      ctx.strokeStyle = '#765d46a6'; ctx.lineWidth = 1;
      ctx.strokeRect(.5, top + .5, w - 1, h - 1);
      ctx.restore();
    }
    const destination = run.passages.find(p => p.leg === 4 && p.pattern === 'breather');
    if (destination && run.checkpoint.number === 4) {
      const arrivalX = destination.x - distance + 170;
      ctx.drawImage(images.hotel!, arrivalX, 225, 430, 287);
      for(let i=0;i<8;i++) bee(i%4,arrivalX+60+i*38,535,45,i%2===0);
    }
    if (run.status === 'victory') {
      // Fit the complete landmark and bounded crowd into the visible CSS viewport.
      const left=-view.x, available=worldWidth, center=left+available/2;
      const hotelWidth=Math.min(available*.96,600), hotelHeight=hotelWidth/1.5;
      ctx.fillStyle='#e5cea0';ctx.fillRect(left,445,available,height/view.scale);
      ctx.drawImage(images.hotel!,center-hotelWidth/2,445-hotelHeight,hotelWidth,hotelHeight);
      const columns=available<700?9:13, rows=3, spacing=Math.min(57,(available-36)/columns);
      for(let row=0;row<rows;row++) for(let col=0;col<columns;col++) {
        const id=row*columns+col, x=center+(col-(columns-1)/2)*spacing+(row%2?5:-5);
        const y=454+row*29+(motion.matches?0:Math.sin(decorative*2.4+id)*3);
        bee(id%4,x,y,Math.min(56,spacing*1.55),id%3===0);
        if(id%7===0) {ctx.fillStyle='#f59e2b';ctx.fillRect(x+7,y+4,8,7);}
        if(id%11===0) {ctx.fillStyle='#3b818b';ctx.fillRect(x-5,y+8,18,4);}
      }
      reviewer(center-hotelWidth*.42,524,.7);
      ctx.fillStyle='#8e6040';ctx.fillRect(center+hotelWidth*.32,505,65,6);ctx.fillRect(center+hotelWidth*.32+7,511,3,20);ctx.fillRect(center+hotelWidth*.32+55,511,3,20);
      for(let i=0;i<4;i++)ctx.drawImage(images.objects!,0,0,512,512,center+hotelWidth*.32+i*13,488,20,20);
      label('Merienda deployed.',center+hotelWidth*.32+32,550,9);
      if(!motion.matches && outcomeAge<4) for(let i=0;i<44;i++) {
        const t=Math.min(4,outcomeAge), x=left+((i*137.3+t*12)%available), y=70+((i*41+t*(30+i%5*5))%410);
        ctx.fillStyle=['#F59E2B','#f8c477','#fff8e9','#4a4a4a'][i%4]!;ctx.fillRect(x,y,3,7);
      }
      if(!motion.matches && outcomeAge<3.5) {
        const t=Math.min(1,outcomeAge/3.5);bee(1,center-available*.35*(1-t),370+110*t,84);
      }
      return;
    }
    for (const passage of passages.update(run.passages, distance, -view.x)) {
      const x = passage.x - distance;
      if (x > worldWidth + 120 || x + passage.width < -view.x - 120) continue;
      if (passage.pattern === 'breather') {
        const markerX = x + passage.width + flight.radius;
        const markerWorld = passage.x + passage.width + flight.radius;
        const active = passage.cleared;
        const age = active && Math.abs(markerWorld - checkpointAt) < 90 ? time - checkpointTime : Infinity;
        // One opening, one bloom, then the steady event badge. The activation is not a loop.
        const frame = !active ? 0 : motion.matches || age >= .48 ? 2 : age < .16 ? 1 : 3;
        ctx.fillStyle = active ? '#9cf6e230' : '#ffdf9820';
        ctx.beginPath(); ctx.ellipse(markerX, 108, 30, 34, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = !active || motion.matches ? 1 : .9 + Math.sin(time * 2.2) * .1;
        drawBeacon(frame, markerX, 108);
        ctx.globalAlpha = 1;
        if (active && !motion.matches && age < .5) {
          const t = age / .5;
          ctx.strokeStyle = `rgb(177 255 242 / ${Math.max(0, 1 - t)})`; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(markerX, 108, 16 + t * 34, 18 + t * 26, 0, 0, Math.PI * 2); ctx.stroke();
        }
        continue;
      }
      if (passage.pattern === 'drift') {
        const point = minePosition(passage, run.elapsed);
        const frame = gullFrame(decorative, passage.phase, motion.matches);
        ctx.save(); ctx.translate(point.x-distance,point.y);
        // Bank slightly into the existing flight path. The body pivot stays on the hazard.
        ctx.rotate(motion.matches ? 0 : -Math.cos(run.elapsed * 1.7 + passage.phase) * .065);
        ctx.drawImage(images.gull!,frame*512,0,512,512,-58,-58*280/256,116,116);
        ctx.restore();
      } else {
        const center = passageCenter(passage, run.elapsed), upper = center - passage.gap / 2, lower = center + passage.gap / 2;
        if (passage.pattern === 'rise' || passage.pattern === 'gate' || passage.pattern === 'sway') stone(x, lower, passage.width, view.bottom - lower + 1, false);
        if (passage.pattern === 'dive' || passage.pattern === 'gate' || passage.pattern === 'sway') {
          stone(x, view.top - 1, passage.width, upper - view.top + 1, true);
        }
      }
    }
    function drawFragment(fragment: { x: number; y: number; cell: CollectibleCell }) {
      const x = fragment.x - distance;
      if (x + fragmentShape.halfWidth < -view.x || x - fragmentShape.halfWidth > worldWidth - view.x) return;
      ctx.globalAlpha = 1;
      const cell = fragment.cell;
      const tilt = motion.matches ? 0 : Math.sin(time * 2.5 + fragment.x) * .045;
      ctx.save(); ctx.translate(x,fragment.y); ctx.rotate(tilt);
      ctx.drawImage(images.objects!, cell % 2 * 512, Math.floor(cell / 2) * 512,512,512,-20,-20,40,40);
      ctx.restore();
    }
    for (const fragment of run.fragments) if (!fragment.collected) drawFragment(fragment);
    let retained = 0;
    for (const fragment of missedFragments) {
      if (fragment.x - distance + fragmentShape.halfWidth < -view.x) continue;
      missedFragments[retained++] = fragment; drawFragment(fragment);
    }
    missedFragments.length = retained;
    ctx.globalAlpha = 1;
    const playerX = titleTime !== undefined ? worldWidth * .72 - view.x : run.player.x;
    const playerY = titleTime !== undefined ? 230 + Math.sin(decorative * 1.8) * 12 : run.player.y;
    const shieldLeft = run.shieldUntil - run.elapsed;
    if (titleTime === undefined && shieldLeft > 0) {
      const fade = Math.min(1, shieldLeft / .7);
      ctx.globalAlpha = fade; ctx.strokeStyle = '#b8fff2'; ctx.lineWidth = 1.5;
      const glass = ctx.createRadialGradient(playerX - 20, playerY - 22, 2, playerX - 6, playerY - 5, 48);
      glass.addColorStop(0, '#e6fff92e'); glass.addColorStop(.7, '#a4fff008'); glass.addColorStop(1, '#c5fff940');
      ctx.fillStyle = glass;
      ctx.beginPath(); ctx.ellipse(playerX - 7, playerY - 5, 48, 42, -.12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (!motion.matches && run.thrust && run.status === 'active' && titleTime === undefined) {
      ctx.lineCap = 'round'; ctx.strokeStyle = '#bcfff1aa'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const pulse = (time * 95 + i * 23) % 70;
        ctx.globalAlpha = (1 - pulse / 70) * .55;
        ctx.beginPath(); ctx.moveTo(playerX - 28 - pulse, playerY + 10 + i * 4); ctx.lineTo(playerX - 40 - pulse, playerY + 10 + i * 4); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    const frames = run.thrust ? courier.thrust : courier.glide;
    const frame = time - (scores.at(-1)?.start ?? -Infinity) < .18 ? 2 : frames[motion.matches ? 0 : Math.floor(time * (run.thrust ? 9 : 3)) % frames.length]!;
    ctx.save(); ctx.translate(playerX, playerY);
    const tilt = motion.matches || titleTime !== undefined ? 0 : Math.max(-.19, Math.min(.22, run.player.vy / 1500));
    ctx.rotate(tilt);
    ctx.drawImage(images.courier, frame % 2 * courier.cell, Math.floor(frame / 2) * courier.cell, courier.cell, courier.cell,
      -(titleTime !== undefined ? 160 : courier.size) * courier.anchorX, -(titleTime !== undefined ? 160 : courier.size) * courier.anchorY, titleTime !== undefined ? 160 : courier.size, titleTime !== undefined ? 160 : courier.size);
    ctx.restore();
    let keep = 0;
    for (const spark of sparks) {
      const age = time - spark.start;
      if (age > spark.life) continue;
      sparks[keep++] = spark;
      ctx.globalAlpha = Math.max(0, 1 - age / spark.life); ctx.fillStyle = spark.color;
      ctx.beginPath(); ctx.arc(spark.x - distance + spark.vx * age, spark.y + spark.vy * age + 45 * age * age, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    sparks.length = keep; ctx.globalAlpha = 1;
    keep = 0;
    for (const score of scores) {
      const age = time - score.start;
      if (age > .75) continue;
      scores[keep++] = score;
      ctx.globalAlpha = Math.max(0, 1 - age / .75); ctx.font = '800 13px system-ui'; ctx.textAlign = 'center';
      const x = score.x - distance, y = score.y - 24 - (motion.matches ? 0 : age * 28);
      ctx.lineWidth = 3; ctx.strokeStyle = '#173c43'; ctx.strokeText(`+${score.points}`, x, y);
      ctx.fillStyle = '#fff1bc'; ctx.fillText(`+${score.points}`, x, y);
    }
    scores.length = keep; ctx.globalAlpha = 1;
    if (time - checkpointTime < 2.5) label('Checkpoint committed.', playerX + 100, 160);
    if (run.elapsed < 3.2 && titleTime === undefined && run.status === 'active') {
      ctx.fillStyle = '#123d49d9'; ctx.font = '600 12px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('HOLD TO RISE · SLIDE SIDEWAYS', Math.min(Math.max(playerX + 46, 70), 300), Math.min(Math.max(playerY - 36, 78), 520));
    }
    if (!motion.matches && time - crashTime < .18) {
      ctx.globalAlpha = (1 - (time - crashTime) / .18) * .25; ctx.fillStyle = '#ffecd0'; ctx.fillRect(-view.x, 0, worldWidth, flight.height); ctx.globalAlpha = 1;
    }
  }
  return { element, prepare, draw, consume, reset,
    dispose() { if (disposed) return; disposed = true; lifetime.abort(); art?.dispose(); art = undefined; masonry = null; passages.clear(); sparks.length = scores.length = missedFragments.length = 0; element.remove(); element.width = element.height = 0; },
  };
}
