import React, { useEffect, useRef } from 'react';
import { geoPath } from 'd3-geo';
import { geoAlbersUsaTerritories } from 'd3-composite-projections';
import { quadtree } from 'd3-quadtree';
import { range, quantileSorted } from 'd3-array';
import { select, pointer } from 'd3-selection';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import 'd3-transition';
import { feature, mesh } from 'topojson-client';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { STATES, NO_DATA } from '../data/schoolAtlasModel';
import './SchoolMap.css';

// Canvas map of every school. Drawing ~100k points needs a canvas and d3-zoom,
// so this component keeps its own imperative state in refs; everything it shows
// (which schools, their color bins, the selection) comes in through props.

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = value => String(value ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function themeColors() {
  const css = getComputedStyle(document.documentElement);
  const get = name => css.getPropertyValue(name).trim();
  const daylight = document.documentElement.dataset.theme === 'daylight';
  return {
    bg: get('--bg-base'), land: get('--bg-card'), stateBorder: get('--text-muted'), countyBorder: get('--border'),
    ink: get('--text-primary'), accent: get('--accent'), noData: daylight ? '#a8b0bc' : '#5b6676',
  };
}

// `focus` is { key, state }: when key changes the map zooms to the schools currently
// shown (a state or a place), or back out when it's empty; `state` gets an outline.
export default function SchoolMap({ D, topo, shown, cls, bins, selected, onSelect, focus, flyTo }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const tipRef = useRef(null);
  const whereRef = useRef(null);
  const engine = useRef(null);
  const latest = useRef({});
  latest.current = { shown, cls, bins, selected, onSelect };

  // Set up projection, zoom, resizing and pointer handling once the data has loaded.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const ctx = canvas.getContext('2d');
    const e = {
      W: 1, H: 1, dpr: 1, transform: zoomIdentity, quad: null, hover: -1, frame: 0, colors: themeColors(),
      X: new Float32Array(D.n), Y: new Float32Array(D.n), stateShapes: {}, stateLabels: [], countyShapes: [],
    };
    engine.current = e;
    const nation = feature(topo, topo.objects.nation);
    const abbrOf = Object.fromEntries(Object.entries(STATES).map(([abbr, name]) => [name, abbr]));

    function layout() {
      const box = wrap.getBoundingClientRect();
      e.W = Math.max(1, box.width); e.H = Math.max(1, box.height); e.dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(e.W * e.dpr); canvas.height = Math.round(e.H * e.dpr);
      const pad = Math.min(e.W, e.H) * 0.04;
      e.proj = geoAlbersUsaTerritories().fitExtent([[pad, pad + (e.W < 820 ? 40 : 0)], [e.W - pad, e.H - pad]], nation);
      const path = geoPath(e.proj);
      e.nationPath = new Path2D(path(nation));
      e.statesPath = new Path2D(path(mesh(topo, topo.objects.states, (a, b) => a !== b)));
      e.countiesPath = new Path2D(path(mesh(topo, topo.objects.counties, (a, b) => a !== b && a.id.slice(0, 2) === b.id.slice(0, 2))));
      e.bordersPath = new Path2D(e.proj.getCompositionBorders());
      e.stateShapes = {}; e.stateLabels = [];
      const fipsAbbr = {};
      for (const f of feature(topo, topo.objects.states).features) {
        const abbr = abbrOf[f.properties.name];
        fipsAbbr[f.id] = abbr;
        const d = abbr && path(f);
        if (!d) continue;
        e.stateShapes[abbr] = new Path2D(d);
        const [x, y] = path.centroid(f);
        if (x === x) e.stateLabels.push({ abbr, x, y, area: path.area(f) }); // eslint-disable-line no-self-compare
      }
      e.countyShapes = [];
      for (const f of feature(topo, topo.objects.counties).features) {
        const d = path(f);
        if (d) e.countyShapes.push({ abbr: fipsAbbr[f.id.slice(0, 2)], name: f.properties.name, p: new Path2D(d), b: path.bounds(f) });
      }
      for (let i = 0; i < D.n; i += 1) {
        const p = e.proj([D.lon[i] / 1e5, D.lat[i] / 1e5]);
        if (p) { e.X[i] = p[0]; e.Y[i] = p[1]; } else { e.X[i] = NaN; e.Y[i] = NaN; }
      }
    }

    e.rebuildIndex = () => {
      const ids = [];
      const { shown: visible } = latest.current;
      for (let i = 0; i < D.n; i += 1) if (visible[i] && e.X[i] === e.X[i]) ids.push(i); // eslint-disable-line no-self-compare
      e.quad = quadtree().x(i => e.X[i]).y(i => e.Y[i]).addAll(ids);
    };

    e.draw = () => {
      if (!e.proj || !e.quad) return;
      const { cls: classes, bins: legend, selected: chosen } = latest.current;
      const { W, H, dpr, transform: t, colors } = e;
      const k = t.k;
      const colorOf = color => (color === NO_DATA ? colors.noData : color);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = colors.bg; ctx.fillRect(0, 0, W, H);
      ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * t.x, dpr * t.y);
      ctx.fillStyle = colors.land; ctx.fill(e.nationPath);
      if (k > 3) { ctx.strokeStyle = colors.countyBorder; ctx.lineWidth = 0.8 / k; ctx.stroke(e.countiesPath); }
      ctx.strokeStyle = colors.stateBorder; ctx.lineWidth = 0.9 / k; ctx.stroke(e.statesPath); ctx.stroke(e.nationPath);
      ctx.setLineDash([3 / k, 3 / k]); ctx.lineWidth = 0.7 / k; ctx.stroke(e.bordersPath); ctx.setLineDash([]);

      // Points are drawn in screen space so their size doesn't scale with zoom.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const r = Math.max(0.6, Math.min(5, 0.85 * Math.sqrt(k) * Math.min(1, W / 1000)));
      const x0 = -t.x / k - 10; const y0 = -t.y / k - 10; const x1 = (W - t.x) / k + 10; const y1 = (H - t.y) / k + 10;
      const noDataBin = legend.findIndex(bin => bin.color === NO_DATA);
      const order = noDataBin >= 0 ? [noDataBin, ...range(legend.length).filter(b => b !== noDataBin)] : range(legend.length);
      const buckets = legend.map(() => []);
      e.quad.visit((node, qx0, qy0, qx1, qy1) => {
        if (qx0 > x1 || qx1 < x0 || qy0 > y1 || qy1 < y0) return true;
        if (!node.length) { let n = node; do { buckets[classes[n.data]].push(n.data); n = n.next; } while (n); }
        return false;
      });
      ctx.globalAlpha = k < 2 ? 0.75 : 0.9;
      for (const b of order) {
        ctx.fillStyle = colorOf(legend[b].color);
        if (r >= 2) {
          ctx.beginPath();
          for (const i of buckets[b]) { const px = e.X[i] * k + t.x; const py = e.Y[i] * k + t.y; ctx.moveTo(px + r, py); ctx.arc(px, py, r, 0, 2 * Math.PI); }
          ctx.fill();
        } else {
          for (const i of buckets[b]) ctx.fillRect(e.X[i] * k + t.x - r, e.Y[i] * k + t.y - r, r * 2, r * 2);
        }
      }
      ctx.globalAlpha = 1;

      // State borders and labels sit above the points so they stay readable.
      ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * t.x, dpr * t.y);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = colors.bg; ctx.globalAlpha = 0.7; ctx.lineWidth = 3 / k; ctx.stroke(e.statesPath);
      ctx.globalAlpha = 1; ctx.strokeStyle = colors.stateBorder; ctx.lineWidth = 1.2 / k; ctx.stroke(e.statesPath);
      if (e.focus && e.stateShapes[e.focus]) { ctx.strokeStyle = colors.accent; ctx.lineWidth = 2.5 / k; ctx.stroke(e.stateShapes[e.focus]); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const big = k > 2.5;
      for (const label of e.stateLabels) {
        const screenArea = label.area * k * k;
        if (screenArea < 700) continue;
        const px = label.x * k + t.x; const py = label.y * k + t.y;
        if (px < -100 || py < -40 || px > W + 100 || py > H + 40) continue;
        const text = big && screenArea > 9000 ? STATES[label.abbr] : label.abbr;
        ctx.font = `600 ${big ? 13 : 11}px "DM Sans", system-ui, sans-serif`;
        ctx.lineWidth = 3.5; ctx.strokeStyle = colors.bg; ctx.strokeText(text, px, py);
        ctx.fillStyle = colors.ink; ctx.fillText(text, px, py);
      }
      for (const [i, width] of [[e.hover, 1.5], [chosen, 2.5]]) {
        if (i < 0 || !(e.X[i] === e.X[i])) continue; // eslint-disable-line no-self-compare
        const px = e.X[i] * k + t.x; const py = e.Y[i] * k + t.y;
        ctx.beginPath(); ctx.arc(px, py, Math.max(r, 3) + 3, 0, 2 * Math.PI);
        ctx.lineWidth = width; ctx.strokeStyle = colors.ink; ctx.stroke();
        if (i === chosen) { ctx.beginPath(); ctx.arc(px, py, Math.max(r, 3) + 5.5, 0, 2 * Math.PI); ctx.lineWidth = 2; ctx.strokeStyle = colors.accent; ctx.stroke(); }
      }
    };
    e.schedule = () => { if (!e.frame) e.frame = requestAnimationFrame(() => { e.frame = 0; e.draw(); }); };

    // Names the state (and county, when zoomed in) under the middle of the map.
    function updateWhere() {
      const el = whereRef.current;
      const { transform: t } = e;
      if (t.k < 2.5) { el.hidden = true; return; }
      const x = (e.W / 2 - t.x) / t.k; const y = (e.H / 2 - t.y) / t.k;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const state = Object.keys(e.stateShapes).find(abbr => ctx.isPointInPath(e.stateShapes[abbr], x, y));
      let county = null;
      if (state && t.k >= 6) {
        county = e.countyShapes.find(c => c.abbr === state && x >= c.b[0][0] && x <= c.b[1][0] && y >= c.b[0][1] && y <= c.b[1][1] && ctx.isPointInPath(c.p, x, y))?.name;
      }
      ctx.restore();
      if (!state) { el.hidden = true; return; }
      const suffix = state === 'LA' ? ' Parish' : ['AK', 'PR'].includes(state) ? '' : ' County';
      el.innerHTML = county ? `${esc(county)}${/County|Parish|Borough|city|Census|Municipality/.test(county) ? '' : suffix} <small>· ${esc(STATES[state])}</small>` : esc(STATES[state]);
      el.hidden = false;
    }

    const zoomBehavior = d3Zoom().scaleExtent([1, 400])
      .on('start', () => canvas.classList.add('dragging'))
      .on('zoom', event => { e.transform = event.transform; e.schedule(); })
      .on('end', () => { canvas.classList.remove('dragging'); updateWhere(); });
    e.zoomTo = (transform, duration) => select(canvas).transition().duration(reducedMotion() ? 0 : duration).call(zoomBehavior.transform, transform);
    e.zoomBy = factor => select(canvas).transition().duration(reducedMotion() ? 0 : 300).call(zoomBehavior.scaleBy, factor);
    select(canvas).call(zoomBehavior).on('dblclick.zoom', null);

    const pick = event => {
      if (!e.quad) return -1;
      const [mx, my] = pointer(event, canvas);
      const { k, x: tx, y: ty } = e.transform;
      return e.quad.find((mx - tx) / k, (my - ty) / k, Math.max(6, 0.85 * Math.sqrt(k) + 4) / k) ?? -1;
    };
    const tip = tipRef.current;
    const onMove = event => {
      if (event.buttons) return;
      const i = pick(event);
      if (i !== e.hover) { e.hover = i; e.schedule(); }
      if (i < 0) { tip.hidden = true; canvas.style.cursor = ''; return; }
      const [mx, my] = pointer(event, wrap);
      tip.innerHTML = `${esc(D.name[i])} <small>${esc(D.city[i])}, ${esc(STATES[D.dict.st[D.st[i]]] ?? D.dict.st[D.st[i]])}</small>`;
      tip.style.left = `${mx}px`; tip.style.top = `${my}px`;
      tip.style.transform = mx > e.W - 260 ? 'translate(calc(-100% - 10px), -50%)' : '';
      tip.hidden = false; canvas.style.cursor = 'pointer';
    };
    const onLeave = () => { e.hover = -1; tip.hidden = true; e.schedule(); };
    let down = null;
    const onDown = event => { down = [event.clientX, event.clientY]; };
    const onClick = event => {
      if (down && Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 5) return;
      latest.current.onSelect(pick(event));
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('click', onClick);

    // A resize changes the projection, so re-center on the same place at the same zoom
    // instead of keeping a transform that now points somewhere else.
    const relayout = () => {
      const { transform: t } = e;
      const center = e.proj && t.k > 1 ? e.proj.invert([(e.W / 2 - t.x) / t.k, (e.H / 2 - t.y) / t.k]) : null;
      layout();
      e.rebuildIndex();
      const p = center && e.proj(center);
      if (p) select(canvas).call(zoomBehavior.transform, zoomIdentity.translate(e.W / 2, e.H / 2).scale(t.k).translate(-p[0], -p[1]));
      else e.draw();
    };
    let resizeTimer;
    const resize = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(relayout, 120);
    });
    resize.observe(wrap);
    const theme = new MutationObserver(() => { e.colors = themeColors(); e.draw(); });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    layout();
    e.rebuildIndex();
    e.draw();

    return () => {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('click', onClick);
      resize.disconnect(); theme.disconnect(); clearTimeout(resizeTimer);
      cancelAnimationFrame(e.frame);
      select(canvas).on('.zoom', null).interrupt();
      engine.current = null;
    };
  }, [D, topo]);

  // Re-index and redraw when the set of schools or their colors change.
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    e.rebuildIndex();
    e.draw();
  }, [shown, cls, bins]);

  useEffect(() => { engine.current?.draw(); }, [selected]);

  // Zoom to the schools in the focused state or place (trimming outliers such as
  // overseas addresses), or back out. Small places like a ZIP code may zoom closer.
  const focusKey = focus?.key || '';
  const focusStateOutline = focus?.state || '';
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    e.focus = focusStateOutline;
    if (!focusKey) { e.zoomTo(zoomIdentity, 600); return; }
    const visible = latest.current.shown;
    const xs = []; const ys = [];
    for (let i = 0; i < D.n; i += 1) if (visible[i] && e.X[i] === e.X[i]) { xs.push(e.X[i]); ys.push(e.Y[i]); } // eslint-disable-line no-self-compare
    if (!xs.length) { e.draw(); return; }
    xs.sort((a, b) => a - b); ys.sort((a, b) => a - b);
    const [x0, x1, y0, y1] = [quantileSorted(xs, 0.002), quantileSorted(xs, 0.998), quantileSorted(ys, 0.002), quantileSorted(ys, 0.998)];
    const maxZoom = focusKey.startsWith('place:') ? 160 : 60;
    const k = Math.min(maxZoom, 0.85 / Math.max((x1 - x0) / e.W, (y1 - y0) / e.H, 1e-6));
    e.zoomTo(zoomIdentity.translate(e.W / 2, e.H / 2).scale(Math.max(1, k)).translate(-(x0 + x1) / 2, -(y0 + y1) / 2), 650);
  }, [focusKey, focusStateOutline, D]);

  // Fly to a school picked from search.
  useEffect(() => {
    const e = engine.current;
    if (!e || !flyTo || flyTo.index < 0 || !(e.X[flyTo.index] === e.X[flyTo.index])) return; // eslint-disable-line no-self-compare
    const i = flyTo.index;
    e.zoomTo(zoomIdentity.translate(e.W / 2, e.H / 2).scale(Math.max(e.transform.k, 80)).translate(-e.X[i], -e.Y[i]), 750);
  }, [flyTo]);

  return (
    <div className="school-map" ref={wrapRef}>
      <canvas ref={canvasRef} aria-label="Map of US public schools" />
      <div className="school-map-tools">
        <button type="button" onClick={() => engine.current?.zoomBy(2)} aria-label="Zoom in"><Plus size={16} /></button>
        <button type="button" onClick={() => engine.current?.zoomBy(0.5)} aria-label="Zoom out"><Minus size={16} /></button>
        <button type="button" onClick={() => engine.current?.zoomTo(zoomIdentity, 500)} aria-label="Show whole country"><Maximize2 size={14} /></button>
      </div>
      <div className="school-map-where" ref={whereRef} hidden />
      <div className="school-map-tip" ref={tipRef} hidden />
    </div>
  );
}
