// KNN Demo JavaScript
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let currentMode = 'class0';
let k = 3;
let dataPoints = [];
let testPoint = null;

// Make canvas responsive
function resizeCanvas() {
    const container = canvas.parentElement;
    const maxWidth = Math.min(800, container.clientWidth - 40);
    const maxHeight = Math.min(600, window.innerHeight - 250);
    
    // Maintain aspect ratio
    const aspectRatio = 4/3; // 800/600
    let width = maxWidth;
    let height = width / aspectRatio;
    
    if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
    }
    
    canvas.width = width;
    canvas.height = height;
    
    if (dataPoints.length > 0 || testPoint) {
        draw();
    }
}

// Resize on window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizeCanvas, 250);
});

// Update K value
document.getElementById('kValue').addEventListener('input', function() {
    k = parseInt(this.value);
    document.getElementById('kDisplay').textContent = k;
    if (testPoint) {
        predictKNN();
    }
});

// Set mode
function setMode(mode) {
    currentMode = mode;
    const testModeBtn = document.getElementById('testModeBtn');
    
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    testModeBtn.classList.remove('active');
    
    if (mode === 'class0') {
        document.querySelectorAll('.mode-btn')[0].classList.add('active');
        canvas.style.cursor = 'crosshair';
    } else if (mode === 'class1') {
        document.querySelectorAll('.mode-btn')[1].classList.add('active');
        canvas.style.cursor = 'crosshair';
    } else if (mode === 'test') {
        testModeBtn.classList.add('active');
        canvas.style.cursor = 'pointer';
    }
}

function generateRandomData() {
    dataPoints = [];
    const w = canvas.width;
    const h = canvas.height;
    
    // Kelas 0 (Merah) - cluster di kiri bawah
    for (let i = 0; i < 5; i++) {
        dataPoints.push({
            x: w * 0.2 + Math.random() * w * 0.2,  // 20-40% dari width
            y: h * 0.65 + Math.random() * h * 0.25, // 65-90% dari height
            class: 0
        });
    }
    
    // Kelas 1 (Biru) - cluster di kanan atas
    for (let i = 0; i < 5; i++) {
        dataPoints.push({
            x: w * 0.6 + Math.random() * w * 0.2,  // 60-80% dari width
            y: h * 0.1 + Math.random() * h * 0.25, // 10-35% dari height
            class: 1
        });
    }
    
    testPoint = null;
    document.getElementById('resultBox').classList.remove('show');
    draw();
}

function clearCanvas() {
    dataPoints = [];
    testPoint = null;
    document.getElementById('resultBox').classList.remove('show');
    draw();
}

function resetDemo() {
    clearCanvas();
    k = 3;
    document.getElementById('kValue').value = 3;
    document.getElementById('kDisplay').textContent = 3;
    currentMode = 'class0';
    setMode('class0');
}

// Handle both mouse and touch events
function handlePointerEvent(e) {
    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if (e.touches) {
        // Touch event
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else {
        // Mouse event
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
    }

    if (currentMode === 'test') {
        testPoint = {x, y};
        predictKNN();
    } else {
        const classValue = currentMode === 'class0' ? 0 : 1;
        dataPoints.push({x, y, class: classValue});
        draw();
    }
}

canvas.addEventListener('click', handlePointerEvent);
canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    handlePointerEvent(e);
});

function distance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function predictKNN() {
    if (!testPoint || dataPoints.length === 0) return;

    const distances = dataPoints.map(point => ({
        point: point,
        distance: distance(testPoint, point)
    }));

    distances.sort((a, b) => a.distance - b.distance);
    const kNearest = distances.slice(0, Math.min(k, distances.length));

    let votes = {0: 0, 1: 0};
    kNearest.forEach(neighbor => {
        votes[neighbor.point.class]++;
    });

    const prediction = votes[0] > votes[1] ? 0 : 1;
    displayResults(prediction, kNearest);
    draw();
}

function toggleCalculation() {
    const calcBox = document.getElementById('calculationBox');
    const showCalc = document.getElementById('showCalc').checked;
    
    if (showCalc && testPoint) {
        generateCalculationSteps();
        calcBox.classList.add('show');
    } else {
        calcBox.classList.remove('show');
    }
}

