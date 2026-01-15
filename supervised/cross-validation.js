const kSlider = document.getElementById('kSlider');
const kValue = document.getElementById('kValue');
const playBtn = document.getElementById('playBtn');
const resetBtn = document.getElementById('resetBtn');
const foldContainer = document.getElementById('foldContainer');
const statsGrid = document.getElementById('statsGrid');
const avgAccuracy = document.getElementById('avgAccuracy');

let K = 5;
let isAnimating = false;
let currentFold = -1;
let accuracies = [];

function init() {
    K = parseInt(kSlider.value);
    kValue.textContent = K;
    currentFold = -1;
    accuracies = Array.from({ length: K }, () => (80 + Math.random() * 15).toFixed(2));
    renderFolds();
    renderStats();
    updateAvg();
}

function renderFolds() {
    foldContainer.innerHTML = '';
    for (let i = 0; i < K; i++) {
        const row = document.createElement('div');
        row.className = 'fold-row';
        if (i === currentFold) row.classList.add('fold-active');

        const label = document.createElement('div');
        label.className = 'fold-label';
        label.textContent = `Fold ${i + 1}`;

        const bar = document.createElement('div');
        bar.className = 'fold-bar';

        for (let j = 0; j < K; j++) {
            const block = document.createElement('div');
            block.className = 'fold-block ' + (j === i ? 'val-set' : 'train-set');
            block.textContent = j === i ? 'Val' : 'Train';
            bar.appendChild(block);
        }

        row.appendChild(label);
        row.appendChild(bar);
        foldContainer.appendChild(row);
    }
}

function renderStats() {
    statsGrid.innerHTML = '';
    accuracies.forEach((acc, i) => {
        const card = document.createElement('div');
        card.className = 'stat-card';
        if (i === currentFold) card.style.borderColor = '#f1c40f';

        const label = document.createElement('span');
        label.className = 'stat-label';
        label.textContent = `Fold ${i + 1}`;

        const val = document.createElement('span');
        val.className = 'stat-value';
        val.textContent = currentFold === -1 || i <= currentFold ? `${acc}%` : '-';

        card.appendChild(label);
        card.appendChild(val);
        statsGrid.appendChild(card);
    });
}

function updateAvg() {
    if (currentFold === -1) {
        avgAccuracy.textContent = '0.00%';
        return;
    }
    const visibleAccs = accuracies.slice(0, currentFold + 1).map(Number);
    const avg = visibleAccs.reduce((a, b) => a + b, 0) / visibleAccs.length;
    avgAccuracy.textContent = `${avg.toFixed(2)}%`;
}

async function playAnimation() {
    if (isAnimating) return;
    isAnimating = true;
    playBtn.disabled = true;

    for (let i = 0; i < K; i++) {
        currentFold = i;
        renderFolds();
        renderStats();
        updateAvg();
        await new Promise(r => setTimeout(r, 800));
    }

    isAnimating = false;
    playBtn.disabled = false;
}

kSlider.addEventListener('input', init);

playBtn.addEventListener('click', () => {
    currentFold = -1;
    playAnimation();
});

resetBtn.addEventListener('click', init);

// Initial load
init();
