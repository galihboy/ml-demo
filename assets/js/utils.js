// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.innerHTML = theme === 'light' ? '🌙' : '☀️';
    }
}

// Tambahkan event listener saat DOM content dimuat
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
    }
});

// Utility functions untuk demo ML

// Generate random data points
function generateRandomPoints(count, xRange, yRange) {
    const points = [];
    for (let i = 0; i < count; i++) {
        points.push({
            x: Math.random() * (xRange[1] - xRange[0]) + xRange[0],
            y: Math.random() * (yRange[1] - yRange[0]) + yRange[0]
        });
    }
    return points;
}

// Calculate distance between two points
function distance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

// Normalize data
function normalize(data, min, max) {
    return data.map(val => (val - min) / (max - min));
}

// Draw axes on canvas
function drawAxes(ctx, width, height, padding = 40) {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;

    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();
}

// Draw point on canvas
function drawPoint(ctx, x, y, color = '#667eea', radius = 5) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
}

// Draw line on canvas
function drawLine(ctx, x1, y1, x2, y2, color = '#764ba2', width = 2) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

// Clear canvas
function clearCanvas(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
}
