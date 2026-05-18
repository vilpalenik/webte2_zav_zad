import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API_KEY = import.meta.env.VITE_API_KEY;
const BEAM_ANGLE_SCALE = 8; // visual amplification — real LQR angles are tiny

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
  const cx = W / 2 + cartX * 180;
  const rodLen = 90;

  ctx.strokeStyle = '#aaa'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(20, trackY + 15); ctx.lineTo(W - 20, trackY + 15); ctx.stroke();

  ctx.fillStyle = '#444';
  ctx.fillRect(cx - 30, trackY - 5, 60, 20);

  ctx.fillStyle = '#666';
  [[cx - 18, trackY + 15], [cx + 18, trackY + 15]].forEach(([wx, wy]) => {
    ctx.beginPath(); ctx.arc(wx, wy, 7, 0, 2 * Math.PI); ctx.fill();
  });

  const tipX = cx + rodLen * Math.sin(angle);
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

  // amplify angle for visibility
  const visualAngle = beamAngle * BEAM_ANGLE_SCALE;
  const cos = Math.cos(visualAngle), sin = Math.sin(visualAngle);

  // support
  ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 20, cy + 40); ctx.lineTo(cx + 20, cy + 40); ctx.stroke();

  // beam
  ctx.strokeStyle = '#555'; ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - beamHalfLen * cos, cy + beamHalfLen * sin);
  ctx.lineTo(cx + beamHalfLen * cos, cy - beamHalfLen * sin);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // pivot dot
  ctx.fillStyle = '#c00';
  ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 2 * Math.PI); ctx.fill();

  // ball
  const bx = cx + ballPos * scale * cos;
  const by = cy - ballPos * scale * sin;
  ctx.fillStyle = '#4a90d9';
  ctx.beginPath(); ctx.arc(bx, by, 11, 0, 2 * Math.PI); ctx.fill();
  ctx.strokeStyle = '#2c5f8a'; ctx.lineWidth = 2; ctx.stroke();

  // annotation
  ctx.fillStyle = '#999'; ctx.font = '11px Arial'; ctx.textAlign = 'left';
  ctx.fillText(`uhol ×${BEAM_ANGLE_SCALE}`, 6, H - 6);
}

// ─── graph canvas drawing ────────────────────────────────────────────────────

function drawGraph(ctx, W, H, series, upToIdx) {
  const PX = 48, PY = 18, PB = 28;
  const plotW = W - PX - 8, plotH = H - PY - PB;

  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
  ctx.strokeRect(PX, PY, plotW, plotH);

  if (!series.length) return;

  const allValues = series.flatMap(s => s.values);
  const minV = Math.min(...allValues), maxV = Math.max(...allValues);
  const rangeV = maxV - minV || 1;
  const totalLen = series[0].values.length;

  const sx = i => PX + (i / (totalLen - 1)) * plotW;
  const sy = v => PY + (1 - (v - minV) / rangeV) * plotH;

  // grid + y labels
  ctx.fillStyle = '#666'; ctx.font = '10px Arial'; ctx.textAlign = 'right';
  [minV, (minV + maxV) / 2, maxV].forEach(v => {
    const y = sy(v);
    ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PX, y); ctx.lineTo(PX + plotW, y); ctx.stroke();
    ctx.fillStyle = '#666';
    ctx.fillText(v.toFixed(3), PX - 3, y + 3);
  });

  // x labels
  ctx.textAlign = 'center';
  const tArr = series[0].t;
  [0, Math.floor(totalLen / 2), totalLen - 1].forEach(i => {
    ctx.fillStyle = '#666';
    ctx.fillText(tArr[i].toFixed(1) + 's', sx(i), H - PB + 16);
    ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx(i), PY); ctx.lineTo(sx(i), PY + plotH); ctx.stroke();
  });

  // axes
  ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PX, PY); ctx.lineTo(PX, PY + plotH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(PX, PY + plotH); ctx.lineTo(PX + plotW, PY + plotH); ctx.stroke();

  // series lines (up to upToIdx)
  const drawLen = Math.min(upToIdx + 1, totalLen);
  series.forEach(s => {
    if (drawLen < 2) return;
    ctx.strokeStyle = s.color; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(sx(0), sy(s.values[0]));
    for (let i = 1; i < drawLen; i++) ctx.lineTo(sx(i), sy(s.values[i]));
    ctx.stroke();
  });

  // playhead
  if (drawLen > 0 && drawLen < totalLen) {
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(sx(drawLen - 1), PY); ctx.lineTo(sx(drawLen - 1), PY + plotH); ctx.stroke();
    ctx.setLineDash([]);
  }

  // legend
  series.forEach((s, i) => {
    const lx = PX + 8 + i * 130, ly = PY + 8;
    ctx.strokeStyle = s.color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 18, ly); ctx.stroke();
    ctx.fillStyle = '#333'; ctx.textAlign = 'left'; ctx.font = '10px Arial';
    ctx.fillText(s.label, lx + 22, ly + 3);
  });
}

// ─── main component ──────────────────────────────────────────────────────────

