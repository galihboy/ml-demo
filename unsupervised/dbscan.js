// ==================== KONFIGURASI ====================
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const COLORS = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#2c3e50'
];
const NOISE_COLOR = '#95a5a6'; // Gray for noise initially
const UNVISITED_COLOR = '#bdc3c7';

let points = [];
let epsilon = 30;
let minPts = 3;
let currentClusterId = 0;
let isRunning = false;
let autoPlayInterval = null;
let animationSpeed = 200;

// Animation State
let unvisitedPoints = [];
let queue = []; // For expandCluster BFS
let currentPoint = null;
let currentNeighbors = [];
let algorithmState = 'start'; // start, pick_point, expand, finished
let processingCluster = false;

// Learning Mode
let isLearningMode = false;
let maxPointsLearning = 10;

// ==================== INISIALISASI ====================
function init() {
    resizeCanvas();
    updateStats();
    draw();

    window.addEventListener('resize', () => {
        resizeCanvas();
        draw();
    });

    // Event Listeners
    canvas.addEventListener('pointerdown', handleCanvasClick);

    // Prevent scrolling when touching canvas
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });

    document.getElementById('epsSlider').addEventListener('input', (e) => {
        epsilon = parseInt(e.target.value);
        document.getElementById('epsDisplay').textContent = epsilon + 'px';
        draw();
    });
    document.getElementById('minPtsSlider').addEventListener('input', (e) => {
        minPts = parseInt(e.target.value);
        document.getElementById('minPtsDisplay').textContent = minPts;
    });
    document.getElementById('speedSlider').addEventListener('input', (e) => {
        animationSpeed = parseInt(e.target.value);
        document.getElementById('speedDisplay').textContent = animationSpeed + 'ms';
    });

    document.getElementById('btnRandom').addEventListener('click', generateRandomData);
    document.getElementById('btnClear').addEventListener('click', clearAll);
    document.getElementById('btnStart').addEventListener('click', startDBSCAN);
    document.getElementById('btnStep').addEventListener('click', nextStep);
    document.getElementById('btnAuto').addEventListener('click', toggleAutoPlay);
    document.getElementById('btnReset').addEventListener('click', resetDBSCAN);
    document.getElementById('toggleCalc').addEventListener('click', toggleLog);

    setupLearningMode();
    updateLegend();
}

function setupLearningMode() {
    const toggle = document.getElementById('learningModeToggle');
    if (!toggle) return;

    // Initial State
    isLearningMode = toggle.checked; // Ensure we sync with UI state
    updateLearningUI();

    toggle.addEventListener('change', (e) => {
        isLearningMode = e.target.checked;
        updateLearningUI();
        if (isLearningMode && points.length > maxPointsLearning) {
            generateRandomData();
        }
        draw();
    });

    const maxPointsSlider = document.getElementById('maxPointsSlider');
    if (maxPointsSlider) {
        maxPointsSlider.addEventListener('input', (e) => {
            maxPointsLearning = parseInt(e.target.value);
            document.getElementById('maxPointsDisplay').textContent = maxPointsLearning;
        });
    }
}

function updateLearningUI() {
    const controls = document.getElementById('learningControls');
    const panel = document.querySelector('.calculation-panel');
    if (isLearningMode) {
        controls.style.display = 'block';
        panel.style.display = 'block';
    } else {
        controls.style.display = 'none';
        panel.style.display = 'none';
    }
}

function resizeCanvas() {
    const container = canvas.parentElement;
    const width = container.clientWidth;
    const height = Math.min(500, width * 0.625);
    canvas.width = width;
    canvas.height = height;
}

function handleCanvasClick(e) {
    if (isRunning) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    points.push({
        x, y,
        id: points.length + 1,
        visited: false,
        type: 'unvisited', // unvisited, core, border, noise
        clusterId: -1,
        label: `P${points.length + 1}`
    });
    updateStats();
    draw();
}

// ==================== LOGIC DBSCAN ====================
function startDBSCAN() {
    if (points.length === 0) return;

    isRunning = true;
    algorithmState = 'pick_point';
    currentClusterId = 0;

    // Reset status
    points.forEach(p => {
        p.visited = false;
        p.type = 'unvisited';
        p.clusterId = -1;
    });

    // Create copy for processing order (or just iterate index)
    unvisitedPoints = points.map((_, i) => i).filter(i => !points[i].visited);
    queue = [];

    updateButtons(true);
    updateStepInfo('Mulai Clustering', 'Algoritma dimulai. Klik "Step" untuk mencari titik yang belum dikunjungi.');
    clearLog();
    logCalculation('Mulai', `Parameter: ε=${epsilon}, MinPts=${minPts}`);
}

