import React, { useState } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { PieChart, BarChart2 } from 'lucide-react';
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
  '#10b981', // emerald green
  '#06b6d4', // neon cyan
  '#8b5cf6', // neon purple
  '#f59e0b', // neon amber
  '#ef4444', // neon red
  '#f97316', // neon orange
  '#14b8a6', // neon teal
];

const fmt = (n: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
};

export const AllocationCharts: React.FC<AllocationChartsProps> = ({ portfolio }) => {
  const [activeTab, setActiveTab] = useState<'sector' | 'performance'>('sector');

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

  // Sector percentages for the custom progress bar
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
        borderColor: '#0b0b13',
        borderWidth: 2,
        hoverOffset: 6,
        cutout: '72%',
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
        backgroundColor: 'rgba(148, 163, 184, 0.08)',
        borderColor: 'rgba(148, 163, 184, 0.3)',
        borderWidth: 1.5,
        borderRadius: 6,
      },
      {
        label: 'Current',
        data: currentVals,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: '#10b981',
        borderWidth: 1.5,
        borderRadius: 6,
      },
    ],
  };

  return (
    <div className="card accent-line-cyan">
      {/* Header with interactive Tab togglers */}
      <div className="card-header flex items-center justify-between">
        <div className="card-title flex items-center gap-1.5">
          {activeTab === 'sector' ? (
            <PieChart size={14} className="text-cyan-400" />
          ) : (
            <BarChart2 size={14} className="text-emerald-400" />
          )}
          <span>Analytics</span>
        </div>
        
        <div className="flex bg-white/[0.03] border border-white/[0.06] p-0.5 rounded-lg">
          <button
            onClick={() => setActiveTab('sector')}
            className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
              activeTab === 'sector'
                ? 'bg-cyan-500/15 text-cyan-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            Sectors
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
              activeTab === 'performance'
                ? 'bg-emerald-500/15 text-emerald-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            Assets
          </button>
        </div>
      </div>

      <div className="card-inner">
        {activeTab === 'sector' && (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            {/* Custom Allocation Bar */}
            <div>
              <div className="chart-label">Sector Weights</div>
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

              <div className="alloc-legend">
                {sectorAllocations.map((seg, idx) => (
                  <div key={idx} className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: seg.color }} />
                    <span>
                      {seg.label} <strong className="text-slate-300">{seg.percentage.toFixed(0)}%</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Doughnut Chart Container */}
            <div className="chart-box" style={{ height: '220px', display: 'flex', justifyContent: 'center' }}>
              <div style={{ height: '200px', width: '200px', position: 'relative' }}>
                <Doughnut
                  data={doughnutData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: '#0c0c16',
                        titleColor: '#94a3b8',
                        bodyColor: '#f8fafc',
                        borderColor: 'rgba(255,255,255,0.08)',
                        borderWidth: 1,
                        padding: 10,
                        bodyFont: { family: 'Plus Jakarta Sans', size: 11, weight: '600' },
                        callbacks: {
                          label: (ctx) => {
                            const val = ctx.raw as number;
                            const pct = totalVal ? (val / totalVal) * 100 : 0;
                            return ` ${fmt(val)} (${pct.toFixed(1)}%)`;
                          },
                        },
                      },
                    },
                  }}
                />
                {/* Centered Stats Ring Overlay */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  pointerEvents: 'none'
                }}>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', tracking: 'widest', opacity: 0.7 }}>
                    Total Value
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>
                    {fmt(totalVal)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="animate-in fade-in duration-200">
            <div className="chart-label">Capital Comparison</div>
            <div className="chart-box" style={{ height: '240px' }}>
              <Bar
                data={barData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: {
                        color: '#64748b',
                        font: { family: 'Plus Jakarta Sans', size: 9, weight: 600 },
                      },
                    },
                    y: {
                      grid: { color: 'rgba(255,255,255,0.03)' },
                      ticks: {
                        color: '#64748b',
                        font: { family: 'Plus Jakarta Sans', size: 9 },
                        callback: (v) => `₹${Number(v) >= 100000 ? (Number(v)/100000).toFixed(1) + 'L' : Number(v) >= 1000 ? (Number(v)/1000).toFixed(0) + 'k' : v}`,
                      },
                    },
                  },
                  plugins: {
                    legend: {
                      display: true,
                      position: 'top',
                      align: 'end',
                      labels: {
                        color: '#94a3b8',
                        boxWidth: 6,
                        boxHeight: 6,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: { family: 'Plus Jakarta Sans', size: 9, weight: 700 },
                      },
                    },
                    tooltip: {
                      backgroundColor: '#0c0c16',
                      titleColor: '#94a3b8',
                      bodyColor: '#f8fafc',
                      borderColor: 'rgba(255,255,255,0.08)',
                      borderWidth: 1,
                      padding: 10,
                      bodyFont: { family: 'Plus Jakarta Sans', size: 11, weight: '600' },
                      callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${fmt(ctx.raw as number)}`
                      }
                    }
                  },
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
