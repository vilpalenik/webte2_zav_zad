import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API_KEY = import.meta.env.VITE_API_KEY;

// ─── token cookie ────────────────────────────────────────────────────────────

function getOrCreateToken() {
  const match = document.cookie.match(/(?:^|; )user_token=([^;]*)/);
  if (match) return decodeURIComponent(match[1]);
  const token = 'u_' + Math.random().toString(36).substring(2, 15);
  const expires = new Date(Date.now() + 365 * 864e5).toUTCString();
  document.cookie = `user_token=${token}; expires=${expires}; path=/; SameSite=Lax`;
  return token;
}

// ─── physics canvas drawing ──────────────────────────────────────────────────

function drawPendulum(ctx, W, H, cartX, angle) {
  ctx.clearRect(0, 0, W, H);
  const trackY = H * 0.75;
  const PX_PER_M = 180;
  const trackHalfPx = W / 2 - 35;                  // cart (30px half-width) + margin
  const clampedCartX = Math.max(-trackHalfPx / PX_PER_M, Math.min(trackHalfPx / PX_PER_M, cartX));
  const cx = W / 2 + clampedCartX * PX_PER_M;
  const rodLen = 90;

  ctx.strokeStyle = '#aaa'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(20, trackY + 15); ctx.lineTo(W - 20, trackY + 15); ctx.stroke();

  ctx.fillStyle = '#444';
  ctx.fillRect(cx - 30, trackY - 5, 60, 20);

  ctx.fillStyle = '#666';
  [[cx - 18, trackY + 15], [cx + 18, trackY + 15]].forEach(([wx, wy]) => {
    ctx.beginPath(); ctx.arc(wx, wy, 7, 0, 2 * Math.PI); ctx.fill();
  });

  const tipX = cx - rodLen * Math.sin(angle);
  const tipY = trackY - 5 - rodLen * Math.cos(angle);
  ctx.strokeStyle = '#e55'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx, trackY - 5); ctx.lineTo(tipX, tipY); ctx.stroke();

  ctx.fillStyle = '#e55';
  ctx.beginPath(); ctx.arc(tipX, tipY, 8, 0, 2 * Math.PI); ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(cx, trackY - 5, 4, 0, 2 * Math.PI); ctx.fill();
}

function drawBallBeam(ctx, W, H, ballPos, beamAngle) {
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2 + 20;
  const beamHalfLen = 210;
  const scale = 380;
  const maxBallPos = beamHalfLen / scale;
  const clampedBall = Math.max(-maxBallPos, Math.min(maxBallPos, ballPos));

  // positive beamAngle → right side DOWN (ball rolls right), matching CTMS sign convention
  const cos = Math.cos(beamAngle), sin = Math.sin(beamAngle);

  // support
  ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 20, cy + 40); ctx.lineTo(cx + 20, cy + 40); ctx.stroke();

  // beam: left end UP, right end DOWN for positive angle
  ctx.strokeStyle = '#555'; ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - beamHalfLen * cos, cy - beamHalfLen * sin);
  ctx.lineTo(cx + beamHalfLen * cos, cy + beamHalfLen * sin);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // pivot dot
  ctx.fillStyle = '#c00';
  ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 2 * Math.PI); ctx.fill();

  // ball: positive r → right of center, sitting on the beam surface
  const bx = cx + clampedBall * scale * cos;
  const by = cy + clampedBall * scale * sin;
  ctx.fillStyle = '#4a90d9';
  ctx.beginPath(); ctx.arc(bx, by, 11, 0, 2 * Math.PI); ctx.fill();
  ctx.strokeStyle = '#2c5f8a'; ctx.lineWidth = 2; ctx.stroke();
}

// ─── graph canvas drawing (dual y-axis) ─────────────────────────────────────

