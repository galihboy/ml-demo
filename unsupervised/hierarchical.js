// ==================== KONFIGURASI ====================
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const dendroCanvas = document.getElementById('dendrogramCanvas');
const dCtx = dendroCanvas.getContext('2d');

const COLORS = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#2c3e50'
];

let points = [];
let clusters = []; // Array of Cluster objects { id, points, color, left, right, height, centroid }
let mergeHistory = []; // For Dendrogram
let isRunning = false;
let autoPlayInterval = null;
let animationSpeed = 500;
let targetClusters = 1;

// Linkage Mode
let linkageMethod = 'single'; // single, complete, average, centroid

// Learning Mode
let isLearningMode = false;
let maxPointsLearning = 10;

// ==================== INISIALISASI ====================
function init() {
    resizeCanvases();
    updateStats();
    draw();

    window.addEventListener('resize', () => {
        resizeCanvases();
        draw();
    });

    // Event Listeners
    canvas.addEventListener('pointerdown', handleCanvasClick);

    // Prevent scrolling when touching canvas
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });

    // Controls
    document.getElementById('linkageType').addEventListener('change', (e) => {
        linkageMethod = e.target.value;
        if (points.length > 0) resetHierarchical();
    });

    document.getElementById('kSlider').addEventListener('input', (e) => {
        targetClusters = parseInt(e.target.value);
        document.getElementById('kDisplay').textContent = targetClusters;
    });

    document.getElementById('speedSlider').addEventListener('input', (e) => {
        animationSpeed = parseInt(e.target.value);
        document.getElementById('speedDisplay').textContent = animationSpeed + 'ms';
    });

    document.getElementById('btnRandom').addEventListener('click', generateRandomData);
    document.getElementById('btnClear').addEventListener('click', clearAll);
    document.getElementById('btnStart').addEventListener('click', startHierarchical);
    document.getElementById('btnStep').addEventListener('click', nextStep);
    document.getElementById('btnAuto').addEventListener('click', toggleAutoPlay);
    document.getElementById('btnReset').addEventListener('click', resetHierarchical);
    document.getElementById('toggleCalc').addEventListener('click', toggleLog);

    setupLearningMode();
    updateLegend();
}

function setupLearningMode() {
    const toggle = document.getElementById('learningModeToggle');
    if (!toggle) return;

    isLearningMode = toggle.checked;
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

function resizeCanvases() {
    const container = canvas.parentElement;
    const width = container.clientWidth;
    const height = Math.min(500, width * 0.625);

    canvas.width = width;
    canvas.height = height;

    dendroCanvas.width = width;
    // Keep dendrogram height fixed or proportional
}

function handleCanvasClick(e) {
    if (isRunning) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    addPoint(x, y);
    updateStats();
    draw();
}

function addPoint(x, y) {
    const id = points.length + 1;
    points.push({
        x, y,
        id: id,
        label: `P${id}`
    });
    // In Hierarchical, each point starts as a cluster
    resetHierarchical();
}

// ==================== LOGIC HIERARCHICAL ====================
function startHierarchical() {
    if (points.length === 0) return;

    // Reset state but keep points
    resetHierarchical();

    isRunning = true;
    updateButtons(true);
    updateStepInfo('Mulai Clustering', `Dimulai dengan ${points.length} cluster individual. Tekan "Step" untuk menggabungkan cluster terdekat.`);

    clearLog();
    logCalculation('Mulai', `Metode Linkage: ${linkageMethod.toUpperCase()}<br>Target Cluster: ${targetClusters}`);
}

function resetHierarchical() {
    stopAutoPlay();
    isRunning = false;

    // Initialize clusters: 1 per point
    clusters = points.map((p, i) => ({
        id: i,
        points: [p],
        color: COLORS[i % COLORS.length],
        left: null,
        right: null,
        height: 0,
        centroid: { x: p.x, y: p.y }
    }));

    mergeHistory = [];
    updateButtons(false);
    updateStats();
    updateStepInfo('Langkah 0: Persiapan', 'Setiap titik adalah cluster sendiri.');
    draw();
    drawDendrogram();
}

function nextStep() {
    if (!isRunning) startHierarchical();

    if (clusters.length <= targetClusters) {
        updateStepInfo('Selesai', `Tercapai ${clusters.length} cluster (Target: ${targetClusters}).`);
        stopAutoPlay();
        document.getElementById('btnStep').disabled = true;
        document.getElementById('btnAuto').disabled = true;
        return;
    }

    // Find closest pair of clusters
    let minDist = Infinity;
    let c1Index = -1;
    let c2Index = -1;

    for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
            const d = calculateLinkageDistance(clusters[i], clusters[j]);
            if (d < minDist) {
                minDist = d;
                c1Index = i;
                c2Index = j;
            }
        }
    }

    if (c1Index !== -1 && c2Index !== -1) {
        mergeClusters(c1Index, c2Index, minDist);
    }
}

