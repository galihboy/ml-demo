const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const sepSlider = document.getElementById('separation');
const stdDevSlider = document.getElementById('stdDev');
const thresholdSlider = document.getElementById('threshold');

const sepValue = document.getElementById('separationValue');
const stdDevValue = document.getElementById('stdDevValue');
const thresholdValue = document.getElementById('thresholdValue');

const tnDisplay = document.getElementById('tnValue');
const fpDisplay = document.getElementById('fpValue');
const fnDisplay = document.getElementById('fnValue');
const tpDisplay = document.getElementById('tpValue');

const accDisplay = document.getElementById('accValue');
const precDisplay = document.getElementById('precValue');
const recDisplay = document.getElementById('recValue');
const f1Display = document.getElementById('f1Value');

let meanNeg = 0;
let meanPos = 2.0;
let stdDev = 1.0;
let threshold = 0.5;
const population = 1000;

function normalPDF(x, mean, std) {
    const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(std, 2));
    return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
}

// Numerical integration for CDF (trapezoidal rule)
function normalCDF(x, mean, std) {
    let sum = 0;
    const start = mean - 5 * std;
    const steps = 100;
    const dx = (x - start) / steps;

    if (x < start) return 0;

    for (let i = 0; i < steps; i++) {
        const x1 = start + i * dx;
        const x2 = start + (i + 1) * dx;
        sum += (normalPDF(x1, mean, std) + normalPDF(x2, mean, std)) * dx / 2;
    }
    return Math.min(1.0, sum);
}

function update() {
    meanPos = parseFloat(sepSlider.value);
    stdDev = parseFloat(stdDevSlider.value);
    threshold = parseFloat(thresholdSlider.value);

    sepValue.textContent = meanPos.toFixed(1);
    stdDevValue.textContent = stdDev.toFixed(1);
    thresholdValue.textContent = threshold.toFixed(2);

    calculateMetrics();
    draw();
}

function calculateMetrics() {
    // Probabilities
    // P(Predict Pos | Neg) = 1 - CDF_neg(threshold) -> FP rate
    // P(Predict Pos | Pos) = 1 - CDF_pos(threshold) -> TP rate

    const probFP = 1 - normalCDF(threshold, meanNeg, stdDev);
    const probTP = 1 - normalCDF(threshold, meanPos, stdDev);

    const TN = Math.round((1 - probFP) * population / 2);
    const FP = Math.round(probFP * population / 2);
    const FN = Math.round((1 - probTP) * population / 2);
    const TP = Math.round(probTP * population / 2);

    tnDisplay.textContent = TN;
    fpDisplay.textContent = FP;
    fnDisplay.textContent = FN;
    tpDisplay.textContent = TP;

    const accuracy = (TP + TN) / (TP + TN + FP + FN);
    const precision = TP / (TP + FP) || 0;
    const recall = TP / (TP + FN) || 0;
    const f1 = (2 * precision * recall) / (precision + recall) || 0;

    accDisplay.textContent = (accuracy * 100).toFixed(1) + '%';
    precDisplay.textContent = (precision * 100).toFixed(1) + '%';
    recDisplay.textContent = (recall * 100).toFixed(1) + '%';
    f1Display.textContent = (f1 * 100).toFixed(1) + '%';

    updateCalculationSteps(TN, FP, FN, TP, accuracy, precision, recall, f1);
}

