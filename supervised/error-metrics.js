(function () {
    function startPlayground() {
        const pointsPanel = document.getElementById('point-controls');
        const linePanel = document.getElementById('line-controls');
        const summaryBox = document.getElementById('summary');
        const stepBox = document.getElementById('step-detail');
        const formulaBox = document.getElementById('formula-box');

        if (!pointsPanel || !linePanel || !summaryBox || !stepBox || !formulaBox) {
            console.error('Elemen playground tidak lengkap.');
            return;
        }

        // Helper for theme colors
        function getThemeColors() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            return {
                text: isDark ? '#f1f5f9' : '#111111',
                bg: isDark ? '#1e293b' : '#ffffff',
                grid: isDark ? '#334155' : '#e5e7eb',
                line: isDark ? '#cbd5e1' : '#444',
                annotationBg: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)'
            };
        }

        // Observer for theme changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                    refresh();
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });

        const defaultControls = [
            { id: 'x1', label: 'x₁', min: -10, max: 10, step: 0.5, value: 1 },
            { id: 'y1', label: 'y₁', min: -10, max: 10, step: 0.5, value: 2.5 },
            { id: 'x2', label: 'x₂', min: -10, max: 10, step: 0.5, value: 3 },
            { id: 'y2', label: 'y₂', min: -10, max: 10, step: 0.5, value: 3.8 },
            { id: 'x3', label: 'x₃', min: -10, max: 10, step: 0.5, value: 5 },
            { id: 'y3', label: 'y₃', min: -10, max: 10, step: 0.5, value: 4.1 },
            { id: 'slope', label: 'Slope (m)', min: -3, max: 3, step: 0.1, value: 0.3 },
            { id: 'intercept', label: 'Intercept (b)', min: -10, max: 10, step: 0.5, value: 2.5 }
        ];

        const state = Object.fromEntries(defaultControls.map(control => [control.id, control.value]));

        function makeSlider(control) {
            const wrapper = document.createElement('div');
            wrapper.className = 'slider-row';

            const label = document.createElement('label');
            label.setAttribute('for', control.id);
            label.textContent = control.label;

            const range = document.createElement('input');
            range.type = 'range';
            range.id = `${control.id}-range`;
            range.min = control.min;
            range.max = control.max;
            range.step = control.step;
            range.value = control.value;

            const number = document.createElement('input');
            number.type = 'number';
            number.id = control.id;
            number.min = control.min;
            number.max = control.max;
            number.step = control.step;
            number.value = control.value;

            function sync(value) {
                range.value = value;
                number.value = value;
                state[control.id] = parseFloat(value);
                refresh();
            }

            range.addEventListener('input', event => sync(event.target.value));
            number.addEventListener('input', event => {
                const value = event.target.value;
                if (value === '') return;
                sync(value);
            });

            wrapper.appendChild(label);
            wrapper.appendChild(range);
            wrapper.appendChild(number);
            return wrapper;
        }

        const pointControls = defaultControls.slice(0, 6);
        const lineControls = defaultControls.slice(6);

        pointControls.forEach(control => {
            pointsPanel.appendChild(makeSlider(control));
        });
        lineControls.forEach(control => {
            linePanel.appendChild(makeSlider(control));
        });

        formulaBox.innerHTML = [
            '<div class="formula-line"><code>y_garis = m · x + b</code> — prediksi nilai di garis.</div>',
            '<div class="formula-line"><code>Δ = y - y_garis</code> — residual/selisih vertikal.</div>',
            '<div class="formula-line"><code>|Δ|</code> = nilai absolut residual.</div>',
            '<div class="formula-line"><code>Δ²</code> = residual kuadrat.</div>',
            '<div class="formula-line"><code>MAE = (1/n) Σ |Δ|</code> — mean absolute error.</div>',
            '<div class="formula-line"><code>MSE = (1/n) Σ Δ²</code> — mean squared error.</div>',
            '<div class="formula-line"><code>RMSE = √MSE</code>.</div>',
            '<div class="formula-line"><code>MAPE = (100/n) Σ |Δ / y|</code> — jika semua y ≠ 0.</div>'
        ].join('');

        function computeData() {
            const xs = [state.x1, state.x2, state.x3];
            const ys = [state.y1, state.y2, state.y3];
            const slope = state.slope;
            const intercept = state.intercept;

            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const span = maxX - minX || 1;
            const padding = Math.max(1.5, 0.2 * span);
            const xMin = minX - padding;
            const xMax = maxX + padding;

            const lineXs = Array.from({ length: 200 }, (_, idx) => xMin + (idx / 199) * (xMax - xMin));
            const lineYs = lineXs.map(x => slope * x + intercept);

            const lineTrace = {
                x: lineXs,
                y: lineYs,
                mode: 'lines',
                name: 'Garis referensi',
                line: { color: 'darkorange', width: 3 }
            };
            const scatterTrace = {
                x: xs,
                y: ys,
                mode: 'markers',
                name: 'Titik data',
                marker: { color: 'royalblue', size: 12 }
            };

            const residualTraces = [];
            const rows = [];

            xs.forEach((x, index) => {
                const y = ys[index];
                const yLine = slope * x + intercept;
                const error = y - yLine;
                const absError = Math.abs(error);
                const sqError = error * error;
                const percentError = Math.abs(y) > 1e-9 ? absError / Math.abs(y) : null;

                rows.push({ index: index + 1, x, y, yLine, error, absError, sqError, percentError });
                residualTraces.push({
                    x: [x, x],
                    y: [yLine, y],
                    mode: 'lines',
                    name: 'Residual',
                    line: { color: 'gray', dash: 'dash' },
                    hoverinfo: 'skip',
                    showlegend: index === 0
                });
            });

            return { lineTrace, scatterTrace, residualTraces, rows };
        }

        function refresh() {
            const slope = state.slope;
            const intercept = state.intercept;
            const { lineTrace, scatterTrace, residualTraces, rows } = computeData();

            const colors = getThemeColors();

            Plotly.react('plot', [scatterTrace, lineTrace, ...residualTraces], {
                margin: { l: 48, r: 20, t: 48, b: 48 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                legend: { x: 0.02, y: 0.98, font: { color: colors.text } },
                title: { text: 'Residual vertikal terhadap garis linier', font: { color: colors.text } },
                xaxis: { title: 'x', color: colors.text, gridcolor: colors.grid, zerolinecolor: colors.line },
                yaxis: { title: 'y', color: colors.text, gridcolor: colors.grid, zerolinecolor: colors.line },
                annotations: rows.map(row => ({
                    x: row.x,
                    y: (row.y + row.yLine) / 2,
                    text: `Δ=${row.error.toFixed(2)}`,
                    showarrow: false,
                    font: { size: 12, color: colors.text },
                    bgcolor: colors.annotationBg
                }))
            }, { responsive: true, displaylogo: false });

            const totalAbs = rows.reduce((acc, row) => acc + row.absError, 0);
            const totalSq = rows.reduce((acc, row) => acc + row.sqError, 0);
            const mae = totalAbs / rows.length;
            const mse = totalSq / rows.length;
            const rmse = Math.sqrt(mse);
            const percentRows = rows.filter(row => row.percentError !== null);
            const mape = percentRows.length === rows.length
                ? (percentRows.reduce((acc, row) => acc + row.percentError, 0) / rows.length) * 100
                : null;

            const summaryLines = [
                `<code>Σ|Δ|</code> = ${totalAbs.toFixed(3)}`,
                `<code>ΣΔ²</code> = ${totalSq.toFixed(4)}`,
                `<code>MAE</code> = ${mae.toFixed(3)}`,
                `<code>MSE</code> = ${mse.toFixed(4)}`,
                `<code>RMSE</code> = ${rmse.toFixed(3)}`
            ];
            if (mape !== null && Number.isFinite(mape)) {
                summaryLines.push(`<code>MAPE</code> = ${mape.toFixed(2)}%`);
            } else {
                summaryLines.push('<code>MAPE</code> tidak dihitung karena ada y = 0.');
            }
            summaryBox.innerHTML = summaryLines.map(line => `<div>${line}</div>`).join('');

            const detailHtml = rows.map(row => {
                const steps = [
                    `<strong>Titik ${row.index}</strong>`,
                    `y_garis = m · x + b = ${slope.toFixed(2)} · ${row.x.toFixed(2)} + ${intercept.toFixed(2)} = ${row.yLine.toFixed(3)}`,
                    `Δ = y - y_garis = ${row.y.toFixed(2)} - ${row.yLine.toFixed(2)} = ${row.error.toFixed(3)}`,
                    `|Δ| = ${row.absError.toFixed(3)}, Δ² = ${row.sqError.toFixed(4)}`
                ];
                if (row.percentError !== null) {
                    steps.push(`|Δ| / |y| = ${(row.percentError * 100).toFixed(2)}%`);
                }
                return `<div class="step-row">${steps.join('<br>')}</div>`;
            }).join('');
            stepBox.innerHTML = detailHtml;
        }

        refresh();
        window.addEventListener('resize', refresh);
    }

    window.__startPlotlyPlayground = startPlayground;
    if (window.Plotly) {
        startPlayground();
    }
})();
