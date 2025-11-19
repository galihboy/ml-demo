/**
 * SVM Implementation with Marching Squares Visualization
 */

// --- Configuration & State ---
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

let points = []; // {x, y, label} normalized to [-1, 1]
let alphas = []; // Dual variables
let bias = 0;
let isTraining = false;
let animationId = null;
let epoch = 0;
const MAX_EPOCHS = 2000;
let consecutiveStableSteps = 0;

// Parameters
let kernelType = 'rbf';
let C = 1.0;
let gamma = 0.5;
let degree = 2;
let learningRate = 0.01;

// --- Math Helpers ---
function dot(v1, v2) {
    let sum = 0;
    for (let i = 0; i < v1.length; i++) sum += v1[i] * v2[i];
    return sum;
}

function kernel(v1, v2) {
    if (kernelType === 'linear') {
        return dot(v1, v2);
    } else if (kernelType === 'poly') {
        return Math.pow(dot(v1, v2) + 1, degree);
    } else if (kernelType === 'rbf') {
        let dist = 0;
        for (let i = 0; i < v1.length; i++) dist += (v1[i] - v2[i]) * (v1[i] - v2[i]);
        return Math.exp(-gamma * dist);
    }
    return 0;
}

function predict(p) {
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
        if (alphas[i] > 1e-4) {
            sum += alphas[i] * points[i].label * kernel([points[i].x, points[i].y], p);
        }
    }
    return sum + bias;
}

// --- Training Logic (Simplified SMO / GD) ---
function trainStep() {
    if (points.length === 0) return;

    let changed = 0;
    const iter = 20;

    for (let k = 0; k < iter; k++) {
        let i = Math.floor(Math.random() * points.length);

        let p_i = [points[i].x, points[i].y];
        let y_i = points[i].label;

        let gradient = 1;
        for (let j = 0; j < points.length; j++) {
            gradient -= alphas[j] * points[j].label * points[i].label * kernel([points[i].x, points[i].y], [points[j].x, points[j].y]);
        }

        let oldAlpha = alphas[i];
        alphas[i] += learningRate * gradient;

        if (alphas[i] < 0) alphas[i] = 0;
        if (alphas[i] > C) alphas[i] = C;

        if (Math.abs(alphas[i] - oldAlpha) > 1e-5) changed++;
    }

    // Update Bias
    let sumError = 0;
    let countSV = 0;
    for (let i = 0; i < points.length; i++) {
        if (alphas[i] > 1e-4 && alphas[i] < C - 1e-4) {
            let sumK = 0;
            for (let j = 0; j < points.length; j++) {
                sumK += alphas[j] * points[j].label * kernel([points[j].x, points[j].y], [points[i].x, points[i].y]);
            }
            sumError += (points[i].label - sumK);
            countSV++;
        }
    }
    if (countSV > 0) {
        bias = bias * 0.9 + (sumError / countSV) * 0.1;
    }

    epoch++;
    updateStats();

    if (changed === 0) {
        consecutiveStableSteps++;
    } else {
        consecutiveStableSteps = 0;
    }

    if (epoch >= MAX_EPOCHS || consecutiveStableSteps > 50) {
        isTraining = false;
        btnTrain.style.display = 'inline-block';
        btnStop.style.display = 'none';
        btnResetTrain.style.display = 'inline-block';
        draw();
    }
}

function updateStats() {
    document.getElementById('statEpoch').innerText = epoch;
    let svCount = alphas.filter(a => a > 1e-4).length;
    document.getElementById('statSV').innerText = svCount;

    // Update Calculation Panel
    document.getElementById('calcBias').innerText = `Bias (b): ${bias.toFixed(4)}`;

    const wElem = document.getElementById('calcWeights');
    if (kernelType === 'linear') {
        wElem.style.display = 'block';
        // Calculate W for linear: w = sum(alpha * y * x)
        let wx = 0, wy = 0;
        for (let i = 0; i < points.length; i++) {
            if (alphas[i] > 1e-4) {
                wx += alphas[i] * points[i].label * points[i].x;
                wy += alphas[i] * points[i].label * points[i].y;
            }
        }
        wElem.innerText = `Weights (w): [${wx.toFixed(3)}, ${wy.toFixed(3)}]`;
    } else {
        wElem.style.display = 'none';
    }
}