function drawGraph(ctx, W, H, series, upToIdx) {
  const hasDual = series.length > 1;
  const PX = 50, PY = 18, PB = 28, PR = hasDual ? 52 : 10;
  const plotW = W - PX - PR, plotH = H - PY - PB;

  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
  ctx.strokeRect(PX, PY, plotW, plotH);

  if (!series.length) return;

  const totalLen = series[0].values.length;
  const sx = i => PX + (i / (totalLen - 1)) * plotW;

  // per-series independent y-scales
  const scales = series.map(s => {
    const min = Math.min(...s.values), max = Math.max(...s.values);
    const range = max - min || 1;
    return { min, max, sy: v => PY + (1 - (v - min) / range) * plotH };
  });

  // grid lines (from series 0)
  const { min: min0, max: max0, sy: sy0 } = scales[0];
  [min0, (min0 + max0) / 2, max0].forEach(v => {
    ctx.strokeStyle = '#ebebeb'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PX, sy0(v)); ctx.lineTo(PX + plotW, sy0(v)); ctx.stroke();
  });

  // x grid
  const tArr = series[0].t;
  const xTicks = [0, Math.floor(totalLen / 2), totalLen - 1];
  xTicks.forEach(i => {
    ctx.strokeStyle = '#ebebeb'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx(i), PY); ctx.lineTo(sx(i), PY + plotH); ctx.stroke();
  });

  // left y-axis labels (series 0)
  ctx.font = '10px Arial'; ctx.textAlign = 'right';
  [min0, (min0 + max0) / 2, max0].forEach(v => {
    ctx.fillStyle = series[0].color;
    ctx.fillText(v.toFixed(3), PX - 4, sy0(v) + 3);
  });

  // right y-axis labels (series 1)
  if (hasDual) {
    const { min: min1, max: max1, sy: sy1 } = scales[1];
    ctx.textAlign = 'left';
    [min1, (min1 + max1) / 2, max1].forEach(v => {
      ctx.fillStyle = series[1].color;
      ctx.fillText(v.toFixed(3), PX + plotW + 4, sy1(v) + 3);
    });
    // right axis line
    ctx.strokeStyle = series[1].color; ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.moveTo(PX + plotW, PY); ctx.lineTo(PX + plotW, PY + plotH); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // x labels
  ctx.textAlign = 'center'; ctx.fillStyle = '#666';
  xTicks.forEach(i => {
    ctx.fillText(tArr[i].toFixed(1) + 's', sx(i), H - PB + 16);
  });

  // axes
  ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PX, PY); ctx.lineTo(PX, PY + plotH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(PX, PY + plotH); ctx.lineTo(PX + plotW, PY + plotH); ctx.stroke();

  // series lines — each scaled to its own axis
  const drawLen = Math.min(upToIdx + 1, totalLen);
  series.forEach((s, i) => {
    if (drawLen < 2) return;
    const { sy } = scales[i];
    ctx.strokeStyle = s.color; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(sx(0), sy(s.values[0]));
    for (let j = 1; j < drawLen; j++) ctx.lineTo(sx(j), sy(s.values[j]));
    ctx.stroke();
  });

  // playhead
  if (drawLen > 0 && drawLen < totalLen) {
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(sx(drawLen - 1), PY); ctx.lineTo(sx(drawLen - 1), PY + plotH); ctx.stroke();
    ctx.setLineDash([]);
  }

  // legend
  series.forEach((s, i) => {
    const lx = PX + 8 + i * 140, ly = PY + 8;
    ctx.strokeStyle = s.color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 18, ly); ctx.stroke();
    ctx.fillStyle = '#333'; ctx.textAlign = 'left'; ctx.font = '10px Arial';
    ctx.fillText(s.label, lx + 22, ly + 3);
  });
}

// ─── main component ──────────────────────────────────────────────────────────

// only numeric/speed values here — labels come from t
const DEFAULTS = {
  pendulum:    { r1: 0.2,  r2: 0.5, min: -1.0,  max: 1.0,  speed: 1.0 },
  'ball-beam': { r1: 0.25, r2: 0.5, min: -0.45, max: 0.45, speed: 0.8 },
};