const DEFAULTS = {
  pendulum:   { r1: 0.2,  r2: 0.5, label: 'Cieľová pozícia (m)' },
  'ball-beam': { r1: 0.25, r2: 0.5, label: 'Cieľová pozícia (m)' },
};

const SimulationPage = ({ simType, t }) => {
  const def = DEFAULTS[simType];
  const [r1, setR1] = useState(def.r1);
  const [r2, setR2] = useState(def.r2);
  const [simData, setSimData]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [runLabel, setRunLabel] = useState('');

  const canvasRef  = useRef(null);
  const graphRef   = useRef(null);
  const rafRef     = useRef(null);
  const startRef   = useRef(null);
  const labelRef   = useRef('');
  const seriesRef  = useRef(null); // pre-computed graph series

  // log animation view once per page load (uses cookie)
  useEffect(() => {
    axios.post('/api/animation/log', { type: simType, token: getOrCreateToken() }).catch(() => {});
  }, [simType]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // pre-compute graph series whenever simData changes
  useEffect(() => {
    if (!simData) { seriesRef.current = null; return; }
    const t1 = Array.from(simData.t);
    const offset = t1[t1.length - 1];
    const t2 = t1.map(v => v + offset);
    const tCombined = [...t1, ...t2];

    seriesRef.current = simType === 'pendulum'
      ? [
          { label: 'Vozík (m)',   color: '#4a90d9', t: tCombined, values: [...simData.cart1, ...simData.cart2] },
          { label: 'Uhol (rad)',  color: '#e55',    t: tCombined, values: [...simData.angle1, ...simData.angle2] },
        ]
      : [
          { label: 'Gulička (m)',     color: '#4a90d9', t: tCombined, values: [...simData.y1,    ...simData.y2]    },
          { label: 'Uhol tyče (rad)', color: '#e55',    t: tCombined, values: [...simData.beam1, ...simData.beam2] },
        ];
  }, [simData, simType]);

  const runSimulation = async () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setLoading(true); setError(''); setSimData(null); setRunLabel('');
    try {
      const res = await axios.post('/api/simulation/run',
        { type: simType, r1: parseFloat(r1), r2: parseFloat(r2) },
        { headers: { 'X-API-KEY': API_KEY } }
      );
      setSimData(res.data.data);
    } catch {
      setError('Simulácia zlyhala. Skontrolujte parametre.');
    } finally {
      setLoading(false);
    }
  };

  const animate = useCallback((timestamp) => {
    if (!simData || !canvasRef.current || !graphRef.current) return;
    if (!startRef.current) startRef.current = timestamp;
    const elapsed = (timestamp - startRef.current) / 1000;

    const tArr = simData.t;
    const T  = tArr[tArr.length - 1];
    const dt = tArr[1] - tArr[0];

    const isRun2   = elapsed >= T;
    const timeInRun = isRun2 ? elapsed - T : elapsed;
    const idx = Math.min(Math.floor(timeInRun / dt), tArr.length - 1);

    // update run label only on change
    const newLabel = isRun2 ? 'Beh 2' : 'Beh 1';
    if (labelRef.current !== newLabel) { labelRef.current = newLabel; setRunLabel(newLabel); }

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
      setRunLabel('Hotovo');
    }
  }, [simData, simType]);

  useEffect(() => {
    if (!simData) return;
    startRef.current = null;
    labelRef.current = '';
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [simData, animate]);

  return (
    <div style={{ padding: '2rem', maxWidth: '1040px', margin: '0 auto' }}>
      <h2>{simType === 'pendulum' ? t.pendulum : t.ball_beam}</h2>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '.9rem' }}>
          {def.label} — Beh 1
          <input type="number" step="0.05" min="-2" max="2" value={r1}
            onChange={e => setR1(e.target.value)}
            style={{ padding: '6px 10px', width: 100, borderRadius: 4, border: '1px solid #ccc' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '.9rem' }}>
          {def.label} — Beh 2
          <input type="number" step="0.05" min="-2" max="2" value={r2}
            onChange={e => setR2(e.target.value)}
            style={{ padding: '6px 10px', width: 100, borderRadius: 4, border: '1px solid #ccc' }} />
        </label>
        <button onClick={runSimulation} disabled={loading}
          style={{ padding: '10px 24px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Počíta sa...' : t.run_simulation}
        </button>
        {runLabel && (
          <span style={{ alignSelf: 'center', fontWeight: 'bold',
            color: runLabel === 'Hotovo' ? '#4CAF50' : '#e55' }}>
            {runLabel}
          </span>
        )}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div>
          <h3 style={{ margin: '0 0 .5rem' }}>Animácia</h3>
          <canvas ref={canvasRef} width={480} height={280}
            style={{ border: '1px solid #ddd', borderRadius: 4, background: '#fff', width: '100%' }} />
        </div>
        <div>
          <h3 style={{ margin: '0 0 .5rem' }}>Graf</h3>
          <canvas ref={graphRef} width={480} height={280}
            style={{ border: '1px solid #ddd', borderRadius: 4, background: '#fafafa', width: '100%' }} />
          {!simData && (
            <div style={{ position: 'relative', marginTop: -284, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: '.9rem', pointerEvents: 'none' }}>
              Spustite simuláciu
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimulationPage;