function nextStep() {
    if (!isRunning) return;

    if (algorithmState === 'pick_point') {
        if (queue.length > 0) {
            // Kita sedang dalam mode expand cluster
            algorithmState = 'expand';
            processQueue();
        } else {
            // Cari titik unvisited baru
            const nextIdx = points.findIndex(p => !p.visited);
            if (nextIdx === -1) {
                finishDBSCAN();
                return;
            }

            currentPoint = points[nextIdx];
            currentPoint.visited = true;

            // Cek Neighbors
            currentNeighbors = getNeighbors(currentPoint);
            let logMsg = `Memeriksa Titik ${currentPoint.label}...<br>`;
            logMsg += `Ditemukan ${currentNeighbors.length} tetangga dalam radius ${epsilon}px.`;

            if (currentNeighbors.length >= minPts) {
                // Core Point
                currentClusterId++;
                currentPoint.type = 'core';
                currentPoint.clusterId = currentClusterId;
                logMsg += `<br>Jumlah tetangga >= ${minPts} ➝ <strong>Core Point</strong>. Buat Cluster Baru <strong>C${currentClusterId}</strong>.`;

                // Add neighbors to queue
                currentNeighbors.forEach(n => {
                    if (n.clusterId === -1) n.clusterId = currentClusterId; // Assign to cluster immediately
                    if (!n.visited) {
                        queue.push(n);
                    }
                });

                algorithmState = 'expand';
            } else {
                // Noise (sementara, bisa jadi border nanti)
                currentPoint.type = 'noise';
                logMsg += `<br>Jumlah tetangga < ${minPts} ➝ <strong>Noise</strong> (sementara).`;
            }

            logCalculation(`Cek ${currentPoint.label}`, logMsg);
            draw();
            updateStepInfo(`Memproses ${currentPoint.label}`, `Mengecek apakah titik ini Core atau Noise.`);
        }
    } else if (algorithmState === 'expand') {
        processQueue();
    }
}

function processQueue() {
    if (queue.length === 0) {
        algorithmState = 'pick_point';
        currentPoint = null;
        currentNeighbors = [];
        updateStepInfo('Cluster Selesai', `Ekspansi Cluster ${currentClusterId} selesai. Mencari titik unvisited lain...`);
        // Auto calls nextStep usually handled by AutoPlay or User
        return;
    }

    const p = queue.shift();
    if (p.visited) {
        // Skip if already visited but check if we need to update neighbors
        // But for standard DBSCAN animation, usually we check neighbors of anything in queue
    }

    p.visited = true;
    currentPoint = p; // Focus

    const neighbors = getNeighbors(p);
    currentNeighbors = neighbors; // For visualization

    let logMsg = `Ekspansi: Memeriksa tetangga ${p.label} (Cluster C${currentClusterId})...`;

    if (neighbors.length >= minPts) {
        p.type = 'core'; // Upgrade status if it was border
        logMsg += `<br>Tetangga ${neighbors.length} >= ${minPts} ➝ Core Point.`;

        neighbors.forEach(n => {
            if (n.clusterId === -1 || n.type === 'noise' || n.type === 'unvisited') {
                // Change noise to border if it becomes part of cluster
                if (n.type === 'noise') {
                    n.type = 'border';
                    n.clusterId = currentClusterId;
                    logMsg += `<br>➝ Menambahkan ${n.label} (sebelumnya Noise) ke Cluster C${currentClusterId}.`;
                } else if (n.clusterId === -1) {
                    n.type = 'border';
                    n.clusterId = currentClusterId;
                    logMsg += `<br>➝ Menambahkan ${n.label} ke Cluster C${currentClusterId}.`;
                    queue.push(n); // Add unvisited/unassigned members to queue
                }
            }
        });
    } else {
        // If it was already in queue but not core, it stays as is (Border usually)
        if (p.clusterId === -1) p.clusterId = currentClusterId; // Just in case
        if (p.type !== 'core') p.type = 'border';
        logMsg += `<br>Tetangga ${neighbors.length} < ${minPts} ➝ Border Point.`;
    }

    logCalculation(`Expand Cluster ${currentClusterId}`, logMsg);
    draw();
    updateStepInfo(`Expand Cluster ${currentClusterId}`, `Memperluas cluster dari titik ${p.label}.`);
}