function generateCalculationSteps() {
    const stepsDiv = document.getElementById('calculationSteps');
    stepsDiv.innerHTML = '';

    const step1 = document.createElement('div');
    step1.className = 'calc-step';
    step1.innerHTML = `
        <h5>Langkah 1: Hitung Jarak ke Semua Titik Data</h5>
        <p>Menggunakan rumus Euclidean Distance:</p>
        <div class="formula">d = √[(x₂ - x₁)² + (y₂ - y₁)²]</div>
        <p><strong>Titik Uji:</strong> (${Math.round(testPoint.x)}, ${Math.round(testPoint.y)})</p>
    `;

    const distanceList = document.createElement('div');
    distanceList.style.marginTop = '10px';
    
    const allDistances = dataPoints.map((point, index) => {
        const dist = distance(testPoint, point);
        const dx = point.x - testPoint.x;
        const dy = point.y - testPoint.y;
        const className = point.class === 0 ? 'Merah' : 'Biru';
        const color = point.class === 0 ? '#ff6b6b' : '#4ecdc4';
        
        return { index: index + 1, point, distance: dist, dx, dy, className, color };
    });

    allDistances.forEach(item => {
        const p = document.createElement('p');
        p.style.marginLeft = '20px';
        p.style.fontSize = '0.9em';
        p.innerHTML = `
            <strong>Titik ${item.index}</strong> 
            <span style="color: ${item.color};">(${item.className})</span>: 
            (${Math.round(item.point.x)}, ${Math.round(item.point.y)}) → 
            d = √[(${item.dx.toFixed(1)})² + (${item.dy.toFixed(1)})²] = 
            √[${(item.dx**2).toFixed(1)} + ${(item.dy**2).toFixed(1)}] = 
            <strong>${item.distance.toFixed(2)}</strong>
        `;
        distanceList.appendChild(p);
    });
    
    step1.appendChild(distanceList);
    stepsDiv.appendChild(step1);

    const step2 = document.createElement('div');
    step2.className = 'calc-step';
    step2.innerHTML = `<h5>Langkah 2: Urutkan dan Pilih K=${k} Tetangga Terdekat</h5>`;

    const sortedDistances = [...allDistances].sort((a, b) => a.distance - b.distance);
    const kNearest = sortedDistances.slice(0, Math.min(k, sortedDistances.length));

    const sortedList = document.createElement('div');
    sortedList.style.marginTop = '10px';
    kNearest.forEach((item, index) => {
        const p = document.createElement('p');
        p.style.marginLeft = '20px';
        p.style.fontSize = '0.9em';
        p.style.background = '#f0f8ff';
        p.style.padding = '5px 10px';
        p.style.borderRadius = '5px';
        p.style.marginBottom = '5px';
        p.innerHTML = `
            <strong>${index + 1}.</strong> 
            Titik ${item.index} 
            <span style="color: ${item.color}; font-weight: bold;">(${item.className})</span> - 
            Jarak: <strong>${item.distance.toFixed(2)}</strong>
        `;
        sortedList.appendChild(p);
    });
    
    step2.appendChild(sortedList);
    stepsDiv.appendChild(step2);

    const step3 = document.createElement('div');
    step3.className = 'calc-step';
    step3.innerHTML = `<h5>Langkah 3: Hitung Voting (Majority Vote)</h5>`;

    let votes = {0: 0, 1: 0};
    kNearest.forEach(item => {
        votes[item.point.class]++;
    });

    const votingDiv = document.createElement('div');
    votingDiv.style.marginTop = '10px';
    votingDiv.innerHTML = `
        <p style="margin-left: 20px;">
            <span style="color: #ff6b6b; font-weight: bold;">Kelas 0 (Merah):</span> ${votes[0]} suara
        </p>
        <p style="margin-left: 20px;">
            <span style="color: #4ecdc4; font-weight: bold;">Kelas 1 (Biru):</span> ${votes[1]} suara
        </p>
    `;
    
    step3.appendChild(votingDiv);
    stepsDiv.appendChild(step3);

    const prediction = votes[0] > votes[1] ? 0 : 1;
    const step4 = document.createElement('div');
    step4.className = 'calc-step';
    step4.style.background = prediction === 0 ? '#ffe0e0' : '#e0f7ff';
    step4.innerHTML = `
        <h5>Langkah 4: Hasil Prediksi</h5>
        <p style="margin-left: 20px; font-size: 1.1em;">
            <strong>Prediksi:</strong> 
            <span style="color: ${prediction === 0 ? '#ff6b6b' : '#4ecdc4'}; font-weight: bold; font-size: 1.2em;">
                Kelas ${prediction} (${prediction === 0 ? 'Merah' : 'Biru'})
            </span>
        </p>
        <p style="margin-left: 20px; margin-top: 10px; font-style: italic;">
            Karena kelas ${prediction === 0 ? 'Merah' : 'Biru'} memiliki suara terbanyak (${Math.max(votes[0], votes[1])} dari ${k} tetangga)
        </p>
    `;
    
    stepsDiv.appendChild(step4);
}

