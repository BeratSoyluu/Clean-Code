const cursor = document.getElementById('cursor');
document.addEventListener('mousemove', e => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top = e.clientY + 'px';
});

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

const sparks = [];

function addSpark(x, y, color) {
  for (let i = 0; i < 3; i++) {
    sparks.push({
      x, y,
      vx: (Math.random() - 0.5) * 2.5,
      vy: -Math.random() * 2.5 - 0.5,
      life: 1,
      color,
      r: Math.random() * 2.5 + 1
    });
  }
}

function bezier(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
}

function glowCurve(points, color, width, blur) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.restore();
}

let W, H, vx, vy, vw, vh;

function setLayout() {
  W = canvas.width;
  H = canvas.height;
  vw = W * 0.13;
  vh = H * 0.18;
  vx = W * 0.5;
  vy = H * 0.82;
}
setLayout();
window.addEventListener('resize', setLayout);

const STEMS = [
  { endX: 0,    endY: -0.55, cp1x: -0.02, cp1y: -0.25, cp2x:  0.01, cp2y: -0.45, startDelay: 0.00, leaves: [{t:0.55,side:1},{t:0.35,side:-1}], petalCount:5, petalSize:1.15, color:'#00ffcc' },
  { endX:-0.18, endY: -0.44, cp1x: -0.12, cp1y: -0.18, cp2x: -0.16, cp2y: -0.34, startDelay: 0.12, leaves: [{t:0.5,side:-1}],                   petalCount:5, petalSize:0.95, color:'#00e5ff' },
  { endX: 0.17, endY: -0.42, cp1x:  0.10, cp1y: -0.16, cp2x:  0.15, cp2y: -0.32, startDelay: 0.20, leaves: [{t:0.5,side:1}],                    petalCount:5, petalSize:0.90, color:'#80ffdb' },
  { endX:-0.27, endY: -0.30, cp1x: -0.18, cp1y: -0.10, cp2x: -0.24, cp2y: -0.22, startDelay: 0.32, leaves: [],                                  petalCount:4, petalSize:0.70, color:'#00ffcc' },
  { endX: 0.26, endY: -0.29, cp1x:  0.17, cp1y: -0.09, cp2x:  0.22, cp2y: -0.21, startDelay: 0.40, leaves: [],                                  petalCount:4, petalSize:0.65, color:'#00e5ff' },
];

const state = STEMS.map(() => ({ stemP: 0, leafP: 0, flowerP: 0 }));
const TOTAL_DUR = 7000;
let startTime = null;

function stemPoint(s, t) {
  const scale = H * 0.6;
  const x0 = vx, y0 = vy;
  const x3 = vx + s.endX * scale, y3 = vy + s.endY * scale;
  const x1 = vx + s.cp1x * scale, y1 = vy + s.cp1y * scale;
  const x2 = vx + s.cp2x * scale, y2 = vy + s.cp2y * scale;
  return {
    x: bezier(t, x0, x1, x2, x3),
    y: bezier(t, y0, y1, y2, y3),
    dx: 3*(1-t)*(1-t)*(x1-x0) + 6*(1-t)*t*(x2-x1) + 3*t*t*(x3-x2),
    dy: 3*(1-t)*(1-t)*(y1-y0) + 6*(1-t)*t*(y2-y1) + 3*t*t*(y3-y2),
  };
}

