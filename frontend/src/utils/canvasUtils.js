export function drawPendulum(ctx, W, H, cartX, angle) {
  ctx.clearRect(0, 0, W, H);
  const trackY = H * 0.75;
  const PX_PER_M = 180;
  const halfPx = W / 2 - 35;
  const cx = W / 2 + Math.max(-halfPx, Math.min(halfPx, cartX * PX_PER_M));
  const rodLen = 90;

  // track
  ctx.strokeStyle = '#aaa'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(20, trackY + 15); ctx.lineTo(W - 20, trackY + 15); ctx.stroke();

  // cart body
  ctx.fillStyle = '#444';
  ctx.fillRect(cx - 30, trackY - 5, 60, 20);

  // wheels
  ctx.fillStyle = '#666';
  for (const wx of [cx - 18, cx + 18]) {
    ctx.beginPath(); ctx.arc(wx, trackY + 15, 7, 0, 2 * Math.PI); ctx.fill();
  }

  // rod + bob
  const tipX = cx + rodLen * Math.sin(angle);
  const tipY = trackY - 5 - rodLen * Math.cos(angle);
  ctx.strokeStyle = '#e55'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx, trackY - 5); ctx.lineTo(tipX, tipY); ctx.stroke();
  ctx.fillStyle = '#e55';
  ctx.beginPath(); ctx.arc(tipX, tipY, 8, 0, 2 * Math.PI); ctx.fill();

  // pivot dot
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(cx, trackY - 5, 4, 0, 2 * Math.PI); ctx.fill();
}

export function drawBallBeam(ctx, W, H, ballPos, beamAngle) {
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2 + 20;
  const beamHalfLen = 210, scale = 380;
  const ball = Math.max(-beamHalfLen / scale, Math.min(beamHalfLen / scale, ballPos));
  const cos = Math.cos(beamAngle), sin = Math.sin(beamAngle);

  // support
  ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 20, cy + 40); ctx.lineTo(cx + 20, cy + 40); ctx.stroke();

  // beam (positive angle = right side down)
  ctx.strokeStyle = '#555'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - beamHalfLen * cos, cy - beamHalfLen * sin);
  ctx.lineTo(cx + beamHalfLen * cos, cy + beamHalfLen * sin);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // pivot
  ctx.fillStyle = '#c00';
  ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 2 * Math.PI); ctx.fill();

  // ball
  ctx.fillStyle = '#4a90d9';
  ctx.beginPath(); ctx.arc(cx + ball * scale * cos, cy + ball * scale * sin, 11, 0, 2 * Math.PI); ctx.fill();
  ctx.strokeStyle = '#2c5f8a'; ctx.lineWidth = 2; ctx.stroke();
}

export function drawGraph(ctx, W, H, series, upToIdx) {
  const hasDual = series.length > 1;
  const PX = 50, PY = 18, PB = 28, PR = hasDual ? 52 : 10;
  const plotW = W - PX - PR, plotH = H - PY - PB;

  ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1; ctx.strokeRect(PX, PY, plotW, plotH);
  if (!series.length) return;

  const totalLen = series[0].values.length;
  const sx = i => PX + (i / (totalLen - 1)) * plotW;
  const scales = series.map(s => {
    const min = Math.min(...s.values), max = Math.max(...s.values);
    const range = max - min || 1;
    return { min, max, sy: v => PY + (1 - (v - min) / range) * plotH };
  });

  const { min: min0, max: max0, sy: sy0 } = scales[0];
  const xTicks = [0, Math.floor(totalLen / 2), totalLen - 1];

  // grid
  [min0, (min0 + max0) / 2, max0].forEach(v => {
    ctx.strokeStyle = '#ebebeb'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PX, sy0(v)); ctx.lineTo(PX + plotW, sy0(v)); ctx.stroke();
  });
  xTicks.forEach(i => {
    ctx.strokeStyle = '#ebebeb'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx(i), PY); ctx.lineTo(sx(i), PY + plotH); ctx.stroke();
  });

  // y-axis labels
  ctx.font = '10px Arial'; ctx.textAlign = 'right';
  [min0, (min0 + max0) / 2, max0].forEach(v => {
    ctx.fillStyle = series[0].color;
    ctx.fillText(v.toFixed(3), PX - 4, sy0(v) + 3);
  });
  if (hasDual) {
    const { min: min1, max: max1, sy: sy1 } = scales[1];
    ctx.textAlign = 'left';
    [min1, (min1 + max1) / 2, max1].forEach(v => {
      ctx.fillStyle = series[1].color;
      ctx.fillText(v.toFixed(3), PX + plotW + 4, sy1(v) + 3);
    });
    ctx.strokeStyle = series[1].color; ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.moveTo(PX + plotW, PY); ctx.lineTo(PX + plotW, PY + plotH); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // x-axis labels + axes
  ctx.textAlign = 'center'; ctx.fillStyle = '#666';
  xTicks.forEach(i => ctx.fillText(series[0].t[i].toFixed(1) + 's', sx(i), H - PB + 16));
  ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PX, PY); ctx.lineTo(PX, PY + plotH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(PX, PY + plotH); ctx.lineTo(PX + plotW, PY + plotH); ctx.stroke();

  // series lines
  const drawLen = Math.min(upToIdx + 1, totalLen);
  series.forEach((s, i) => {
    if (drawLen < 2) return;
    const { sy } = scales[i];
    ctx.strokeStyle = s.color; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(sx(0), sy(s.values[0]));
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