function displayResults(prediction, neighbors) {
    const resultBox = document.getElementById('resultBox');
    const predictionText = prediction === 0 ? 
        '<span style="color: #ff6b6b; font-weight: bold;">Kelas 0 (Merah)</span>' : 
        '<span style="color: #4ecdc4; font-weight: bold;">Kelas 1 (Biru)</span>';

    document.getElementById('testPoint').textContent = 
        `(${Math.round(testPoint.x)}, ${Math.round(testPoint.y)})`;
    document.getElementById('prediction').innerHTML = predictionText;

    const neighborList = document.getElementById('neighborList');
    neighborList.innerHTML = '';
    neighbors.forEach((neighbor, index) => {
        const li = document.createElement('li');
        const className = neighbor.point.class === 0 ? 'Merah' : 'Biru';
        const color = neighbor.point.class === 0 ? '#ff6b6b' : '#4ecdc4';
        li.innerHTML = `
            <strong>Tetangga ${index + 1}:</strong> 
            (${Math.round(neighbor.point.x)}, ${Math.round(neighbor.point.y)}) - 
            <span style="color: ${color}; font-weight: bold;">${className}</span> - 
            Jarak: ${neighbor.distance.toFixed(2)}
        `;
        neighborList.appendChild(li);
    });

    resultBox.classList.add('show');
    
    if (document.getElementById('showCalc').checked) {
        generateCalculationSteps();
        document.getElementById('calculationBox').classList.add('show');
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }

    // Draw data points
    dataPoints.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 10, 0, 2 * Math.PI);
        ctx.fillStyle = point.class === 0 ? '#ff6b6b' : '#4ecdc4';
        ctx.fill();
        ctx.strokeStyle = point.class === 0 ? '#c92a2a' : '#0c8599';
        ctx.lineWidth = 2;
        ctx.stroke();

        const label = `(${Math.round(point.x)}, ${Math.round(point.y)})`;
        ctx.font = '11px Arial';
        ctx.fillStyle = '#333';
        
        let labelX = point.x + 15;
        let labelY = point.y - 10;
        
        if (point.x > canvas.width - 80) labelX = point.x - 70;
        if (point.y < 20) labelY = point.y + 25;
        
        const metrics = ctx.measureText(label);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(labelX - 3, labelY - 12, metrics.width + 6, 16);
        
        ctx.fillStyle = '#333';
        ctx.fillText(label, labelX, labelY);
    });

    // Draw test point and neighbors
    if (testPoint) {
        const distances = dataPoints.map(point => ({
            point: point,
            distance: distance(testPoint, point)
        }));
        distances.sort((a, b) => a.distance - b.distance);
        const kNearest = distances.slice(0, Math.min(k, distances.length));

        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        kNearest.forEach(neighbor => {
            ctx.beginPath();
            ctx.moveTo(testPoint.x, testPoint.y);
            ctx.lineTo(neighbor.point.x, neighbor.point.y);
            ctx.stroke();
        });
        ctx.setLineDash([]);

        if (kNearest.length > 0) {
            const maxDist = kNearest[kNearest.length - 1].distance;
            ctx.beginPath();
            ctx.arc(testPoint.x, testPoint.y, maxDist, 0, 2 * Math.PI);
            ctx.strokeStyle = '#667eea';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.arc(testPoint.x, testPoint.y, 15, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffd93d';
        ctx.fill();
        ctx.strokeStyle = '#f59f00';
        ctx.lineWidth = 3;
        ctx.stroke();

        drawStar(ctx, testPoint.x, testPoint.y, 5, 8, 4);

        const testLabel = `Uji: (${Math.round(testPoint.x)}, ${Math.round(testPoint.y)})`;
        ctx.font = 'bold 12px Arial';
        
        let testLabelX = testPoint.x + 20;
        let testLabelY = testPoint.y - 15;
        
        if (testPoint.x > canvas.width - 100) testLabelX = testPoint.x - 110;
        if (testPoint.y < 30) testLabelY = testPoint.y + 30;
        
        const testMetrics = ctx.measureText(testLabel);
        ctx.fillStyle = 'rgba(255, 217, 61, 0.95)';
        ctx.fillRect(testLabelX - 5, testLabelY - 14, testMetrics.width + 10, 20);
        ctx.strokeStyle = '#f59f00';
        ctx.lineWidth = 2;
        ctx.strokeRect(testLabelX - 5, testLabelY - 14, testMetrics.width + 10, 20);
        
        ctx.fillStyle = '#333';
        ctx.fillText(testLabel, testLabelX, testLabelY);
    }
}

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fillStyle = '#f59f00';
    ctx.fill();
}

// Initialize
generateRandomData();
resizeCanvas();
