import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useTheme } from '../context/ThemeContext';

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS_DARK = [
    'rgba(130, 140, 220, 0.55)', 'rgba(210, 115, 115, 0.55)', 'rgba(110, 191, 164, 0.55)',
    'rgba(210, 170, 100, 0.55)', 'rgba(200, 130, 170, 0.55)', 'rgba(150, 130, 200, 0.55)',
    'rgba(120, 185, 180, 0.55)', 'rgba(200, 150, 110, 0.55)', 'rgba(130, 180, 210, 0.55)',
    'rgba(170, 190, 110, 0.55)',
];

const COLORS_LIGHT = [
    'rgba(99, 102, 241, 0.45)', 'rgba(220, 38, 38, 0.4)', 'rgba(5, 150, 105, 0.4)',
    'rgba(217, 119, 6, 0.4)', 'rgba(219, 39, 119, 0.4)', 'rgba(124, 58, 237, 0.4)',
    'rgba(6, 182, 212, 0.4)', 'rgba(234, 88, 12, 0.4)', 'rgba(37, 99, 235, 0.4)',
    'rgba(132, 204, 22, 0.4)',
];

export default function CategoryChart({ data }) {
    const { isDark } = useTheme();
    if (!data || data.length === 0) return <p className="text-muted">No category data</p>;

    const colors = isDark ? COLORS_DARK : COLORS_LIGHT;

    const chartData = {
        labels: data.map((d) => d.categoryName),
        datasets: [{
            data: data.map((d) => d.total),
            backgroundColor: data.map((_, i) => colors[i % colors.length]),
            hoverBackgroundColor: data.map((_, i) => colors[i % colors.length].replace(/[\d.]+\)$/, m => `${Math.min(parseFloat(m) + 0.2, 1)})`)),
            borderWidth: 0, hoverOffset: 4,
        }],
    };

    const s = getComputedStyle(document.documentElement);
    const legend = s.getPropertyValue('--chart-legend').trim();
    const ttBg = s.getPropertyValue('--chart-tooltip-bg').trim();
    const ttTitle = s.getPropertyValue('--chart-tooltip-title').trim();
    const ttBody = s.getPropertyValue('--chart-tooltip-body').trim();
    const ttBorder = s.getPropertyValue('--chart-tooltip-border').trim();

    const options = {
        responsive: true, maintainAspectRatio: false, cutout: '72%',
        plugins: {
            legend: { position: 'bottom', labels: { color: legend, padding: 8, usePointStyle: true, pointStyleWidth: 5, boxHeight: 5, font: { size: 9, family: 'Inter', weight: '400' } } },
            tooltip: { backgroundColor: ttBg, titleColor: ttTitle, bodyColor: ttBody, borderColor: ttBorder, borderWidth: 1, padding: 10, cornerRadius: 8, titleFont: { size: 11, weight: '500', family: 'Inter' }, bodyFont: { size: 10, family: 'Inter' }, callbacks: { label: (ctx) => `  ${ctx.label}: ₹${ctx.parsed?.toLocaleString('en-IN')}` } },
        },
    };

    return (
        <div className="chart-container-sm" style={{ height: '180px' }}>
            <Doughnut data={chartData} options={options} />
        </div>
    );
}