// --- Marching Squares Visualization ---
const gridResX = 60;
const gridResY = 60;

function draw() {
    // Clear
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);

    if (points.length > 0) {
        // 1. Compute grid values
        let grid = [];
        for (let i = 0; i <= gridResX; i++) {
            grid[i] = [];
            for (let j = 0; j <= gridResY; j++) {
                let nx = (i / gridResX) * 2 - 1;
                let ny = -((j / gridResY) * 2 - 1);
                grid[i][j] = predict([nx, ny]);
            }
        }

        // 2. Draw Contours using Marching Squares
        drawContour(grid, 0, '#000000', 2);       // Decision Boundary
        drawContour(grid, 1, '#3b82f6', 1, true); // Margin +1
        drawContour(grid, -1, '#ef4444', 1, true);// Margin -1

        // 3. Fill regions
        drawBackgroundTint(grid);
    }

    // Draw Points
    for (let i = 0; i < points.length; i++) {
        let p = points[i];
        let cx = (p.x + 1) / 2 * width;
        let cy = (-p.y + 1) / 2 * height;

        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
        ctx.fillStyle = p.label === 1 ? '#3b82f6' : '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Highlight SV
        if (alphas[i] > 1e-3) {
            ctx.beginPath();
            ctx.arc(cx, cy, 10, 0, 2 * Math.PI);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }
}

function drawBackgroundTint(grid) {
    const cellW = width / gridResX;
    const cellH = height / gridResY;

    for (let i = 0; i < gridResX; i++) {
        for (let j = 0; j < gridResY; j++) {
            let val = grid[i][j];
            if (Math.abs(val) > 0.1) {
                ctx.fillStyle = val > 0 ? 'rgba(59, 130, 246, 0.05)' : 'rgba(239, 68, 68, 0.05)';
                ctx.fillRect(i * cellW, j * cellH, cellW + 1, cellH + 1);
            }
        }
    }
}

function drawContour(grid, threshold, color, lineWidth, dashed = false) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    if (dashed) ctx.setLineDash([5, 5]);
    else ctx.setLineDash([]);

    const cellW = width / gridResX;
    const cellH = height / gridResY;

    for (let i = 0; i < gridResX; i++) {
        for (let j = 0; j < gridResY; j++) {
            let vTL = grid[i][j];
            let vTR = grid[i + 1][j];
            let vBR = grid[i + 1][j + 1];
            let vBL = grid[i][j + 1];

            let config = 0;
            if (vTL >= threshold) config |= 8;
            if (vTR >= threshold) config |= 4;
            if (vBR >= threshold) config |= 2;
            if (vBL >= threshold) config |= 1;

            if (config === 0 || config === 15) continue;

            let a = { x: (i + (threshold - vTL) / (vTR - vTL)) * cellW, y: j * cellH };
            let b = { x: (i + 1) * cellW, y: (j + (threshold - vTR) / (vBR - vTR)) * cellH };
            let c = { x: (i + (threshold - vBL) / (vBR - vBL)) * cellW, y: (j + 1) * cellH };
            let d = { x: i * cellW, y: (j + (threshold - vTL) / (vBL - vTL)) * cellH };

            switch (config) {
                case 1: drawLine(c, d); break;
                case 2: drawLine(b, c); break;
                case 3: drawLine(b, d); break;
                case 4: drawLine(a, b); break;
                case 5: drawLine(a, d); drawLine(b, c); break;
                case 6: drawLine(a, c); break;
                case 7: drawLine(a, d); break;
                case 8: drawLine(a, d); break;
                case 9: drawLine(a, c); break;
                case 10: drawLine(a, b); drawLine(c, d); break;
                case 11: drawLine(a, b); break;
                case 12: drawLine(b, d); break;
                case 13: drawLine(b, c); break;
                case 14: drawLine(c, d); break;
            }
        }
    }
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawLine(p1, p2) {
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
}

function loop() {
    if (isTraining) {
        trainStep();
    }
    draw();
    animationId = requestAnimationFrame(loop);
}

// --- Interaction ---
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    let nx = (x / width) * 2 - 1;
    let ny = -((y / height) * 2 - 1);
    let label = (e.button === 2 || e.shiftKey) ? -1 : 1;
    points.push({ x: nx, y: ny, label: label });
    alphas.push(0);
    draw();
});