function getNeighbors(p) {
    return points.filter(other => {
        const d = Math.sqrt((p.x - other.x) ** 2 + (p.y - other.y) ** 2);
        return d <= epsilon;
    });
}

function finishDBSCAN() {
    // Keep isRunning = true so Reset button remains enabled
    currentPoint = null;
    currentNeighbors = [];
    stopAutoPlay();

    // Manual button update
    document.getElementById('btnStep').disabled = true;
    document.getElementById('btnAuto').disabled = true;

    algorithmState = 'finished';
    updateStepInfo('Selesai', 'Semua titik telah dikunjungi.');
    updateStats();
    draw();
}

function generateRandomData() {
    if (isRunning) return;
    clearAll();

    // Check mode
    const type = document.getElementById('dataType').value;

    if (type === 'moons') {
        generateMoons();
    } else if (type === 'circles') {
        generateCircles();
    } else {
        generateBlobs();
    }

    updateStats();
    draw();
}

function generateBlobs() {
    const numPoints = isLearningMode ? Math.floor(Math.random() * (maxPointsLearning - 5) + 5) : 60;
    const padding = 50;

    // Create random clumps
    const centers = [];
    for (let i = 0; i < 3; i++) {
        centers.push({
            x: padding + Math.random() * (canvas.width - 2 * padding),
            y: padding + Math.random() * (canvas.height - 2 * padding)
        });
    }

    for (let i = 0; i < numPoints; i++) {
        // 70% chance to be near a center, 30% noise
        let x, y;
        if (Math.random() < 0.7) {
            const c = centers[Math.floor(Math.random() * centers.length)];
            // Tighter clusters (spread 60px)
            x = c.x + (Math.random() - 0.5) * 60;
            y = c.y + (Math.random() - 0.5) * 60;
        } else {
            // Noise spread across full canvas
            x = Math.random() * canvas.width;
            y = Math.random() * canvas.height;
        }

        addPoint(x, y, i + 1);
    }
}

function generateMoons() {
    const n = isLearningMode ? 30 : 100;
    const noise = 0.5; // jitter

    // Moon 1 (Upper)
    for (let i = 0; i < n / 2; i++) {
        const angle = Math.PI * (i / (n / 2));
        const x = 150 + Math.cos(angle) * 100 + (Math.random() - 0.5) * 10;
        const y = 200 - Math.sin(angle) * 100 + (Math.random() - 0.5) * 10;
        addPoint(x + canvas.width / 2 - 200, y + canvas.height / 2 - 150, i);
    }

    // Moon 2 (Lower)
    for (let i = 0; i < n / 2; i++) {
        const angle = Math.PI * (i / (n / 2));
        const x = 250 + Math.cos(angle) * 100 + (Math.random() - 0.5) * 10;
        const y = 200 + Math.sin(angle) * 100 + (Math.random() - 0.5) * 10;
        addPoint(x + canvas.width / 2 - 200, y + canvas.height / 2 - 150, i + n / 2);
    }

    // Some noise
    for (let i = 0; i < n / 10; i++) {
        addPoint(Math.random() * canvas.width, Math.random() * canvas.height, n + i);
    }
}

function generateCircles() {
    const n = isLearningMode ? 30 : 100;
    const center = { x: canvas.width / 2, y: canvas.height / 2 };

    // Inner Circle
    for (let i = 0; i < n / 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 50 + (Math.random() - 0.5) * 10;
        addPoint(center.x + Math.cos(angle) * r, center.y + Math.sin(angle) * r, i);
    }

    // Outer Circle
    for (let i = 0; i < n / 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 130 + (Math.random() - 0.5) * 15;
        addPoint(center.x + Math.cos(angle) * r, center.y + Math.sin(angle) * r, i + n / 2);
    }

    // Noise
    for (let i = 0; i < n / 10; i++) {
        addPoint(Math.random() * canvas.width, Math.random() * canvas.height, n + i);
    }
}

function addPoint(x, y, id) {
    points.push({
        x: Math.max(20, Math.min(canvas.width - 20, x)),
        y: Math.max(20, Math.min(canvas.height - 20, y)),
        id: id,
        visited: false,
        type: 'unvisited',
        clusterId: -1,
        label: `P${points.length + 1}`
    });
}

function clearAll() {
    stopAutoPlay();
    points = [];
    currentClusterId = 0;
    isRunning = false;
    currentPoint = null;
    queue = [];
    updateButtons(false);
    updateStats();
    updateStepInfo('Langkah 0: Persiapan', 'Klik canvas untuk tambah data.');
    draw();
    clearLog();
}

