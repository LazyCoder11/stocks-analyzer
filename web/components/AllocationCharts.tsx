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

const BRAND_COLORS = [
  '#6366f1', // indigo
  '#0ea5e9', // sky
  '#10b981', // emerald
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#8b5cf6', // violet
  '#14b8a6', // teal
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
      color: BRAND_COLORS[idx % BRAND_COLORS.length],
    };
  }).sort((a, b) => b.percentage - a.percentage);

  // Doughnut Data
  const doughnutData = {
    labels: sectorLabels,
    datasets: [
      {
        data: sectorValues,
        backgroundColor: sectorLabels.map((_, i) => BRAND_COLORS[i % BRAND_COLORS.length]),
        borderColor: '#ffffff',
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
        backgroundColor: 'rgba(148, 163, 184, 0.15)',
        borderColor: 'rgba(148, 163, 184, 0.5)',
        borderWidth: 1.5,
        borderRadius: 4,
      },
      {
        label: 'Current',
        data: currentVals,
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        borderColor: '#6366f1',
        borderWidth: 1.5,
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="card accent-line-cyan">
      {/* Header with interactive Tab togglers */}
      <div className="card-header flex items-center justify-between">
        <div className="card-title flex items-center gap-1.5 text-slate-700">
          {activeTab === 'sector' ? (
            <PieChart size={14} className="text-sky-600" />
          ) : (
            <BarChart2 size={14} className="text-indigo-600" />
          )}
          <span>Analytics</span>
        </div>
        
        <div className="flex bg-slate-100 border border-slate-200 p-0.5 rounded-lg">
          <button
            onClick={() => setActiveTab('sector')}
            className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${
              activeTab === 'sector'
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sectors
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${
              activeTab === 'performance'
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-800'
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
                      {seg.label} <strong className="text-slate-700">{seg.percentage.toFixed(0)}%</strong>
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
                        backgroundColor: '#ffffff',
                        titleColor: '#64748b',
                        bodyColor: '#0f172a',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        padding: 10,
                        bodyFont: { family: 'Inter', size: 12, weight: 'bold' },
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
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8 }}>
                    Total Value
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>
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
                        font: { family: 'Inter', size: 11, weight: 'normal' },
                      },
                    },
                    y: {
                      grid: { color: 'rgba(0,0,0,0.05)' },
                      ticks: {
                        color: '#64748b',
                        font: { family: 'Inter', size: 11 },
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
                        color: '#475569',
                        boxWidth: 6,
                        boxHeight: 6,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: { family: 'Inter', size: 11, weight: 'bold' },
                      },
                    },
                    tooltip: {
                      backgroundColor: '#ffffff',
                      titleColor: '#64748b',
                      bodyColor: '#0f172a',
                      borderColor: '#e2e8f0',
                      borderWidth: 1,
                      padding: 10,
                      bodyFont: { family: 'Inter', size: 12, weight: 'bold' },
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
