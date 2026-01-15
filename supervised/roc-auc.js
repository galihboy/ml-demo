const distCanvas = document.getElementById('distCanvas');
const rocCanvas = document.getElementById('rocCanvas');
const distCtx = distCanvas.getContext('2d');
const rocCtx = rocCanvas.getContext('2d');

const sepSlider = document.getElementById('sepSlider');
const thresholdSlider = document.getElementById('thresholdSlider');
const sepValue = document.getElementById('sepValue');
const thresholdValue = document.getElementById('thresholdValue');

const tprVal = document.getElementById('tprVal');
const fprVal = document.getElementById('fprVal');
const aucVal = document.getElementById('aucVal');

let meanNeg = 0;
let meanPos = 2.0;
let stdDev = 1.0;
let threshold = 0.5;

function normalPDF(x, mean, std) {
    const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(std, 2));
    return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
}

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
    threshold = parseFloat(thresholdSlider.value);

    sepValue.textContent = meanPos.toFixed(1);
    thresholdValue.textContent = threshold.toFixed(2);

    drawDist();
    drawROC();
}

function drawDist() {
    const w = distCanvas.width;
    const h = distCanvas.height;
    const padding = 40;
    distCtx.clearRect(0, 0, w, h);

    const xMin = -4; const xMax = 8; const yMax = 0.5;
    const toPX = (x) => padding + (x - xMin) / (xMax - xMin) * (w - 2 * padding);
    const toPY = (y) => h - padding - (y / yMax) * (h - 2 * padding);

    // X-Axis
    distCtx.strokeStyle = '#ccc';
    distCtx.beginPath();
    distCtx.moveTo(padding, h - padding); distCtx.lineTo(w - padding, h - padding);
    distCtx.stroke();

    // Neg
    distCtx.fillStyle = 'rgba(102, 126, 234, 0.1)';
    distCtx.strokeStyle = '#667eea';
    distCtx.beginPath();
    distCtx.moveTo(toPX(xMin), toPY(0));
    for (let x = xMin; x <= xMax; x += 0.1) distCtx.lineTo(toPX(x), toPY(normalPDF(x, meanNeg, stdDev)));
    distCtx.lineTo(toPX(xMax), toPY(0));
    distCtx.fill(); distCtx.stroke();

    // Pos
    distCtx.fillStyle = 'rgba(237, 137, 54, 0.1)';
    distCtx.strokeStyle = '#ed8936';
    distCtx.beginPath();
    distCtx.moveTo(toPX(xMin), toPY(0));
    for (let x = xMin; x <= xMax; x += 0.1) distCtx.lineTo(toPX(x), toPY(normalPDF(x, meanPos, stdDev)));
    distCtx.lineTo(toPX(xMax), toPY(0));
    distCtx.fill(); distCtx.stroke();

    // Threshold
    const tx = toPX(threshold);
    distCtx.setLineDash([5, 5]);
    distCtx.strokeStyle = '#333';
    distCtx.beginPath(); distCtx.moveTo(tx, padding); distCtx.lineTo(tx, h - padding); distCtx.stroke();
    distCtx.setLineDash([]);
}

function drawROC() {
    const w = rocCanvas.width;
    const h = rocCanvas.height;
    const padding = 50;
    rocCtx.clearRect(0, 0, w, h);

    const toPX = (f) => padding + f * (w - 2 * padding);
    const toPY = (t) => h - padding - t * (h - 2 * padding);

    // Axes
    rocCtx.strokeStyle = '#333';
    rocCtx.lineWidth = 2;
    rocCtx.beginPath();
    rocCtx.moveTo(padding, h - padding); rocCtx.lineTo(w - padding, h - padding); // X
    rocCtx.moveTo(padding, padding); rocCtx.lineTo(padding, h - padding); // Y
    rocCtx.stroke();

    // Diagonal (Random Classifier)
    rocCtx.setLineDash([2, 5]);
    rocCtx.strokeStyle = '#aaa';
    rocCtx.beginPath(); rocCtx.moveTo(toPX(0), toPY(0)); rocCtx.lineTo(toPX(1), toPY(1)); rocCtx.stroke();
    rocCtx.setLineDash([]);

    // Curve
    rocCtx.strokeStyle = '#e91e63';
    rocCtx.lineWidth = 3;
    rocCtx.beginPath();

    let auc = 0;
    let prevFPR = 1;
    let prevTPR = 1;

    // Sweep threshold from high to low (right to left on distribution, left to right on ROC)
    // Actually ROC is (FPR, TPR). 
    // High Threshold -> Low FPR, Low TPR (near 0,0)
    // Low Threshold -> High FPR, High TPR (near 1,1)
    for (let t = 8; t >= -4; t -= 0.1) {
        const fpr = 1 - normalCDF(t, meanNeg, stdDev);
        const tpr = 1 - normalCDF(t, meanPos, stdDev);

        if (t === 8) rocCtx.moveTo(toPX(fpr), toPY(tpr));
        else rocCtx.lineTo(toPX(fpr), toPY(tpr));

        // Simple Trapezoidal AUC
        auc += (prevFPR - fpr) * (tpr + prevTPR) / 2;
        prevFPR = fpr;
        prevTPR = tpr;
    }
    rocCtx.stroke();
    aucVal.textContent = Math.abs(auc).toFixed(4);

    // Current Threshold Point
    const currentFPR = 1 - normalCDF(threshold, meanNeg, stdDev);
    const currentTPR = 1 - normalCDF(threshold, meanPos, stdDev);

    const px = toPX(currentFPR);
    const py = toPY(currentTPR);

    rocCtx.fillStyle = '#333';
    rocCtx.beginPath(); rocCtx.arc(px, py, 6, 0, Math.PI * 2); rocCtx.fill();
    rocCtx.strokeStyle = 'white'; rocCtx.lineWidth = 2; rocCtx.stroke();

    tprVal.textContent = currentTPR.toFixed(3);
    fprVal.textContent = currentFPR.toFixed(3);

    // Labels
    rocCtx.fillStyle = '#666';
    rocCtx.font = '12px sans-serif';
    rocCtx.textAlign = 'center';
    rocCtx.fillText('False Positive Rate (FPR)', w / 2, h - 10);
    rocCtx.save();
    rocCtx.translate(15, h / 2);
    rocCtx.rotate(-Math.PI / 2);
    rocCtx.fillText('True Positive Rate (TPR)', 0, 0);
    rocCtx.restore();
}

sepSlider.addEventListener('input', update);
thresholdSlider.addEventListener('input', update);

update();