function resetDBSCAN() {
    stopAutoPlay();
    isRunning = false;
    currentClusterId = 0;
    currentPoint = null;
    queue = [];
    points.forEach(p => {
        p.visited = false;
        p.clusterId = -1;
        p.type = 'unvisited';
    });
    updateButtons(false);
    updateStepInfo('Langkah 0: Persiapan', 'Data direset.');
    draw();
    clearLog();
}

// ==================== VISUALISASI ====================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Epsilon Circle around Current Point
    if (currentPoint) {
        ctx.beginPath();
        ctx.arc(currentPoint.x, currentPoint.y, epsilon, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(52, 152, 219, 0.1)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(52, 152, 219, 0.5)';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    points.forEach(p => {
        ctx.beginPath();
        let r = isLearningMode ? 8 : 6;

        // Highlight current point
        if (p === currentPoint) r += 2;

        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);

        // Color logic
        if (p.clusterId !== -1) {
            ctx.fillStyle = COLORS[(p.clusterId - 1) % COLORS.length];
        } else if (p.type === 'noise') {
            ctx.fillStyle = NOISE_COLOR;
        } else {
            ctx.fillStyle = UNVISITED_COLOR;
        }

        // Stroke for type
        ctx.lineWidth = 1.5;
        if (p.type === 'core') {
            ctx.strokeStyle = '#2ecc71'; // Green border for Core
            ctx.lineWidth = 3;
        } else if (p.type === 'border') {
            ctx.strokeStyle = '#f1c40f'; // Yellow border
        } else if (p.type === 'noise') {
            ctx.strokeStyle = '#e74c3c'; // Red border
        } else {
            ctx.strokeStyle = '#fff';
        }

        ctx.fill();
        ctx.stroke();

        // Learning Mode Labels
        if (isLearningMode) {
            ctx.fillStyle = '#333';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(p.label, p.x, p.y - 12);
        }
    });

    // Draw Stats on Canvas (Optional, but useful for fullscreen)
}

function updateStats() {
    document.getElementById('pointCount').textContent = points.length;
    document.getElementById('clusterCount').textContent = currentClusterId;

    const noiseCount = points.filter(p => p.type === 'noise').length;
    document.getElementById('noiseCount').textContent = noiseCount;
}

function updateStepInfo(title, desc) {
    document.getElementById('stepTitle').textContent = title;
    document.getElementById('stepDesc').textContent = desc;
}

function updateButtons(running) {
    document.getElementById('btnStart').disabled = running;
    document.getElementById('btnStep').disabled = !running;
    document.getElementById('btnAuto').disabled = !running;
    document.getElementById('btnReset').disabled = !running;
    document.getElementById('btnRandom').disabled = running;
    document.getElementById('epsSlider').disabled = running;
    document.getElementById('minPtsSlider').disabled = running;
}

// Log Utils
function logCalculation(title, content) {
    const log = document.getElementById('calcLog');
    if (log.innerHTML.includes('Belum ada')) log.innerHTML = '';

    const item = document.createElement('div');
    item.className = 'calc-item';
    item.innerHTML = `<strong>${title}</strong><br>${content}`;
    log.insertBefore(item, log.firstChild);
}

function clearLog() {
    document.getElementById('calcLog').innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">Belum ada perhitungan.</div>';
}

function toggleLog() {
    const content = document.getElementById('calcLog');
    const btn = document.getElementById('toggleCalc');
    if (content.style.display === 'none') {
        content.style.display = 'block';
        btn.textContent = '⬇️';
    } else {
        content.style.display = 'none';
        btn.textContent = '➡️';
    }
}

function toggleAutoPlay() {
    if (autoPlayInterval) {
        stopAutoPlay();
    } else {
        document.getElementById('btnAuto').textContent = '⏸️ Pause';
        nextStep();
        autoPlayInterval = setInterval(nextStep, animationSpeed);
    }
}

function stopAutoPlay() {
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
        document.getElementById('btnAuto').textContent = '🔄 Auto Play';
    }
}

function updateLegend() {
    const legend = document.getElementById('legend');
    legend.innerHTML = `
        <div class="legend-item"><div class="legend-color point-core"></div>Core</div>
        <div class="legend-item"><div class="legend-color point-border"></div>Border</div>
        <div class="legend-item"><div class="legend-color point-noise"></div>Noise</div>
    `;
}

// Start
init();
