const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;
const padding = 50;

let dataPoints = [];
let slope = 0;
let intercept = 0;
let learningRate = 0.01;
let iteration = 0;
let maxIterations = 1000;
let isTraining = false;

// UI Elements
const lrSlider = document.getElementById('learningRate');
const lrValue = document.getElementById('lrValue');
const numPointsSlider = document.getElementById('numPoints');
const dataCountSpan = document.getElementById('dataCount');
const maxIterSlider = document.getElementById('maxIterations');
const maxIterValue = document.getElementById('maxIterValue');
const generateBtn = document.getElementById('generateBtn');
const trainBtn = document.getElementById('trainBtn');
const resetBtn = document.getElementById('resetBtn');

// Event Listeners
lrSlider.addEventListener('input', (e) => {
    learningRate = parseFloat(e.target.value);
    lrValue.textContent = learningRate.toFixed(3);
});

numPointsSlider.addEventListener('input', (e) => {
    dataCountSpan.textContent = e.target.value;
});

maxIterSlider.addEventListener('input', (e) => {
    maxIterations = parseInt(e.target.value);
    maxIterValue.textContent = maxIterations;
    document.getElementById('maxIterDisplay').textContent = maxIterations;
});

generateBtn.addEventListener('click', generateData);
trainBtn.addEventListener('click', toggleTraining);
resetBtn.addEventListener('click', reset);

function generateData() {
    const count = parseInt(numPointsSlider.value);
    dataPoints = [];
    
    // Generate data with some linear relationship + noise
    const trueSlope = 0.7;
    const trueIntercept = 0.2;
    
    for (let i = 0; i < count; i++) {
        const x = Math.random();
        const noise = (Math.random() - 0.5) * 0.3;
        const y = trueSlope * x + trueIntercept + noise;
        dataPoints.push({ x, y });
    }
    
    // Reset iteration when generating new data
    iteration = 0;
    slope = 0;
    intercept = 0;
    
    draw();
}

function toggleTraining() {
    isTraining = !isTraining;
    trainBtn.textContent = isTraining ? 'Stop Training' : 'Mulai Training';
    
    if (isTraining) {
        train();
    }
}

function train() {
    if (!isTraining) return;
    
    // Check if max iterations reached
    if (iteration >= maxIterations) {
        isTraining = false;
        trainBtn.textContent = 'Mulai Training';
        return;
    }
    
    // Gradient Descent
    let slopeGradient = 0;
    let interceptGradient = 0;
    const n = dataPoints.length;
    
    for (const point of dataPoints) {
        const prediction = slope * point.x + intercept;
        const error = prediction - point.y;
        slopeGradient += error * point.x;
        interceptGradient += error;
    }
    
    slope -= (learningRate * slopeGradient) / n;
    intercept -= (learningRate * interceptGradient) / n;
    
    iteration++;
    draw();
    
    requestAnimationFrame(train);
}

function calculateCost() {
    let sum = 0;
    for (const point of dataPoints) {
        const prediction = slope * point.x + intercept;
        sum += Math.pow(prediction - point.y, 2);
    }
    return sum / (2 * dataPoints.length);
}

function draw() {
    clearCanvas(ctx, width, height);
    
    // Draw axes
    drawAxes(ctx, width, height, padding);
    
    // Draw data points
    for (const point of dataPoints) {
        const x = padding + point.x * (width - 2 * padding);
        const y = height - padding - point.y * (height - 2 * padding);
        drawPoint(ctx, x, y, '#667eea', 6);
    }
    
    // Draw regression line
    const x1 = padding;
    const y1 = height - padding - intercept * (height - 2 * padding);
    const x2 = width - padding;
    const y2 = height - padding - (slope + intercept) * (height - 2 * padding);
    drawLine(ctx, x1, y1, x2, y2, '#e74c3c', 3);
    
    // Update stats
    document.getElementById('iteration').textContent = iteration;
    document.getElementById('cost').textContent = calculateCost().toFixed(6);
    document.getElementById('slope').textContent = slope.toFixed(4);
    document.getElementById('intercept').textContent = intercept.toFixed(4);
}

function reset() {
    isTraining = false;
    trainBtn.textContent = 'Mulai Training';
    slope = 0;
    intercept = 0;
    iteration = 0;
    draw();
}

// Initialize
generateData();
