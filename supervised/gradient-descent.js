const canvas1 = document.getElementById('canvas1');
const ctx1 = canvas1.getContext('2d');
const canvas2 = document.getElementById('canvas2');
const ctx2 = canvas2.getContext('2d');

const lrRange = document.getElementById('lr-range');
const startRange = document.getElementById('start-range');
const speedRange = document.getElementById('speed-range');
const maxIterRange = document.getElementById('max-iter-range');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');

const lrVal = document.getElementById('lr-val');
const startVal = document.getElementById('start-val');
const speedVal = document.getElementById('speed-val');
const maxIterVal = document.getElementById('max-iter-val');

const iterStat = document.getElementById('iter-stat');
const xStat = document.getElementById('x-stat');
const yStat = document.getElementById('y-stat');
const gradStat = document.getElementById('grad-stat');
const effLrStat = document.getElementById('eff-lr-stat');
const effLrCard = document.getElementById('eff-lr-card');
const decayToggle = document.getElementById('decay-toggle');

const modeFixed = document.getElementById('mode-fixed');
const modeAdaptive = document.getElementById('mode-adaptive');
const iterGroup = document.getElementById('iter-group');
const funcSelect = document.getElementById('func-select');
const formulaDisplay = document.getElementById('formula-display');

let x = -4;
let iteration = 0;
let running = false;
let history = [];
let timer = null;

const functions = {
    quadratic: {
        f: (x) => x * x,
        df: (x) => 2 * x,
        formula: "f(x) = x²<br>f'(x) = <span>2x</span>",
        range: { minX: -6, maxX: 6, minY: -1, maxY: 30 }
    },
    absolute: {
        f: (x) => Math.abs(x),
        df: (x) => x === 0 ? 0 : (x > 0 ? 1 : -1),
        formula: "f(x) = |x|<br>f'(x) = <span>sign(x)</span>",
        range: { minX: -6, maxX: 6, minY: -1, maxY: 10 }
    },
    quartic: {
        f: (x) => Math.pow(x, 4) * 0.1,
        df: (x) => 0.4 * Math.pow(x, 3),
        formula: "f(x) = 0.1x⁴<br>f'(x) = <span>0.4x³</span>",
        range: { minX: -6, maxX: 6, minY: -5, maxY: 80 }
    },
    nonconvex: {
        f: (x) => x * x + 5 * Math.sin(2 * x),
        df: (x) => 2 * x + 10 * Math.cos(2 * x),
        formula: "f(x) = x² + 5sin(2x)<br>f'(x) = <span>2x + 10cos(2x)</span>",
        range: { minX: -6, maxX: 6, minY: -10, maxY: 40 }
    }
};

function getCurrent() {
    return functions[funcSelect.value];
}

function f(x) { return getCurrent().f(x); }
function df(x) { return getCurrent().df(x); }

function init() {
    resize();
    reset();
    window.addEventListener('resize', resize);
}

function resize() {
    const containers = document.querySelectorAll('.canvas-box');

    [canvas1, canvas2].forEach((canvas, i) => {
        const rect = containers[i].getBoundingClientRect();
        canvas.width = rect.width * devicePixelRatio;
        canvas.height = rect.height * devicePixelRatio;
        const ctx = i === 0 ? ctx1 : ctx2;
        ctx.resetTransform();
        ctx.scale(devicePixelRatio, devicePixelRatio);
    });
    draw();
}

function reset() {
    stop();
    x = parseFloat(startRange.value);
    iteration = 0;
    history = [{ x: x, y: f(x) }];
    updateStats();
    draw();
}

function stop() {
    running = false;
    startBtn.textContent = '▶️ Start';
    if (timer) clearTimeout(timer);
}