function drawVase() {
  const tw = vw * 0.7, bw = vw * 1.1, hh = vh;
  ctx.save();
  ctx.shadowColor = '#00ffcc';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#0d2e2e';
  ctx.strokeStyle = '#00ffcc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(vx - tw, vy - hh * 0.05);
  ctx.bezierCurveTo(vx - bw*1.1, vy, vx - bw, vy + hh, vx - bw*0.5, vy + hh*1.05);
  ctx.lineTo(vx + bw*0.5, vy + hh*1.05);
  ctx.bezierCurveTo(vx + bw, vy + hh, vx + bw*1.1, vy, vx + tw, vy - hh*0.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(vx, vy - hh*0.05, tw*1.05, tw*0.28, 0, 0, Math.PI*2);
  ctx.fillStyle = '#0d3a3a';
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawStem(s, st) {
  if (st.stemP <= 0) return;
  const scale = H * 0.6;
  const x0 = vx, y0 = vy;
  const x3 = vx + s.endX*scale, y3 = vy + s.endY*scale;
  const x1 = vx + s.cp1x*scale, y1 = vy + s.cp1y*scale;
  const x2 = vx + s.cp2x*scale, y2 = vy + s.cp2y*scale;
  const steps = Math.ceil(st.stemP * 50);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * st.stemP;
    pts.push({ x: bezier(t,x0,x1,x2,x3), y: bezier(t,y0,y1,y2,y3) });
  }
  glowCurve(pts, s.color, 2.5, 16);
  glowCurve(pts, '#ffffff', 0.7, 4);

  s.leaves.forEach(leaf => {
    if (st.leafP <= 0 || leaf.t > st.stemP) return;
    const lp = stemPoint(s, leaf.t);
    const angle = Math.atan2(lp.dy, lp.dx) + (leaf.side > 0 ? 0.5 : -0.5) * Math.PI;
    const len = H * 0.07 * st.leafP;
    const lx2 = lp.x + Math.cos(angle) * len;
    const ly2 = lp.y + Math.sin(angle) * len;
    ctx.save();
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color + '33';
    ctx.lineWidth = 1.5;
    const mid = {
      x: (lp.x + lx2) / 2 + Math.cos(angle + Math.PI/2) * len * 0.22 * leaf.side,
      y: (lp.y + ly2) / 2 + Math.sin(angle + Math.PI/2) * len * 0.22 * leaf.side
    };
    ctx.beginPath();
    ctx.moveTo(lp.x, lp.y);
    ctx.quadraticCurveTo(mid.x, mid.y, lx2, ly2);
    ctx.quadraticCurveTo(
      lp.x + Math.cos(angle) * len * 0.3,
      lp.y + Math.sin(angle) * len * 0.3,
      lp.x, lp.y
    );
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
}

function drawFlower(s, st) {
  if (st.flowerP <= 0 || st.stemP < 0.98) return;
  const tip = stemPoint(s, 1.0);
  const fx = tip.x, fy = tip.y;
  const pR = H * 0.045 * s.petalSize * st.flowerP;
  const n = s.petalCount;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
    const px = fx + Math.cos(ang) * pR * 0.85;
    const py = fy + Math.sin(ang) * pR * 0.85;
    ctx.save();
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 22;
    ctx.fillStyle = s.color + 'bb';
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(px, py, pR*0.48, pR*0.62, ang, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 24;
  const grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, pR*0.3);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.5, s.color);
  grad.addColorStop(1, s.color + '88');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(fx, fy, pR*0.28, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
  if (st.flowerP < 0.99) addSpark(fx, fy, s.color);
}

function drawSparkles() {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.x += s.vx;
    s.y += s.vy;
    s.life -= 0.035;
    if (s.life <= 0) { sparks.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = s.life;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}

const floaters = Array.from({length: 30}, () => ({
  x: Math.random() * 800,
  y: Math.random() * 600,
  vx: (Math.random() - 0.5) * 0.3,
  vy: -Math.random() * 0.4 - 0.1,
  r: Math.random() * 1.5 + 0.5,
  color: ['#00ffcc','#00e5ff','#80ffdb'][Math.floor(Math.random()*3)],
  alpha: Math.random() * 0.6 + 0.2
}));

function drawBackground() {
  ctx.fillStyle = '#060f0f';
  ctx.fillRect(0, 0, W, H);
  const rg = ctx.createRadialGradient(vx, vy - H*0.2, 10, vx, vy - H*0.1, H*0.6);
  rg.addColorStop(0, 'rgba(0,90,70,0.22)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);
  floaters.forEach(f => {
    f.x += f.vx;
    f.y += f.vy;
    if (f.y < -5) { f.y = H + 5; f.x = Math.random() * W; }
    if (f.x < 0 || f.x > W) f.vx *= -1;
    ctx.save();
    ctx.globalAlpha = f.alpha * 0.5;
    ctx.shadowColor = f.color;
    ctx.shadowBlur = 6;
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  });
}

function drawTitle(alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = '#00ffcc';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#e0fff8';
  ctx.font = `300 ${Math.round(H * 0.04)}px 'Georgia', serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Sana Açan Çiçekler', W / 2, H * 0.1);
  ctx.shadowBlur = 10;
  ctx.fillStyle = 'rgba(0,255,200,0.55)';
  ctx.font = `300 ${Math.round(H * 0.022)}px 'Georgia', serif`;
  ctx.fillText('Her taç yaprak, seninle geçen bir an ♡', W / 2, H * 0.1 + H * 0.045);
  ctx.restore();
}

function easeInOut(t) {
  return t < 0.5 ? 2*t*t : -1 + (4 - 2*t) * t;
}

function animate(ts) {
  if (!startTime) startTime = ts;
  const elapsed = (ts - startTime) / TOTAL_DUR;
  setLayout();
  drawBackground();
  STEMS.forEach((s, i) => {
    const st = state[i];
    const local = Math.max(0, elapsed - s.startDelay) / (1 - s.startDelay);
    st.stemP   = Math.min(1, easeInOut(Math.min(1, local / 0.45)));
    st.leafP   = st.stemP > 0.4 ? Math.min(1, easeInOut((st.stemP - 0.4) / 0.45)) : 0;
    st.flowerP = st.stemP >= 1.0 ? Math.min(1, easeInOut(Math.min(1, (local - 0.72) / 0.28))) : 0;
  });
  STEMS.forEach((s, i) => drawStem(s, state[i]));
  drawVase();
  STEMS.forEach((s, i) => drawFlower(s, state[i]));
  drawSparkles();
  const titleAlpha = Math.min(1, Math.max(0, (elapsed - 0.7) / 0.3));
  drawTitle(titleAlpha);
  requestAnimationFrame(animate);
}

document.addEventListener('click', e => {
  for (let i = 0; i < 10; i++) {
    addSpark(
      e.clientX + (Math.random() * 20 - 10),
      e.clientY + (Math.random() * 20 - 10),
      ['#00ffcc','#00e5ff','#80ffdb'][Math.floor(Math.random() * 3)]
    );
  }
});

requestAnimationFrame(animate);