function calculateLinkageDistance(c1, c2) {
    let dist = 0;

    if (linkageMethod === 'centroid') {
        const dx = c1.centroid.x - c2.centroid.x;
        const dy = c1.centroid.y - c2.centroid.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    else if (linkageMethod === 'single') {
        let min = Infinity;
        c1.points.forEach(p1 => {
            c2.points.forEach(p2 => {
                const d = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
                if (d < min) min = d;
            });
        });
        return min;
    }
    else if (linkageMethod === 'complete') {
        let max = 0;
        c1.points.forEach(p1 => {
            c2.points.forEach(p2 => {
                const d = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
                if (d > max) max = d;
            });
        });
        return max;
    }
    else if (linkageMethod === 'average') {
        let sum = 0;
        let count = 0;
        c1.points.forEach(p1 => {
            c2.points.forEach(p2 => {
                sum += Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
                count++;
            });
        });
        return sum / count;
    }
    return Infinity;
}

function mergeClusters(idx1, idx2, dist) {
    const c1 = clusters[idx1];
    const c2 = clusters[idx2];

    // Create new merged cluster
    const newPoints = [...c1.points, ...c2.points];

    // Calculate new centroid
    const sumX = newPoints.reduce((s, p) => s + p.x, 0);
    const sumY = newPoints.reduce((s, p) => s + p.y, 0);
    const newCentroid = { x: sumX / newPoints.length, y: sumY / newPoints.length };

    // Determine color (inherit from larger or first one, or new)
    // Simply keeping c1's color usually helps continuity
    const newColor = c1.color;

    const newCluster = {
        id: mergeHistory.length + points.length, // unique ID
        points: newPoints,
        color: newColor,
        left: c1,
        right: c2,
        height: dist,
        centroid: newCentroid
    };

    // Log
    let logMsg = `Menggabungkan Cluster ${clusters.length} ➝ ${clusters.length - 1}<br>`;
    logMsg += `Jarak (${linkageMethod}): ${dist.toFixed(2)}<br>`;
    logMeasurement(logMsg);

    // Update Clusters Array: Remove c1 and c2, add newCluster
    // We filter by reference
    clusters = clusters.filter(c => c !== c1 && c !== c2);
    clusters.push(newCluster);

    // Record history for dendrogram
    mergeHistory.push(newCluster);

    updateStats();
    draw();
    drawDendrogram();
    updateStepInfo('Merge Cluster', `Cluster digabungkan dengan jarak ${dist.toFixed(1)}px.`);

    // Check stop condition immediately after merge
    if (clusters.length <= targetClusters) {
        updateStepInfo('Selesai', `Target ${targetClusters} cluster tercapai (Total: ${clusters.length}).`);
        stopAutoPlay();
        document.getElementById('btnStep').disabled = true;
        document.getElementById('btnAuto').disabled = true;
    }

    updateLegend(); // Update legend to show current clusters
}

function logMeasurement(msg) {
    const log = document.getElementById('calcLog');
    if (log.innerHTML.includes('Belum ada')) log.innerHTML = '';
    const item = document.createElement('div');
    item.className = 'calc-item';
    item.innerHTML = msg;
    log.insertBefore(item, log.firstChild);
}

// ==================== VISUALISASI ====================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw lines connecting points in same cluster (Spanning Tree visualization usually better, but simple connect to centroid or nearest is okay)
    // For Hierarchical, simple coloring is standard. Maybe hull?
    // Let's draw loose hull or connections to centroid.

    clusters.forEach(c => {
        if (c.points.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = c.color + '40'; // Transparent
            ctx.lineWidth = 1;
            // Connect all to centroid
            c.points.forEach(p => {
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(c.centroid.x, c.centroid.y);
            });
            ctx.stroke();
        }
    });

    // Draw Points
    points.forEach(p => {
        // Find which cluster this point belongs to currently
        const parentCluster = clusters.find(c => c.points.includes(p));

        ctx.beginPath();
        const r = isLearningMode ? 8 : 6;
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);

        ctx.fillStyle = parentCluster ? parentCluster.color : '#bdc3c7';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (isLearningMode) {
            ctx.fillStyle = '#333';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(p.label, p.x, p.y - 12);
        }
    });
}

