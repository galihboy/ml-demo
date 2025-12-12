// ==================== KONFIGURASI ====================
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const COLORS = [
    '#e74c3c', // Merah
    '#3498db', // Biru
    '#2ecc71', // Hijau
    '#f39c12', // Oranye
    '#9b59b6', // Ungu
    '#1abc9c'  // Teal
];

let points = [];
let centroids = [];
let assignments = [];
let K = 3;
let iteration = 0;
let isRunning = false;
let autoPlayInterval = null;
let currentStep = 'init'; // init, assign, update, converged
let previousCentroids = [];
let animationSpeed = 500;

// Learning Mode
let isLearningMode = false;
let maxPointsLearning = 10;

// ==================== INISIALISASI ====================
function init() {
    resizeCanvas();
    updateLegend();
    updateStats();
    draw();

    // Initial resize listener
    window.addEventListener('resize', () => {
        resizeCanvas();
        draw();
    });

    // Learning Mode Toggle
    const toggle = document.getElementById('learningModeToggle');
    if (toggle) {
        // Set initial state based on checkbox
        isLearningMode = toggle.checked;

        // Initial UI Sync
        const controls = document.getElementById('learningControls');
        const panel = document.querySelector('.calculation-panel');

        if (isLearningMode) {
            controls.style.display = 'block';
            panel.style.display = 'block';
        } else {
            controls.style.display = 'none';
            panel.style.display = 'none';
        }

        toggle.addEventListener('change', (e) => {
            isLearningMode = e.target.checked;
            if (isLearningMode) {
                controls.style.display = 'block';
                panel.style.display = 'block';
                // Force regenerate if too many points
                if (points.length > maxPointsLearning) {
                    generateRandomData();
                }
            } else {
                controls.style.display = 'none';
                panel.style.display = 'none';
            }
            draw();
        });
    }

    const maxPointsSlider = document.getElementById('maxPointsSlider');
    if (maxPointsSlider) {
        maxPointsSlider.addEventListener('input', (e) => {
            maxPointsLearning = parseInt(e.target.value);
            document.getElementById('maxPointsDisplay').textContent = maxPointsLearning;
        });
    }
}

// Menyesuaikan ukuran canvas agar responsif tapi tetap tajam
function resizeCanvas() {
    const container = canvas.parentElement;
    // Dapatkan width dari container
    const width = container.clientWidth;
    // Set aspect ratio (misal 16:10 atau sesuai kebutuhan)
    const height = Math.min(500, width * 0.625);

    // Set atribut width/height (resolusi internal)
    canvas.width = width;
    canvas.height = height;

    // Jika data sudah ada, kita mungkin perlu merescale posisi (opsional, 
    // tapi untuk simpelnya di sini kita biarkan koordinat absolut, 
    // user harus clear kalau resize ekstrim)
}

// ==================== EVENT LISTENERS ====================
canvas.addEventListener('pointerdown', (e) => {
    // Gunakan pointerdown untuk support touch dan mouse
    if (isRunning) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Add point
    points.push({ x, y, cluster: -1 });
    updateStats();
    draw();
});

// Prevent scrolling when touching canvas
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });


document.getElementById('kSlider').addEventListener('input', (e) => {
    K = parseInt(e.target.value);
    document.getElementById('kDisplay').textContent = K;
    updateLegend();
});

document.getElementById('speedSlider').addEventListener('input', (e) => {
    animationSpeed = parseInt(e.target.value);
    document.getElementById('speedDisplay').textContent = animationSpeed + 'ms';
});

document.getElementById('btnRandom').addEventListener('click', generateRandomData);
document.getElementById('btnClear').addEventListener('click', clearAll);
document.getElementById('btnStart').addEventListener('click', startKMeans);
document.getElementById('btnStep').addEventListener('click', nextStep);
document.getElementById('btnAuto').addEventListener('click', toggleAutoPlay);
document.getElementById('btnReset').addEventListener('click', resetKMeans);

