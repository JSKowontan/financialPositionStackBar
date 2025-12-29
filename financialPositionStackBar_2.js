(function () {
  const prepared = document.createElement("template");
  prepared.innerHTML = `
        <style>
        </style>
        <div id="root" style="width: 100%; height: 100%;">
        </div>
      `;

class FinancialBalanceChart extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._data = [];
    }

    connectedCallback() {
        this.render();
    }

    set data(payload) {
        this._data = payload;
        this.render();
    }

    get data() {
        return this._data;
    }

    render() {
        const styles = `
            <style>
                :host {
                    display: block;
                    font-family: 'Segoe UI', Arial, sans-serif;
                    color: #444;
                    max-width: 100%;
                    margin: 0 auto;
                }
                .header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 25px;
                }
                .title {
                    font-size: 18px;
                    font-weight: 700;
                    color: #555;
                }
                .legend {
                    display: flex;
                    gap: 15px;
                    font-size: 13px;
                    color: #666;
                }
                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .dot { width: 8px; height: 8px; border-radius: 50%; }
                .dot.current { background-color: #4a4a4a; }
                .dot.non-current { background-color: #b0b0b0; }

                /* Chart Rows */
                .chart-row { margin-bottom: 30px; }
                
                .labels-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 14px;
                    margin-bottom: 10px; /* Slightly more space between text and bar */
                    color: #333;
                }
                .category-label { font-weight: 600; color: #555; }
                
                /* Bar Styles - UPDATED */
                .bar-container {
                    display: flex;
                    height: 10px; /* Reduced height (was 14px) */
                    width: 100%;
                    background-color: #f0f0f0;
                    border-radius: 50px; /* Fully rounded pill shape */
                    overflow: hidden; /* Clips the segments to fit the rounded corners */
                    cursor: pointer;
                    box-shadow: inset 0 1px 3px rgba(0,0,0,0.1); /* Adds subtle depth */
                }
                .bar-segment {
                    height: 100%;
                    transition: opacity 0.2s ease, width 0.5s ease-out; /* Added width animation */
                    position: relative;
                }
                .bar-current { background-color: #4a4a4a; }
                .bar-non-current { background-color: #b0b0b0; }

                /* Interaction */
                .bar-container:hover .bar-segment { opacity: 0.9; }
                .bar-segment:hover { opacity: 1 !important; filter: brightness(1.1); }

                /* Tooltip Styling */
                #tooltip {
                    position: fixed;
                    background: rgba(30, 30, 30, 0.9);
                    backdrop-filter: blur(4px);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 0.2s;
                    z-index: 1000;
                    white-space: nowrap;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    transform: translate(-50%, -120%); /* Centers tooltip above cursor */
                }
            </style>
        `;

        let chartRows = '';
        if (this._data && this._data.length > 0) {
            chartRows = this._data.map((item) => {
                // --- MODIFICATION START: Handle String Inputs ---
                // We use parseFloat to ensure we are doing math on numbers
                const valCurrent = parseFloat(item.current);
                const valNonCurrent = parseFloat(item.nonCurrent);
                
                // Safety check in case of bad data (NaN)
                const safeCurrent = isNaN(valCurrent) ? 0 : valCurrent;
                const safeNonCurrent = isNaN(valNonCurrent) ? 0 : valNonCurrent;

                const total = safeCurrent + safeNonCurrent;
                
                // Avoid division by zero
                const currentPct = total > 0 ? ((safeCurrent / total) * 100).toFixed(1) : 0;
                const nonCurrentPct = total > 0 ? ((safeNonCurrent / total) * 100).toFixed(1) : 0;
                // --- MODIFICATION END ---

                return `
                <div class="chart-row">
                    <div class="labels-row">
                        <span>${item.current}Bln (${Math.round(currentPct)}%)</span>
                        <span class="category-label">${item.label}</span>
                        <span>${item.nonCurrent}Bln (${Math.round(nonCurrentPct)}%)</span>
                    </div>
                    <div class="bar-container">
                        <div class="bar-segment bar-current" 
                             style="width: ${currentPct}%"
                             data-type="Current"
                             data-category="${item.label}"
                             data-value="${item.current}"
                             data-percent="${currentPct}">
                        </div>
                        <div class="bar-segment bar-non-current" 
                             style="width: ${nonCurrentPct}%"
                             data-type="Non-current"
                             data-category="${item.label}"
                             data-value="${item.nonCurrent}"
                             data-percent="${nonCurrentPct}">
                        </div>
                    </div>
                </div>
                `;
            }).join('');
        }

        this.shadowRoot.innerHTML = `
            ${styles}
            <div class="container">
                <div class="header">
                    <div class="title">Current & Non-current</div>
                    <div class="legend">
                        <div class="legend-item"><div class="dot current"></div>Current</div>
                        <div class="legend-item"><div class="dot non-current"></div>Non-current</div>
                    </div>
                </div>
                <div class="chart-body">
                    ${chartRows}
                </div>
                <div id="tooltip"></div>
            </div>
        `;

        this._addInteractivity();
    }

    _addInteractivity() {
        const tooltip = this.shadowRoot.getElementById('tooltip');
        const segments = this.shadowRoot.querySelectorAll('.bar-segment');

        segments.forEach(segment => {
            segment.addEventListener('mouseenter', (e) => {
                const data = e.target.dataset;
                tooltip.innerHTML = `
                    <div style="font-weight:bold; margin-bottom:2px">${data.category} (${data.type})</div>
                    <div>Value: ${data.value} Bln</div>
                    <div style="opacity:0.8; font-size:11px">${data.percent}% Share</div>
                `;
                tooltip.style.opacity = '1';
            });

            segment.addEventListener('mousemove', (e) => {
                // Position centered above the mouse
                tooltip.style.left = `${e.clientX}px`;
                tooltip.style.top = `${e.clientY}px`;
            });

            segment.addEventListener('mouseleave', () => {
                tooltip.style.opacity = '0';
            });

            segment.addEventListener('click', (e) => {
                const data = e.target.dataset;
                this.dispatchEvent(new CustomEvent('bar-click', {
                    detail: {
                        category: data.category,
                        type: data.type,
                        value: parseFloat(data.value),
                        percent: parseFloat(data.percent)
                    },
                    bubbles: true,
                    composed: true
                }));
            });
        });
    }
}

customElements.define('com-autodeck-custom_stack_bar', FinancialBalanceChart);

})();