function drawDendrogram() {
    dCtx.clearRect(0, 0, dendroCanvas.width, dendroCanvas.height);

    if (mergeHistory.length === 0 && points.length > 0) {
        // Just draw initial points on X axis
        const padding = 40;
        const availableWidth = dendroCanvas.width - 2 * padding;
        const spacing = availableWidth / (points.length - 1 || 1);

        dCtx.textAlign = 'center';
        dCtx.font = '10px Arial';
        dCtx.fillStyle = '#333';

        points.forEach((p, i) => {
            const x = padding + i * spacing;
            const y = dendroCanvas.height - 20;
            dCtx.fillText(p.label, x, y);
        });
        return;
    }

    // We need to layout the tree.
    // The leaf nodes (original points) need X positions.
    // Ideally, we reorder them to minimize crossing, but simple static order by index is easiest for demo.

    const padding = 40;
    const bottomY = dendroCanvas.height - 20;
    const topY = 20;
    const maxHeight = mergeHistory.length > 0 ? mergeHistory[mergeHistory.length - 1].height * 1.2 : 100;

    // Map cluster/point ID to X position
    const positions = {}; // map id -> {x, y}

    // Assign X to leaf nodes based on current points array order (simplified)
    // Better: Inorder traversal of the final tree to assign X.

    // 1. Get all root clusters (current `clusters` array contains the roots of the forest)
    // But we might have completed the tree or partial forest.
    // To ensure a nice layout, we should traverse the structure.

    // Recursively calculate X position
    let currentX = padding;
    const spacing = (dendroCanvas.width - 2 * padding) / (points.length - 1 || 1);

    function getDendroNode(cluster) {
        if (!cluster.left) {
            // Leaf
            const node = { x: currentX, y: 0 }; // y is relative height (0 at bottom)
            currentX += spacing;
            return node;
        }

        const leftNode = getDendroNode(cluster.left);
        const rightNode = getDendroNode(cluster.right);

        // Parent X is average of children
        return {
            x: (leftNode.x + rightNode.x) / 2,
            y: cluster.height,
            left: leftNode,
            right: rightNode,
            leftH: cluster.left.height || 0,
            rightH: cluster.right.height || 0
        };
    }

    // Scale height to canvas
    function scaleY(h) {
        return bottomY - (h / maxHeight) * (bottomY - topY);
    }

    // Draw recursive
    function drawNode(node, h) {
        // Draw Vertical line up from children
        // The node object here is computed layout, but we need the actual structure references
        // Let's rebuild:
        // Easier: Just iterate `mergeHistory`?
        // No, mergeHistory doesn't have X coords.
    }
}