function step() {
    if (!running) return;

    const baseLr = parseFloat(lrRange.value);
    const useDecay = decayToggle.checked;

    const lr = useDecay ? (baseLr / (1 + 0.05 * iteration)) : baseLr;

    const grad = df(x);

    x = x - lr * grad;
    iteration++;

    history.push({ x: x, y: f(x) });

    updateStats();
    draw();

    const isAdaptive = modeAdaptive.checked;
    const maxIter = parseInt(maxIterRange.value);

    if (isAdaptive) {
        if (Math.abs(grad) < 0.001 || iteration > 500 || Math.abs(x) > 20) {
            stop();
            return;
        }
    } else {
        if (iteration >= maxIter || Math.abs(x) > 20) {
            stop();
            return;
        }
    }

    timer = setTimeout(step, parseInt(speedRange.value));
}

function updateStats() {
    lrVal.textContent = parseFloat(lrRange.value).toFixed(3);
    startVal.textContent = parseFloat(startRange.value).toFixed(1);
    speedVal.textContent = speedRange.value + 'ms';
    maxIterVal.textContent = maxIterRange.value;

    iterStat.textContent = iteration;
    xStat.textContent = x.toFixed(3);
    yStat.textContent = f(x).toFixed(3);
    gradStat.textContent = df(x).toFixed(3);

    const useDecay = decayToggle.checked;
    if (useDecay && iteration > 0) {
        effLrCard.style.display = 'block';
        const baseLr = parseFloat(lrRange.value);
        const effLr = baseLr / (1 + 0.05 * iteration);
        effLrStat.textContent = effLr.toFixed(4);
    } else {
        effLrCard.style.display = 'none';
    }

    iterGroup.style.opacity = modeFixed.checked ? '1' : '0.5';
    iterGroup.style.pointerEvents = modeFixed.checked ? 'auto' : 'none';

    formulaDisplay.innerHTML = getCurrent().formula;

    if (Math.abs(x) > 20) {
        xStat.classList.add('danger');
        yStat.classList.add('danger');
    } else {
        xStat.classList.remove('danger');
        yStat.classList.remove('danger');
    }
}

function draw() {
    drawParabola();
    drawLoss();
}

function drawParabola() {
    const w = canvas1.width / devicePixelRatio;
    const h = canvas1.height / devicePixelRatio;
    ctx1.clearRect(0, 0, w, h);

    // Background
    ctx1.fillStyle = '#f8f9fa';
    ctx1.fillRect(0, 0, w, h);

    // Grid
    ctx1.strokeStyle = 'rgba(102, 126, 234, 0.1)';
    ctx1.lineWidth = 1;
    for (let i = 0; i < w; i += 40) { ctx1.beginPath(); ctx1.moveTo(i, 0); ctx1.lineTo(i, h); ctx1.stroke(); }
    for (let i = 0; i < h; i += 40) { ctx1.beginPath(); ctx1.moveTo(0, i); ctx1.lineTo(w, i); ctx1.stroke(); }

    const padding = 40;
    const { minX, maxX, minY, maxY } = getCurrent().range;

    const toSX = (vx) => padding + (vx - minX) / (maxX - minX) * (w - 2 * padding);
    const toSY = (vy) => h - padding - (vy - minY) / (maxY - minY) * (h - 2 * padding);

    // Axes
    ctx1.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx1.lineWidth = 2;
    ctx1.beginPath(); ctx1.moveTo(toSX(minX), toSY(0)); ctx1.lineTo(toSX(maxX), toSY(0)); ctx1.stroke();
    ctx1.beginPath(); ctx1.moveTo(toSX(0), toSY(minY)); ctx1.lineTo(toSX(0), toSY(maxY)); ctx1.stroke();

    // Loss Function Curve
    ctx1.strokeStyle = '#764ba2';
    ctx1.lineWidth = 3;
    ctx1.beginPath();
    for (let vx = minX; vx <= maxX; vx += 0.1) {
        const vy = f(vx);
        if (vx === minX) ctx1.moveTo(toSX(vx), toSY(vy)); else ctx1.lineTo(toSX(vx), toSY(vy));
    }
    ctx1.stroke();

    // Path
    if (history.length > 1) {
        ctx1.strokeStyle = '#667eea';
        ctx1.lineWidth = 2;
        ctx1.setLineDash([5, 5]);
        ctx1.beginPath();
        ctx1.moveTo(toSX(history[0].x), toSY(history[0].y));
        history.forEach(p => ctx1.lineTo(toSX(p.x), toSY(p.y)));
        ctx1.stroke();
        ctx1.setLineDash([]);
    }

    // Ball with glow
    const sx = toSX(x), sy = toSY(f(x));
    const grad = ctx1.createRadialGradient(sx, sy, 0, sx, sy, 15);
    grad.addColorStop(0, 'rgba(102, 126, 234, 0.8)');
    grad.addColorStop(1, 'transparent');
    ctx1.fillStyle = grad;
    ctx1.beginPath();
    ctx1.arc(sx, sy, 15, 0, Math.PI * 2);
    ctx1.fill();
    
    ctx1.fillStyle = '#667eea';
    ctx1.beginPath();
    ctx1.arc(sx, sy, 8, 0, Math.PI * 2);
    ctx1.fill();
    
    ctx1.strokeStyle = '#fff';
    ctx1.lineWidth = 2;
    ctx1.stroke();
}

