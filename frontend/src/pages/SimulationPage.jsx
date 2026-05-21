import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { drawPendulum, drawBallBeam, drawGraph } from '../utils/canvasUtils';

const API_KEY = import.meta.env.VITE_API_KEY;

const DEFAULTS = {
  pendulum:    { r1: 0.2,  r2: 0.5, min: -1.0,  max: 1.0,  speed: 1.0 },
  'ball-beam': { r1: 0.25, r2: 0.5, min: -0.45, max: 0.45, speed: 0.8 },
};

function getOrCreateToken() {
  const match = document.cookie.match(/(?:^|; )user_token=([^;]*)/);
  if (match) return decodeURIComponent(match[1]);
  const token = 'u_' + Math.random().toString(36).substring(2, 15);
  document.cookie = `user_token=${token}; expires=${new Date(Date.now() + 365 * 864e5).toUTCString()}; path=/; SameSite=Lax`;
  return token;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, parseFloat(val) || 0));
}

const SimulationPage = ({ simType, t }) => {
  const def  = DEFAULTS[simType];
  const hint = simType === 'pendulum' ? t.pendulum_range : t.ball_beam_range;

  const [r1, setR1]           = useState(def.r1);
  const [r2, setR2]           = useState(def.r2);
  const [simData, setSimData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [runPhase, setRunPhase] = useState(''); // '' | 'run1' | 'run2' | 'done'

  const canvasRef = useRef(null);
  const graphRef  = useRef(null);
  const rafRef    = useRef(null);
  const startRef  = useRef(null);
  const labelRef  = useRef('');
  const seriesRef = useRef(null);
  const abortRef  = useRef(null);

  const isValid = data => data && (simType === 'pendulum' ? 'cart1' in data : 'y1' in data);

  // reset everything when switching simulation type
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (abortRef.current) abortRef.current.abort();
    setSimData(null); setRunPhase(''); setError('');
    seriesRef.current = null; labelRef.current = '';
    [canvasRef, graphRef].forEach(ref => {
      if (ref.current) ref.current.getContext('2d').clearRect(0, 0, ref.current.width, ref.current.height);
    });
  }, [simType]);

  // log animation view (uses cookie token)
  useEffect(() => {
    const ctrl = new AbortController();
    axios.post('/api/animation/log', { type: simType, token: getOrCreateToken() }, { signal: ctrl.signal }).catch(() => {});
    return () => ctrl.abort();
  }, [simType]);

  // cleanup on unmount
  useEffect(() => () => {
    if (rafRef.current)   cancelAnimationFrame(rafRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  // rebuild graph series when data or language changes
  useEffect(() => {
    if (!isValid(simData)) { seriesRef.current = null; return; }
    const t1 = simData.t;
    const offset = t1[t1.length - 1];
    const tAll = [...t1, ...t1.map(v => v + offset)];

    seriesRef.current = simType === 'pendulum'
      ? [
          { label: t.chart_cart,       color: '#4a90d9', t: tAll, values: [...simData.cart1,  ...simData.cart2]  },
          { label: t.chart_angle,      color: '#e55',    t: tAll, values: [...simData.angle1, ...simData.angle2] },
        ]
      : [
          { label: t.chart_ball,       color: '#4a90d9', t: tAll, values: [...simData.y1,    ...simData.y2]    },
          { label: t.chart_beam_angle, color: '#e55',    t: tAll, values: [...simData.beam1, ...simData.beam2] },
        ];
  }, [simData, simType, t]);

  const runSimulation = async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    setLoading(true); setError(''); setSimData(null); setRunPhase('');
    try {
      const res = await axios.post('/api/simulation/run',
        { type: simType, r1: clamp(r1, def.min, def.max), r2: clamp(r2, def.min, def.max) },
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
    if (!isValid(simData) || !canvasRef.current || !graphRef.current) return;
    if (!startRef.current) startRef.current = timestamp;

    const elapsed = (timestamp - startRef.current) / 1000 * DEFAULTS[simType].speed;
    const tArr = simData.t;
    const T = tArr[tArr.length - 1];
    const idx = Math.min(Math.floor((elapsed % T) / (tArr[1] - tArr[0])), tArr.length - 1);
    const isRun2 = elapsed >= T;

    const phase = isRun2 ? 'run2' : 'run1';
    if (labelRef.current !== phase) { labelRef.current = phase; setRunPhase(phase); }

    const canvas = canvasRef.current;
    if (simType === 'pendulum') {
      drawPendulum(canvas.getContext('2d'), canvas.width, canvas.height,
        (isRun2 ? simData.cart2 : simData.cart1)[idx],
        (isRun2 ? simData.angle2 : simData.angle1)[idx]);
    } else {
      drawBallBeam(canvas.getContext('2d'), canvas.width, canvas.height,
        (isRun2 ? simData.y2    : simData.y1)[idx],
        (isRun2 ? simData.beam2 : simData.beam1)[idx]);
    }

    if (seriesRef.current) {
      const g = graphRef.current;
      drawGraph(g.getContext('2d'), g.width, g.height, seriesRef.current, isRun2 ? tArr.length + idx : idx);
    }

    if (elapsed < T * 2) {
      rafRef.current = requestAnimationFrame(animate);
    } else {
      // draw final frame at 100% before stopping
      if (seriesRef.current && graphRef.current) {
        const g = graphRef.current;
        drawGraph(g.getContext('2d'), g.width, g.height, seriesRef.current, seriesRef.current[0].values.length - 1);
      }
      setRunPhase('done');
    }
  }, [simData, simType]);

  useEffect(() => {
    if (!simData) return;
    startRef.current = null; labelRef.current = ''; setRunPhase('');
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [simData, animate]);

  return (
    <div className="page">
      <h2>{simType === 'pendulum' ? t.pendulum : t.ball_beam}</h2>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[{ label: t.run1, val: r1, set: setR1 }, { label: t.run2, val: r2, set: setR2 }].map(({ label, val, set }) => (
          <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '.9rem' }}>
            {t.target_position} — {label} <span style={{ color: '#999', fontSize: '.8rem' }}>{hint}</span>
            <input type="number" step="0.05" min={def.min} max={def.max} value={val}
              onChange={e => set(clamp(e.target.value, def.min, def.max))}
              style={{ padding: '6px 10px', width: 110, borderRadius: 4, border: '1px solid #ccc' }} />
          </label>
        ))}
        <button className="btn btn-green" onClick={runSimulation} disabled={loading}
          style={{ alignSelf: 'flex-end' }}>
          {loading ? t.computing : t.run_simulation}
        </button>
        {runPhase && (
          <span style={{ alignSelf: 'center', fontWeight: 'bold', color: runPhase === 'done' ? '#4CAF50' : '#e55' }}>
            {t[runPhase]}
          </span>
        )}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div className="sim-grid">
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