// Better Dendrogram Drawing with Post-processing
// We need to know the X-order of points.
// We can get this by flattening the current clusters recursively.
function drawDendrogram() {
    dCtx.clearRect(0, 0, dendroCanvas.width, dendroCanvas.height);
    if (points.length === 0) return;

    const padding = 40;
    const bottomY = dendroCanvas.height - 30;
    const availableHeight = dendroCanvas.height - 50;

    // Find max height for scaling
    const maxH = mergeHistory.length > 0 ? Math.max(...mergeHistory.map(c => c.height)) * 1.1 : 100;

    // Helper to get X coordinate of a cluster
    // If leaf: its index in the *sorted visual order*.
    // If node: average of children X.
    // We need to determine the permutation of points that prevents crossing.
    // Simple way: just use traversing the random tree.

    let leafCounter = 0;
    const leafPositions = {}; // id -> x
    const nodePositions = {}; // id -> {x, y}

    // Traverse all current top-level clusters to assign X to leaves
    // Note: This maintains the relative order of clusters as they are in the array, which is random/arbitrary.
    // For a cleaner graph, we might want to sort clusters by centroids x-position?
    const sortedClusters = [...clusters].sort((a, b) => a.centroid.x - b.centroid.x);

    function layout(c) {
        if (!c.left) {
            // Leaf
            const x = padding + leafCounter * ((dendroCanvas.width - 2 * padding) / (points.length - 1 || 1));
            leafPositions[c.id] = x;
            leafCounter++;
            return x;
        }
        const xLeft = layout(c.left);
        const xRight = layout(c.right);
        const x = (xLeft + xRight) / 2;
        nodePositions[c.id] = { x, y: c.height };
        return x;
    }

    sortedClusters.forEach(c => layout(c));

    // Draw Axes
    dCtx.beginPath();
    dCtx.moveTo(padding, bottomY);
    dCtx.lineTo(dendroCanvas.width - padding, bottomY);
    dCtx.strokeStyle = '#ccc';
    dCtx.stroke();

    // Draw Leaves Labels
    dCtx.textAlign = 'center';
    dCtx.fillStyle = '#333';
    points.forEach(p => {
        // Find the cluster wrapper for this point (it has id same as index 0..N-1)
        if (leafPositions[p.id - 1] !== undefined) {
            dCtx.fillText(p.label, leafPositions[p.id - 1], bottomY + 15);
        }
    });

    // Draw Merges
    function drawConnection(c) {
        if (!c.left) return;

        drawConnection(c.left);
        drawConnection(c.right);

        const pos = nodePositions[c.id];
        const leftPos = c.left.left ? nodePositions[c.left.id] : { x: leafPositions[c.left.id], y: 0 };
        const rightPos = c.right.left ? nodePositions[c.right.id] : { x: leafPositions[c.right.id], y: 0 };

        const y = bottomY - (pos.y / maxH) * availableHeight;
        const leftY = bottomY - (leftPos.y / maxH) * availableHeight;
        const rightY = bottomY - (rightPos.y / maxH) * availableHeight;

        dCtx.strokeStyle = '#555';
        dCtx.lineWidth = 1.5;

        // Draw Frame (Up, Across, Down)
        dCtx.beginPath();
        dCtx.moveTo(leftPos.x, leftY);
        dCtx.lineTo(leftPos.x, y);
        dCtx.lineTo(rightPos.x, y);
        dCtx.lineTo(rightPos.x, rightY);
        dCtx.stroke();
    }

    sortedClusters.forEach(c => drawConnection(c));
}

// ==================== GENERATOR DATA ====================
function generateRandomData() {
    if (isRunning) return;

    const type = document.getElementById('dataType').value;

    if (type === 'moons') {
        generateMoons();
    } else if (type === 'circles') {
        generateCircles();
    } else {
        generateBlobs();
    }
}