function drawLoss() {
    const w = canvas2.width / devicePixelRatio;
    const h = canvas2.height / devicePixelRatio;
    ctx2.clearRect(0, 0, w, h);

    // Background
    ctx2.fillStyle = '#f8f9fa';
    ctx2.fillRect(0, 0, w, h);

    ctx2.strokeStyle = 'rgba(102, 126, 234, 0.1)';
    for (let i = 0; i < w; i += 40) { ctx2.beginPath(); ctx2.moveTo(i, 0); ctx2.lineTo(i, h); ctx2.stroke(); }
    for (let i = 0; i < h; i += 40) { ctx2.beginPath(); ctx2.moveTo(0, i); ctx2.lineTo(w, i); ctx2.stroke(); }

    const padding = 40;
    const maxI = Math.max(20, history.length + 5);
    const maxY = Math.max(25, ...history.map(p => p.y)) + 5;

    const toSX = (i) => padding + (i / maxI) * (w - 2 * padding);
    const toSY = (vy) => h - padding - (vy / maxY) * (h - 2 * padding);

    // Axes
    ctx2.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx2.lineWidth = 2;
    ctx2.beginPath(); ctx2.moveTo(padding, h - padding); ctx2.lineTo(w - padding, h - padding); ctx2.stroke();
    ctx2.beginPath(); ctx2.moveTo(padding, padding); ctx2.lineTo(padding, h - padding); ctx2.stroke();

    // Loss Path
    if (history.length > 0) {
        ctx2.strokeStyle = '#667eea';
        ctx2.lineWidth = 3;
        ctx2.beginPath();
        ctx2.moveTo(toSX(0), toSY(history[0].y));
        history.forEach((p, i) => ctx2.lineTo(toSX(i), toSY(p.y)));
        ctx2.stroke();

        // Current Point
        const sx = toSX(history.length - 1);
        const sy = toSY(history[history.length - 1].y);
        ctx2.fillStyle = '#667eea';
        ctx2.beginPath();
        ctx2.arc(sx, sy, 6, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.strokeStyle = '#fff';
        ctx2.lineWidth = 2;
        ctx2.stroke();
    }

    // Axis Labels
    ctx2.fillStyle = '#666';
    ctx2.font = '12px Segoe UI';
    ctx2.fillText('Iterasi', w / 2, h - 10);
    ctx2.save();
    ctx2.translate(15, h / 2);
    ctx2.rotate(-Math.PI / 2);
    ctx2.fillText('Loss', 0, 0);
    ctx2.restore();
}

// Events
[lrRange, startRange, speedRange, maxIterRange].forEach(el => {
    el.addEventListener('input', () => {
        if (el === startRange && !running) reset();
        updateStats();
    });
});

[modeFixed, modeAdaptive].forEach(el => {
    el.addEventListener('change', updateStats);
});

funcSelect.addEventListener('change', () => {
    reset();
    updateStats();
});

startBtn.addEventListener('click', () => {
    if (running) {
        stop();
    } else {
        if (Math.abs(x) > 20) reset();
        running = true;
        startBtn.textContent = '⏸️ Pause';
        step();
    }
});

resetBtn.addEventListener('click', reset);

init();