const SimulationPage = ({ simType, t }) => {
  const def = DEFAULTS[simType];
  const hint = simType === 'pendulum' ? t.pendulum_range : t.ball_beam_range;

  const [r1, setR1] = useState(def.r1);
  const [r2, setR2] = useState(def.r2);
  const [simData, setSimData]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  // 'run1' | 'run2' | 'done' | '' — translated via t[runPhase]
  const [runPhase, setRunPhase] = useState('');

  const canvasRef  = useRef(null);
  const graphRef   = useRef(null);
  const rafRef     = useRef(null);
  const startRef   = useRef(null);
  const labelRef   = useRef('');
  const seriesRef  = useRef(null);
  const abortRef   = useRef(null); // AbortController for the in-flight simulation request

  // when simType changes (navigating between simulation pages), clear stale data + canvases
  useEffect(() => {
    if (rafRef.current)   cancelAnimationFrame(rafRef.current);
    if (abortRef.current) abortRef.current.abort();
    setSimData(null);
    setRunPhase('');
    setError('');
    seriesRef.current = null;
    labelRef.current  = '';

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    if (graphRef.current) {
      const ctx = graphRef.current.getContext('2d');
      ctx.clearRect(0, 0, graphRef.current.width, graphRef.current.height);
    }
  }, [simType]);

  // log animation view once per simType (uses cookie)
  useEffect(() => {
    const ctrl = new AbortController();
    axios.post('/api/animation/log', { type: simType, token: getOrCreateToken() },
      { signal: ctrl.signal }).catch(() => {});
    return () => ctrl.abort();
  }, [simType]);

  // cancel animation frame + any in-flight request on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current)  cancelAnimationFrame(rafRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // pre-compute graph series whenever simData or language changes
  useEffect(() => {
    // guard: simData must exist and match the current simType
    const valid = simData &&
      (simType === 'pendulum' ? ('cart1' in simData) : ('y1' in simData));
    if (!valid) { seriesRef.current = null; return; }
    const t1 = Array.from(simData.t);
    const offset = t1[t1.length - 1];
    const tCombined = [...t1, ...t1.map(v => v + offset)];

    seriesRef.current = simType === 'pendulum'
      ? [
          { label: t.chart_cart,       color: '#4a90d9', t: tCombined, values: [...simData.cart1,  ...simData.cart2]  },
          { label: t.chart_angle,      color: '#e55',    t: tCombined, values: [...simData.angle1, ...simData.angle2] },
        ]
      : [
          { label: t.chart_ball,       color: '#4a90d9', t: tCombined, values: [...simData.y1,    ...simData.y2]    },
          { label: t.chart_beam_angle, color: '#e55',    t: tCombined, values: [...simData.beam1, ...simData.beam2] },
        ];
  }, [simData, simType, t]);

  const runSimulation = async () => {
    // cancel previous request if still running
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setLoading(true); setError(''); setSimData(null); setRunPhase('');
    try {
      const res = await axios.post('/api/simulation/run',
        { type: simType, r1: Math.max(def.min, Math.min(def.max, parseFloat(r1))), r2: Math.max(def.min, Math.min(def.max, parseFloat(r2))) },
        { headers: { 'X-API-KEY': API_KEY }, signal: abortRef.current.signal }
      );
      setSimData(res.data.data);
    } catch (e) {
      if (!axios.isCancel(e)) setError(t.sim_error);
    } finally {
      setLoading(false);
    }
  };

  const animate = useCallback((timestamp) => {
    const valid = simData &&
      (simType === 'pendulum' ? ('cart1' in simData) : ('y1' in simData));
    if (!valid || !canvasRef.current || !graphRef.current) return;
    if (!startRef.current) startRef.current = timestamp;
    // scale elapsed time so fast transients (beam angle) remain visible
    const elapsed = (timestamp - startRef.current) / 1000 * DEFAULTS[simType].speed;

    const tArr = simData.t;
    const T  = tArr[tArr.length - 1];
    const dt = tArr[1] - tArr[0];

    const isRun2   = elapsed >= T;
    const timeInRun = isRun2 ? elapsed - T : elapsed;
    const idx = Math.min(Math.floor(timeInRun / dt), tArr.length - 1);

    // update run phase only on change (phase key is language-neutral)
    const newPhase = isRun2 ? 'run2' : 'run1';
    if (labelRef.current !== newPhase) { labelRef.current = newPhase; setRunPhase(newPhase); }

    // draw physics
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (simType === 'pendulum') {
      drawPendulum(ctx, canvas.width, canvas.height,
        isRun2 ? simData.cart2[idx]  : simData.cart1[idx],
        isRun2 ? simData.angle2[idx] : simData.angle1[idx]);
    } else {
      drawBallBeam(ctx, canvas.width, canvas.height,
        isRun2 ? simData.y2[idx]    : simData.y1[idx],
        isRun2 ? simData.beam2[idx] : simData.beam1[idx]);
    }

    // draw synchronized graph
    const graphIdx = isRun2 ? tArr.length + idx : idx;
    if (seriesRef.current) {
      const gc = graphRef.current.getContext('2d');
      drawGraph(gc, graphRef.current.width, graphRef.current.height, seriesRef.current, graphIdx);
    }

    if (elapsed < T * 2) {
      rafRef.current = requestAnimationFrame(animate);
    } else {
      setRunPhase('done');
    }
  }, [simData, simType]);

  useEffect(() => {
    if (!simData) return;
    startRef.current = null;
    labelRef.current = '';
    setRunPhase('');
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [simData, animate]);

  return (
    <div style={{ padding: '2rem', maxWidth: '1040px', margin: '0 auto' }}>
      <h2>{simType === 'pendulum' ? t.pendulum : t.ball_beam}</h2>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '.9rem' }}>
          {t.target_position} — {t.run1} <span style={{ color: '#999', fontSize: '.8rem' }}>{hint}</span>
          <input type="number" step="0.05" min={def.min} max={def.max} value={r1}
            onChange={e => setR1(Math.max(def.min, Math.min(def.max, parseFloat(e.target.value) || 0)))}
            style={{ padding: '6px 10px', width: 110, borderRadius: 4, border: '1px solid #ccc' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '.9rem' }}>
          {t.target_position} — {t.run2} <span style={{ color: '#999', fontSize: '.8rem' }}>{hint}</span>
          <input type="number" step="0.05" min={def.min} max={def.max} value={r2}
            onChange={e => setR2(Math.max(def.min, Math.min(def.max, parseFloat(e.target.value) || 0)))}
            style={{ padding: '6px 10px', width: 110, borderRadius: 4, border: '1px solid #ccc' }} />
        </label>
        <button onClick={runSimulation} disabled={loading}
          style={{ padding: '10px 24px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? t.computing : t.run_simulation}
        </button>
        {runPhase && (
          <span style={{ alignSelf: 'center', fontWeight: 'bold',
            color: runPhase === 'done' ? '#4CAF50' : '#e55' }}>
            {t[runPhase]}
          </span>
        )}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div>
          <h3 style={{ margin: '0 0 .5rem' }}>{t.animation}</h3>
          <canvas ref={canvasRef} width={480} height={280}
            style={{ border: '1px solid #ddd', borderRadius: 4, background: '#fff', width: '100%' }} />
        </div>
        <div>
          <h3 style={{ margin: '0 0 .5rem' }}>{t.graph}</h3>
          <canvas ref={graphRef} width={480} height={280}
            style={{ border: '1px solid #ddd', borderRadius: 4, background: '#fafafa', width: '100%' }} />
          {!simData && (
            <div style={{ position: 'relative', marginTop: -284, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: '.9rem', pointerEvents: 'none' }}>
              {t.run_first}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimulationPage;