function generateBlobs() {
    points = [];
    resetHierarchical();

    const numPoints = isLearningMode ? Math.floor(Math.random() * (maxPointsLearning - 4) + 4) : 15;
    const padding = 50;

    const centers = 3;
    const centerPoints = [];
    for (let i = 0; i < centers; i++) {
        centerPoints.push({
            x: padding + Math.random() * (canvas.width - 2 * padding),
            y: padding + Math.random() * (canvas.height - 2 * padding)
        });
    }

    for (let i = 0; i < numPoints; i++) {
        const c = centerPoints[Math.floor(Math.random() * centers)];
        const x = c.x + (Math.random() - 0.5) * 80;
        const y = c.y + (Math.random() - 0.5) * 80;

        addPoint(
            Math.max(20, Math.min(canvas.width - 20, x)),
            Math.max(20, Math.min(canvas.height - 20, y))
        );
    }

    updateStats();
    draw();
}

function generateMoons() {
    points = [];
    resetHierarchical();

    const n = isLearningMode ? 12 : 20;

    // Moon 1
    for (let i = 0; i < n / 2; i++) {
        const angle = Math.PI * (i / (n / 2));
        const x = 150 + Math.cos(angle) * 80 + (Math.random() - 0.5) * 10;
        const y = 200 - Math.sin(angle) * 80 + (Math.random() - 0.5) * 10;
        addPoint(x + canvas.width / 2 - 200, y + canvas.height / 2 - 150);
    }

    // Moon 2
    for (let i = 0; i < n / 2; i++) {
        const angle = Math.PI * (i / (n / 2));
        const x = 220 + Math.cos(angle) * 80 + (Math.random() - 0.5) * 10;
        const y = 200 + Math.sin(angle) * 80 + (Math.random() - 0.5) * 10;
        addPoint(x + canvas.width / 2 - 200, y + canvas.height / 2 - 150);
    }

    updateStats();
    draw();
}

function generateCircles() {
    points = [];
    resetHierarchical();

    const n = isLearningMode ? 12 : 20;
    const center = { x: canvas.width / 2, y: canvas.height / 2 };

    // Inner
    for (let i = 0; i < n / 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 40 + (Math.random() - 0.5) * 10;
        addPoint(center.x + Math.cos(angle) * r, center.y + Math.sin(angle) * r);
    }

    // Outer
    for (let i = 0; i < n / 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 100 + (Math.random() - 0.5) * 15;
        addPoint(center.x + Math.cos(angle) * r, center.y + Math.sin(angle) * r);
    }

    updateStats();
    draw();
}

function updateLegend() {
    const legend = document.getElementById('legend');
    legend.innerHTML = '';

    if (clusters.length > 8) {
        legend.innerHTML = '<div style="font-size:0.8em; color:#666;">Banyak cluster aktif...</div>';
        return;
    }

    clusters.forEach(c => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `<div class="legend-color" style="background:${c.color}"></div>ID ${c.id}`;
        legend.appendChild(item);
    });
}

function clearAll() {
    stopAutoPlay();
    points = [];
    resetHierarchical();
    clearLog();
}

function updateStats() {
    document.getElementById('pointCount').textContent = points.length;
    document.getElementById('clusterCount').textContent = clusters.length;
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
    document.getElementById('linkageType').disabled = running;
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
    // Hierarchical doesn't really have fixed noise/core states, just clusters.
    // So legend might just say "Cluster Colors"
    const legend = document.getElementById('legend');
    legend.innerHTML = `
        <div class="legend-item"><div class="legend-color" style="background:#3498db"></div>Cluster A</div>
        <div class="legend-item"><div class="legend-color" style="background:#e74c3c"></div>Cluster B</div>
        <div style="font-size:0.8em; color:#666; margin-left:5px;">(Warna menunjukkan keanggotaan cluster)</div>
    `;
}

// Start
init();
