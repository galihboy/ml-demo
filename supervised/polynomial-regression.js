const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const degreeSlider = document.getElementById('degree');
const degreeValue = document.getElementById('degreeValue');
const regSelect = document.getElementById('regType');
const lambdaSlider = document.getElementById('lambda');
const lambdaValue = document.getElementById('lambdaValue');
const lambdaControl = document.getElementById('lambdaControl');
const noiseSlider = document.getElementById('noise');
const noiseValue = document.getElementById('noiseValue');
const generateBtn = document.getElementById('generateBtn');
const resetBtn = document.getElementById('resetBtn');
const formulaDisplay = document.getElementById('formula');
const mseDisplay = document.getElementById('mse');
const normDisplay = document.getElementById('norm');

let dataPoints = [];
let weights = [];
let degree = 1;
let lambda = 0.1;
let regType = 'none';
let noise = 0.2;
const padding = 50;

function resize() {
    const width = canvas.parentElement.clientWidth;
    canvas.width = width;
    canvas.height = 500;
    draw();
}

function generateData() {
    dataPoints = [];
    const n = 25;
    // Generate S-curve data
    for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1; // -1 to 1
        const y = 0.5 * Math.sin(x * Math.PI) + (Math.random() - 0.5) * noise;
        dataPoints.push({ x, y });
    }
    fit();
}

// Fit using Gradient Descent for better interactivity/demonstration
function fit() {
    degree = parseInt(degreeSlider.value);
    lambda = parseFloat(lambdaSlider.value);
    regType = regSelect.value;

    // Initialize weights
    weights = new Array(degree + 1).fill(0).map(() => (Math.random() - 0.5) * 0.1);

    const lr = 0.1;
    const iterations = 5000;

    // Feature mapping for all points [1, x, x^2, ...]
    const X = dataPoints.map(p => {
        const features = [];
        for (let d = 0; d <= degree; d++) {
            features.push(Math.pow(p.x, d));
        }
        return features;
    });

    const y = dataPoints.map(p => p.y);
    const n = dataPoints.length;

    // Gradient Descent
    for (let iter = 0; iter < iterations; iter++) {
        const gradients = new Array(degree + 1).fill(0);

        for (let i = 0; i < n; i++) {
            let prediction = 0;
            for (let d = 0; d <= degree; d++) {
                prediction += weights[d] * X[i][d];
            }

            const error = prediction - y[i];
            for (let d = 0; d <= degree; d++) {
                gradients[d] += (error * X[i][d]) / n;
            }
        }

        // Add Regularization to Gradients
        for (let d = 0; d <= degree; d++) {
            let regGrad = 0;
            if (d > 0) { // Don't regularize bias
                if (regType === 'l2') {
                    regGrad = lambda * weights[d];
                } else if (regType === 'l1') {
                    regGrad = lambda * Math.sign(weights[d]);
                }
            }
            weights[d] -= lr * (gradients[d] + regGrad);
        }
    }

    draw();
    updateUI();
}

function predict(x) {
    let y = 0;
    for (let d = 0; d <= degree; d++) {
        y += weights[d] * Math.pow(x, d);
    }
    return y;
}

function draw() {
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw axes
    ctx.strokeStyle = '#ccc';
    ctx.beginPath();
    ctx.moveTo(padding, h / 2);
    ctx.lineTo(w - padding, h / 2);
    ctx.moveTo(w / 2, padding);
    ctx.lineTo(w / 2, h - padding);
    ctx.stroke();

    // Mapping: x [-1.2, 1.2], y [-1, 1]
    const scaleX = (w - 2 * padding) / 2.4;
    const scaleY = (h - 2 * padding) / 2;

    const toPX = (x) => w / 2 + x * scaleX;
    const toPY = (y) => h / 2 - y * scaleY;

    // Draw curve
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = -1.2; x <= 1.2; x += 0.05) {
        const y = predict(x);
        if (x === -1.2) ctx.moveTo(toPX(x), toPY(y));
        else ctx.lineTo(toPX(x), toPY(y));
    }
    ctx.stroke();

    // Draw points
    dataPoints.forEach(p => {
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(toPX(p.x), toPY(p.y), 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
    });
}

function updateUI() {
    let formula = "y = ";
    weights.forEach((w, i) => {
        if (Math.abs(w) < 0.001) return;
        const sign = w >= 0 ? (i === 0 ? "" : " + ") : (i === 0 ? "-" : " - ");
        const val = Math.abs(w).toFixed(3);
        const term = i === 0 ? "" : (i === 1 ? "x" : `x<sup>${i}</sup>`);
        formula += `${sign}${val}${term}`;
    });
    formulaDisplay.innerHTML = formula;

    let mse = 0;
    dataPoints.forEach(p => {
        mse += Math.pow(predict(p.x) - p.y, 2);
    });
    mseDisplay.textContent = (mse / dataPoints.length).toFixed(6);

    let norm = 0;
    if (regType === 'l1') {
        weights.slice(1).forEach(w => norm += Math.abs(w));
    } else {
        weights.slice(1).forEach(w => norm += w * w);
        norm = Math.sqrt(norm);
    }
    normDisplay.textContent = norm.toFixed(4);
}

degreeSlider.addEventListener('input', (e) => {
    degreeValue.textContent = e.target.value;
    fit();
});

regSelect.addEventListener('change', (e) => {
    regType = e.target.value;
    lambdaControl.style.display = regType === 'none' ? 'none' : 'block';
    fit();
});

lambdaSlider.addEventListener('input', (e) => {
    lambdaValue.textContent = e.target.value;
    fit();
});

noiseSlider.addEventListener('input', (e) => {
    noise = parseFloat(e.target.value);
    noiseValue.textContent = noise.toFixed(2);
    generateData();
});

generateBtn.addEventListener('click', generateData);
resetBtn.addEventListener('click', () => {
    degreeSlider.value = 1;
    degreeValue.textContent = 1;
    regSelect.value = 'none';
    lambdaControl.style.display = 'none';
    fit();
});

window.addEventListener('resize', resize);
resize();
generateData();