// ==================== FUNGSI UTAMA ====================
function generateRandomData() {
    if (isRunning) return;
    clearAll();

    // Generate Cluster berdasarkan K saat ini atau 3 random centers
    const numCenters = Math.floor(Math.random() * 3) + 2; // 2-4 centers

    // Determine number of points based on mode
    let numPoints;
    if (isLearningMode) {
        numPoints = Math.floor(Math.random() * (maxPointsLearning - 3)) + 3; // Ensure at least 3 points
    } else {
        numPoints = 40 + Math.floor(Math.random() * 30);
    }

    const clusterCenters = [];
    const padding = 50;
    const w = canvas.width - padding * 2;
    const h = canvas.height - padding * 2;

    for (let i = 0; i < numCenters; i++) {
        clusterCenters.push({
            x: padding + Math.random() * w,
            y: padding + Math.random() * h
        });
    }

    for (let i = 0; i < numPoints; i++) {
        const center = clusterCenters[Math.floor(Math.random() * clusterCenters.length)];
        points.push({
            x: center.x + (Math.random() - 0.5) * (canvas.width / 4),
            y: center.y + (Math.random() - 0.5) * (canvas.height / 4),
            cluster: -1,
            label: `P${i + 1}` // Add label
        });
    }

    // Clamp points to canvas
    points.forEach(p => {
        p.x = Math.max(20, Math.min(canvas.width - 20, p.x));
        p.y = Math.max(20, Math.min(canvas.height - 20, p.y));
    });

    updateStats();
    draw();
}

function clearAll() {
    stopAutoPlay();
    points = [];
    centroids = [];
    assignments = [];
    iteration = 0;
    isRunning = false;
    currentStep = 'init';
    previousCentroids = [];

    updateButtons(false);
    updateStepInfo('Langkah 0: Persiapan', 'Klik pada canvas untuk menambahkan titik data, lalu tekan "Inisialisasi Centroid"');
    updateStats();
    draw();
}

function startKMeans() {
    if (points.length < K) {
        alert(`Minimal ${K} titik data diperlukan untuk ${K} cluster!`);
        return;
    }

    isRunning = true;
    iteration = 0;

    // Inisialisasi centroid secara acak dari titik data (Forgy method)
    // Kita pick K titik acak yang unik
    const indices = new Set();
    while (indices.size < K) {
        indices.add(Math.floor(Math.random() * points.length));
    }

    centroids = Array.from(indices).map((idx, i) => ({
        x: points[idx].x,
        y: points[idx].y,
        id: i
    }));

    previousCentroids = [];
    currentStep = 'initialized';

    updateButtons(true);
    updateStepInfo('Langkah 1: Inisialisasi Centroid',
        `${K} centroid (▲) telah dipilih secara acak dari titik data yang ada. Tekan "Langkah Berikutnya" untuk menghitung cluster.`);

    // Log initial position
    clearLog();
    let initLog = 'Centroid awal dipilih secara acak:<br>';
    centroids.forEach((c, i) => {
        initLog += `C${i + 1}: (${c.x.toFixed(0)}, ${c.y.toFixed(0)})<br>`;
    });
    logCalculation('Inisialisasi', initLog);

    updateStats();
    draw();
}

function nextStep() {
    if (currentStep === 'initialized' || currentStep === 'updated') {
        // Assign points to nearest centroid
        assignPoints();
        currentStep = 'assigned';
        updateStepInfo(`Iterasi ${iteration + 1}: Assign Titik`,
            'Setiap titik data dikelompokkan ke centroid terdekat (berdasarkan Jarak Euclidean).');
    } else if (currentStep === 'assigned') {
        // Update centroids
        const moved = updateCentroids();
        iteration++;

        if (moved) {
            currentStep = 'updated';
            updateStepInfo(`Iterasi ${iteration}: Update Centroid`,
                'Posisi centroid diperbarui ke titik rata-rata (mean) dari semua anggota clusternya.');
        } else {
            currentStep = 'converged';
            stopAutoPlay();
            updateStepInfo(`✅ Konvergen! (Iterasi ${iteration})`,
                'Algoritma selesai. Posisi centroid sudah stabil dan tidak berubah lagi.');
            document.getElementById('btnStep').disabled = true;
            document.getElementById('btnAuto').disabled = true;
        }
    }

    updateStats();
    draw();
}

function assignPoints() {
    let logContent = '';

    // In Learning Mode, log all points if feasible
    const logAll = isLearningMode && points.length <= 20;

    points.forEach((point, idx) => {
        let minDist = Infinity;
        let nearestCluster = 0;
        let distances = []; // Store distances for comparison log

        // Header log for point
        if (logAll || idx === 0) {
            logContent += `<strong>${point.label || 'Titik ' + (idx + 1)} (${point.x.toFixed(0)}, ${point.y.toFixed(0)}):</strong><br>`;
        }

        centroids.forEach((centroid, i) => {
            const dist = distance(point, centroid);
            distances.push({ id: i + 1, val: dist }); // Store for logging

            if (dist < minDist) {
                minDist = dist;
                nearestCluster = i;
            }

            // Log distance formula
            if (logAll || idx === 0) {
                logContent += `d(P, C${i + 1}) = √(${point.x.toFixed(0)}-${centroid.x.toFixed(0)})² + (${point.y.toFixed(0)}-${centroid.y.toFixed(0)})² = <strong>${dist.toFixed(1)}</strong><br>`;
            }
        });

        point.cluster = nearestCluster;

        // Explicit comparison log
        if (logAll || idx === 0) {
            const comparisonStr = distances.map(d => `d(C${d.id})=${d.val.toFixed(1)}`).join(' vs ');
            logContent += `➝ Bandingkan: ${comparisonStr}<br>`;
            logContent += `➝ Kesimpulan: Karena <strong>${minDist.toFixed(1)}</strong> adalah yang terkecil, maka masuk <strong>Cluster ${nearestCluster + 1}</strong>.<br><br>`;
        }
    });

    if (!logAll && points.length > 20) {
        logContent += `...dan seterusnya untuk ${points.length} titik.`;
    }

    logCalculation(`Assignment (Iterasi ${iteration + 1})`, logContent);
}

