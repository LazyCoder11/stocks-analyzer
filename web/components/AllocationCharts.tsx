import React from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { PieChart } from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

interface Stock {
  id: string;
  symbol: string;
  yf_symbol: string;
  company_name: string;
  quantity: number;
  buy_price: number;
  exchange: string;
  sector: string;
  notes: string;
  live_price?: number;
}

interface AllocationChartsProps {
  portfolio: Stock[];
}

const NEON_COLORS = [
  '#00ff87', // neon green
  '#00d4ff', // neon cyan
  '#bf5fff', // neon purple
  '#ffb800', // neon amber
  '#ff3d5a', // neon red
  '#ff6b00', // neon orange
  '#00ffcc', // neon teal
];

export const AllocationCharts: React.FC<AllocationChartsProps> = ({ portfolio }) => {
  if (portfolio.length === 0) return null;

  // Calculate sector allocations
  const sectorMap: Record<string, number> = {};
  let totalVal = 0;

  portfolio.forEach((s) => {
    const sec = s.sector || 'Other';
    const val = (s.live_price || s.buy_price) * s.quantity;
    sectorMap[sec] = (sectorMap[sec] || 0) + val;
    totalVal += val;
  });

  const sectorLabels = Object.keys(sectorMap);
  const sectorValues = Object.values(sectorMap);

  // Sector percentages for the custom mobile progress bar
  const sectorAllocations = sectorLabels.map((label, idx) => {
    const val = sectorMap[label];
    const pct = totalVal ? (val / totalVal) * 100 : 0;
    return {
      label,
      value: val,
      percentage: pct,
      color: NEON_COLORS[idx % NEON_COLORS.length],
    };
  }).sort((a, b) => b.percentage - a.percentage);

  // Doughnut Data
  const doughnutData = {
    labels: sectorLabels,
    datasets: [
      {
        data: sectorValues,
        backgroundColor: sectorLabels.map((_, i) => NEON_COLORS[i % NEON_COLORS.length]),
        borderColor: '#0d0d0d',
        borderWidth: 2,
        hoverOffset: 4,
      },
    ],
  };

  // Performance Bar Data
  const symbols = portfolio.map((s) => s.symbol);
  const investedVals = portfolio.map((s) => s.buy_price * s.quantity);
  const currentVals = portfolio.map((s) => (s.live_price || s.buy_price) * s.quantity);

  const barData = {
    labels: symbols,
    datasets: [
      {
        label: 'Invested',
        data: investedVals,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Current',
        data: currentVals,
        backgroundColor: 'rgba(0, 255, 135, 0.2)',
        borderColor: '#00ff87',
        borderWidth: 1.5,
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="card accent-line-cyan">
      <div className="card-header">
        <div className="card-title">
          <PieChart size={14} className="empty-icon" />
          <span>PORTFOLIO METRICS</span>
        </div>
      </div>
      <div className="card-inner">
        {/* Custom Mobile-Friendly Allocation Bar */}
        <div className="chart-label" style={{ marginBottom: '6px' }}>Sector Weighting</div>
        <div className="alloc-bar">
          {sectorAllocations.map((seg, idx) => (
            <div
              key={idx}
              className="alloc-seg"
              style={{
                width: `${seg.percentage}%`,
                backgroundColor: seg.color,
              }}
              title={`${seg.label}: ${seg.percentage.toFixed(1)}%`}
            />
          ))}
        </div>

        <div className="alloc-legend" style={{ marginBottom: '20px' }}>
          {sectorAllocations.map((seg, idx) => (
            <div key={idx} className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: seg.color }} />
              <span>
                {seg.label} ({seg.percentage.toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="charts-grid">
          {/* Doughnut Chart */}
          <div className="chart-box">
            <div className="chart-label">Sector Split</div>
            <div style={{ height: '150px', position: 'relative' }}>
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false, // Use our HTML legend above for cleaner mobile support
                    },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => {
                          const val = ctx.raw as number;
                          const pct = totalVal ? (val / totalVal) * 100 : 0;
                          return ` ₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })} (${pct.toFixed(1)}%)`;
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Bar Chart */}
          <div className="chart-box">
            <div className="chart-label">Performance Comparison</div>
            <div style={{ height: '150px', position: 'relative' }}>
              <Bar
                data={barData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: {
                        color: '#7a7a7a',
                        font: { family: 'Space Grotesk', size: 9 },
                      },
                    },
                    y: {
                      grid: { color: 'rgba(255,255,255,0.02)' },
                      ticks: {
                        color: '#7a7a7a',
                        font: { family: 'Space Grotesk', size: 9 },
                        callback: (v) => `₹${Number(v) >= 100000 ? (Number(v)/100000).toFixed(1) + 'L' : Number(v) >= 1000 ? (Number(v)/1000).toFixed(0) + 'k' : v}`,
                      },
                    },
                  },
                  plugins: {
                    legend: {
                      display: true,
                      position: 'top',
                      labels: {
                        color: '#7a7a7a',
                        boxWidth: 8,
                        boxHeight: 8,
                        font: { family: 'Space Grotesk', size: 9, weight: 'bold' },
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