canvas.addEventListener('contextmenu', event => event.preventDefault());

const btnTrain = document.getElementById('btnTrain');
const btnStop = document.getElementById('btnStop');
const btnResetTrain = document.getElementById('btnResetTrain');
const btnClear = document.getElementById('btnClear');
const btnRandom = document.getElementById('btnRandom');

btnTrain.addEventListener('click', () => {
    isTraining = true;
    consecutiveStableSteps = 0;
    btnTrain.style.display = 'none';
    btnResetTrain.style.display = 'none';
    btnStop.style.display = 'inline-block';
});

btnStop.addEventListener('click', () => {
    isTraining = false;
    btnTrain.style.display = 'inline-block';
    btnResetTrain.style.display = 'inline-block';
    btnStop.style.display = 'none';
});

btnResetTrain.addEventListener('click', () => {
    resetModel();
});

function resetModel() {
    alphas = new Array(points.length).fill(0);
    bias = 0;
    epoch = 0;
    isTraining = false;
    btnTrain.style.display = 'inline-block';
    btnResetTrain.style.display = 'inline-block';
    btnStop.style.display = 'none';
    updateStats();
    draw();
}

btnClear.addEventListener('click', () => {
    points = [];
    resetModel();
});

btnRandom.addEventListener('click', () => {
    points = [];
    if (kernelType === 'linear') {
        for (let i = 0; i < 20; i++) {
            points.push({ x: 0.4 + (Math.random() - 0.5) * 0.4, y: 0.4 + (Math.random() - 0.5) * 0.4, label: 1 });
            points.push({ x: -0.4 + (Math.random() - 0.5) * 0.4, y: -0.4 + (Math.random() - 0.5) * 0.4, label: -1 });
        }
    } else if (kernelType === 'poly') {
        for (let i = 0; i < 40; i++) {
            let x = (Math.random() - 0.5) * 1.8;
            let y = (Math.random() - 0.5) * 1.8;
            let label = y < (x * x - 0.3) ? -1 : 1;
            points.push({ x: x, y: y, label: label });
        }
    } else {
        for (let i = 0; i < 50; i++) {
            let x = (Math.random() - 0.5) * 1.8;
            let y = (Math.random() - 0.5) * 1.8;
            let label = Math.sqrt(x * x + y * y) > 0.5 ? -1 : 1;
            points.push({ x: x, y: y, label: label });
        }
    }
    resetModel();
});

// Parameters
document.getElementById('kernelSelect').addEventListener('change', (e) => {
    kernelType = e.target.value;
    document.getElementById('rbfControls').style.display = kernelType === 'rbf' ? 'block' : 'none';
    document.getElementById('polyControls').style.display = kernelType === 'poly' ? 'block' : 'none';

    // Update Formula Display
    const formulaEl = document.getElementById('calcFormula');
    if (kernelType === 'linear') {
        formulaEl.innerHTML = '\\( K(u, v) = u \\cdot v \\)';
    } else if (kernelType === 'poly') {
        formulaEl.innerHTML = '\\( K(u, v) = (u \\cdot v + 1)^d \\)';
    } else {
        formulaEl.innerHTML = '\\( K(u, v) = e^{-\\gamma ||u-v||^2} \\)';
    }
    if (window.MathJax) MathJax.typeset();

    resetModel();
});

document.getElementById('paramC').addEventListener('input', (e) => {
    C = Math.pow(10, parseFloat(e.target.value));
    document.getElementById('valC').innerText = C.toFixed(2);
});

document.getElementById('paramGamma').addEventListener('input', (e) => {
    gamma = Math.pow(10, parseFloat(e.target.value));
    document.getElementById('valGamma').innerText = gamma.toFixed(2);
});

document.getElementById('paramDegree').addEventListener('input', (e) => {
    degree = parseInt(e.target.value);
    document.getElementById('valDegree').innerText = degree;
});

// Init
points.push({ x: -0.5, y: -0.5, label: -1 });
points.push({ x: -0.2, y: -0.3, label: -1 });
points.push({ x: 0.5, y: 0.5, label: 1 });
points.push({ x: 0.3, y: 0.6, label: 1 });
alphas = [0, 0, 0, 0];

loop();