function updateCalculationSteps(TN, FP, FN, TP, acc, prec, rec, f1) {
    const container = document.getElementById('calculationSteps');

    const html = `
        <div style="margin-bottom: 20px;">
            <strong>1. Accuracy:</strong> (TP + TN) / Total <br>
            &nbsp;&nbsp;&nbsp; = (${TP} + ${TN}) / (${TP + TN + FP + FN}) <br>
            &nbsp;&nbsp;&nbsp; = ${(TP + TN)} / ${TP + TN + FP + FN} <br>
            &nbsp;&nbsp;&nbsp; = <strong>${(acc * 100).toFixed(2)}%</strong>
        </div>
        <div style="margin-bottom: 20px;">
            <strong>2. Precision:</strong> TP / (TP + FP) <br>
            &nbsp;&nbsp;&nbsp; = ${TP} / (${TP} + ${FP}) <br>
            &nbsp;&nbsp;&nbsp; = ${TP} / ${TP + FP} <br>
            &nbsp;&nbsp;&nbsp; = <strong>${(prec * 100).toFixed(2)}%</strong>
        </div>
        <div style="margin-bottom: 20px;">
            <strong>3. Recall (Sensitivity):</strong> TP / (TP + FN) <br>
            &nbsp;&nbsp;&nbsp; = ${TP} / (${TP} + ${FN}) <br>
            &nbsp;&nbsp;&nbsp; = ${TP} / ${TP + FN} <br>
            &nbsp;&nbsp;&nbsp; = <strong>${(rec * 100).toFixed(2)}%</strong>
        </div>
        <div>
            <strong>4. F1-Score:</strong> 2 * (Precision * Recall) / (Precision + Recall) <br>
            &nbsp;&nbsp;&nbsp; = 2 * (${prec.toFixed(4)} * ${rec.toFixed(4)}) / (${prec.toFixed(4)} + ${rec.toFixed(4)}) <br>
            &nbsp;&nbsp;&nbsp; = ${(2 * prec * rec).toFixed(4)} / ${(prec + rec).toFixed(4)} <br>
            &nbsp;&nbsp;&nbsp; = <strong>${(f1 * 100).toFixed(2)}%</strong>
        </div>
    `;
    container.innerHTML = html;
}

function draw() {
    const w = canvas.width;
    const h = canvas.height;
    const padding = 40;

    ctx.clearRect(0, 0, w, h);

    // Mapping: x [-4, 8] for the plot
    const xMin = -4;
    const xMax = 8;
    const yMax = 0.5; // Max PDF height approx

    const toPX = (x) => padding + (x - xMin) / (xMax - xMin) * (w - 2 * padding);
    const toPY = (y) => h - padding - (y / yMax) * (h - 2 * padding);

    // Draw axes
    ctx.strokeStyle = '#ccc';
    ctx.beginPath();
    ctx.moveTo(padding, h - padding);
    ctx.lineTo(w - padding, h - padding);
    ctx.stroke();

    // Draw Neg Distribution (Blue)
    ctx.fillStyle = 'rgba(102, 126, 234, 0.2)';
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(toPX(xMin), toPY(0));
    for (let x = xMin; x <= xMax; x += 0.1) {
        const y = normalPDF(x, meanNeg, stdDev);
        ctx.lineTo(toPX(x), toPY(y));
    }
    ctx.lineTo(toPX(xMax), toPY(0));
    ctx.fill();
    ctx.stroke();

    // Draw Pos Distribution (Orange)
    ctx.fillStyle = 'rgba(237, 137, 54, 0.2)';
    ctx.strokeStyle = '#ed8936';
    ctx.beginPath();
    ctx.moveTo(toPX(xMin), toPY(0));
    for (let x = xMin; x <= xMax; x += 0.1) {
        const y = normalPDF(x, meanPos, stdDev);
        ctx.lineTo(toPX(x), toPY(y));
    }
    ctx.lineTo(toPX(xMax), toPY(0));
    ctx.fill();
    ctx.stroke();

    // Draw Threshold Line
    const tx = toPX(threshold);
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx, padding);
    ctx.lineTo(tx, h - padding);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label Threshold
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Threshold', tx, padding - 10);
}

[sepSlider, stdDevSlider, thresholdSlider].forEach(s => {
    s.addEventListener('input', update);
});

window.addEventListener('resize', () => {
    canvas.width = canvas.parentElement.clientWidth;
    draw();
});

// Init
update();