function updateCentroids() {
    previousCentroids = centroids.map(c => ({ x: c.x, y: c.y }));
    let moved = false;
    // Threshold gerakan yang dianggap signifikan (dalam pixel)
    const threshold = 0.5;

    let logContent = '';

    centroids.forEach((centroid, i) => {
        const clusterPoints = points.filter(p => p.cluster === i);

        if (clusterPoints.length > 0) {
            const newX = clusterPoints.reduce((sum, p) => sum + p.x, 0) / clusterPoints.length;
            const newY = clusterPoints.reduce((sum, p) => sum + p.y, 0) / clusterPoints.length;

            logContent += `<strong>Cluster ${i + 1} (${clusterPoints.length} titik):</strong><br>`;
            logContent += `X_new = (${clusterPoints.map(p => p.x.toFixed(0)).slice(0, 3).join('+')}${clusterPoints.length > 3 ? '...' : ''}) / ${clusterPoints.length} = <strong>${newX.toFixed(1)}</strong><br>`;
            logContent += `Y_new = (${clusterPoints.map(p => p.y.toFixed(0)).slice(0, 3).join('+')}${clusterPoints.length > 3 ? '...' : ''}) / ${clusterPoints.length} = <strong>${newY.toFixed(1)}</strong><br>`;
            logContent += `Posisi: (${centroid.x.toFixed(0)}, ${centroid.y.toFixed(0)}) ➝ (${newX.toFixed(0)}, ${newY.toFixed(0)})<br><br>`;

            // Cek apakah bergerak signifikan
            if (distance(centroid, { x: newX, y: newY }) > threshold) {
                moved = true;
            }

            centroid.x = newX;
            centroid.y = newY;
        } else {
            logContent += `Cluster ${i + 1}: Tidak ada anggota (posisi tetap)<br><br>`;
        }
    });

    logCalculation(`Update Centroid (Iterasi ${iteration})`, logContent);

    return moved;
}

function toggleAutoPlay() {
    if (autoPlayInterval) {
        stopAutoPlay();
    } else {
        document.getElementById('btnAuto').textContent = '⏸️ Pause';
        // Jalankan step pertama langsung
        if (currentStep !== 'converged') nextStep();

        autoPlayInterval = setInterval(() => {
            if (currentStep !== 'converged') {
                nextStep();
            } else {
                stopAutoPlay();
            }
        }, animationSpeed);
    }
}

function stopAutoPlay() {
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
        document.getElementById('btnAuto').textContent = '🔄 Auto Play';
    }
}

function resetKMeans() {
    stopAutoPlay();
    points.forEach(p => p.cluster = -1);
    centroids = [];
    iteration = 0;
    isRunning = false;
    currentStep = 'init';
    previousCentroids = [];

    updateButtons(false);
    updateStepInfo('Langkah 0: Persiapan', 'Titik data direset. Tekan "Inisialisasi Centroid" untuk memulai ulang proses data yang sama.');
    clearLog(); // Clear log on reset
    updateStats();
    draw();
}

// ==================== FUNGSI GAMBAR ====================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Gambar garis koneksi (assignment)
    if (currentStep !== 'init' && currentStep !== 'initialized') {
        points.forEach(point => {
            if (point.cluster >= 0 && centroids[point.cluster]) {
                ctx.beginPath();
                ctx.moveTo(point.x, point.y);
                ctx.lineTo(centroids[point.cluster].x, centroids[point.cluster].y);
                ctx.strokeStyle = COLORS[point.cluster] + '30'; // Transparan
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        });
    }

    // 2. Gambar titik data
    points.forEach((point, i) => {
        ctx.beginPath();
        const r = isLearningMode ? 8 : 6; // Larger in learning mode
        ctx.arc(point.x, point.y, r, 0, Math.PI * 2);

        if (point.cluster >= 0) {
            ctx.fillStyle = COLORS[point.cluster];
        } else {
            ctx.fillStyle = '#bdc3c7'; // Abu-abu
        }

        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw Labels in Learning Mode
        if (isLearningMode) {
            ctx.fillStyle = '#333';
            ctx.font = 'bold 12px Consolas';
            ctx.textAlign = 'center';
            ctx.fillText(point.label || `P${i + 1}`, point.x, point.y - 12);

            ctx.font = '10px Consolas';
            ctx.fillStyle = '#666';
            ctx.fillText(`(${point.x.toFixed(0)}, ${point.y.toFixed(0)})`, point.x, point.y + 20);
        }
    });

    // 3. Gambar centroid lama (Ghost) saat update
    if (previousCentroids.length > 0 && currentStep === 'updated') {
        previousCentroids.forEach((centroid, i) => {
            drawCentroid(centroid.x, centroid.y, COLORS[i], true);

            // Gambar panah perpindahan (opsional, tapi bagus)
            ctx.beginPath();
            ctx.moveTo(centroid.x, centroid.y);
            ctx.lineTo(centroids[i].x, centroids[i].y);
            ctx.strokeStyle = COLORS[i] + '80';
            ctx.setLineDash([4, 2]);
            ctx.stroke();
            ctx.setLineDash([]);
        });
    }

    // 4. Gambar centroid aktif
    centroids.forEach((centroid, i) => {
        drawCentroid(centroid.x, centroid.y, COLORS[i], false);
        // Draw Label for Centroid C1, C2 etc
        if (isLearningMode) {
            ctx.fillStyle = '#000';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(`C${i + 1}`, centroid.x, centroid.y - 20);
        }
    });
}

function drawCentroid(x, y, color, isGhost) {
    const size = isGhost ? 10 : 16;
    ctx.save();
    ctx.translate(x, y);

    ctx.beginPath();
    // Gambar segitiga / diamond
    ctx.moveTo(0, -size);
    ctx.lineTo(size, size / 1.5);
    ctx.lineTo(-size, size / 1.5);
    ctx.closePath();

    if (isGhost) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
    } else {
        ctx.fillStyle = color;
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    ctx.restore();
}

// ==================== FUNGSI UTILITAS ====================
function distance(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function calculateInertia() {
    if (centroids.length === 0) return '-';

    let inertia = 0;
    points.forEach(point => {
        if (point.cluster >= 0 && centroids[point.cluster]) {
            inertia += distance(point, centroids[point.cluster]) ** 2;
        }
    });

    return Math.round(inertia).toLocaleString();
}

function updateStats() {
    document.getElementById('pointCount').textContent = points.length;
    // document.getElementById('kValue').textContent = K; // Removed as redundant
    document.getElementById('iteration').textContent = iteration;
    document.getElementById('inertia').textContent = calculateInertia();
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
    document.getElementById('kSlider').disabled = running;
    document.getElementById('btnRandom').disabled = running;
    // document.getElementById('btnClear').disabled = running; // Always enabled
}

function updateLegend() {
    const legend = document.getElementById('legend');
    legend.innerHTML = '';

    for (let i = 0; i < K; i++) {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <div class="legend-color" style="background: ${COLORS[i]}"></div>
            <span>Cluster ${i + 1}</span>
        `;
        legend.appendChild(item);
    }

    const centroidItem = document.createElement('div');
    centroidItem.className = 'legend-item';
    centroidItem.innerHTML = `
        <div class="legend-centroid"></div>
        <span>Centroid</span>
    `;
    legend.appendChild(centroidItem);
}

// ==================== FUNGSI LOGGING CALCULASI ====================
function logCalculation(title, content) {
    const log = document.getElementById('calcLog');

    // Clear initial message if exists
    if (log.innerHTML.includes('Belum ada perhitungan')) {
        log.innerHTML = '';
    }

    const item = document.createElement('div');
    item.className = 'calc-item';
    item.innerHTML = `<strong>${title}</strong><br>${content}`;

    // Add to top
    log.insertBefore(item, log.firstChild);
}

function clearLog() {
    const log = document.getElementById('calcLog');
    log.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">Belum ada perhitungan. Mulai simulasi untuk melihat detail.</div>';
}

// Toggle logic
document.getElementById('toggleCalc').addEventListener('click', () => {
    const content = document.getElementById('calcLog');
    const btn = document.getElementById('toggleCalc');
    if (content.style.display === 'none') {
        content.style.display = 'block';
        btn.textContent = '⬇️';
    } else {
        content.style.display = 'none';
        btn.textContent = '➡️';
    }
});

// Start
init();
