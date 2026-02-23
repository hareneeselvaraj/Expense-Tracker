import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function MonthlyChart({ data }) {
    if (!data || data.length === 0) return <p className="text-muted">No monthly data</p>;

    const sorted = [...data].reverse();
    const labels = sorted.map((d) => `${d.month}/${d.year}`);

    const chartData = {
        labels,
        datasets: [
            {
                label: 'Income',
                data: sorted.map((d) => d.income),
                backgroundColor: 'rgba(16, 185, 129, 0.75)',
                hoverBackgroundColor: 'rgba(16, 185, 129, 0.95)',
                borderRadius: 6,
                borderSkipped: false,
            },
            {
                label: 'Expense',
                data: sorted.map((d) => d.expense),
                backgroundColor: 'rgba(239, 68, 68, 0.75)',
                hoverBackgroundColor: 'rgba(239, 68, 68, 0.95)',
                borderRadius: 6,
                borderSkipped: false,
            },
            {
                label: 'Investment',
                data: sorted.map((d) => d.investment),
                backgroundColor: 'rgba(245, 158, 11, 0.75)',
                hoverBackgroundColor: 'rgba(245, 158, 11, 0.95)',
                borderRadius: 6,
                borderSkipped: false,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: {
                position: 'bottom',
                labels: { color: '#8b91b0', padding: 20, usePointStyle: true, pointStyleWidth: 8, font: { size: 12, family: 'Inter' } },
            },
            tooltip: {
                backgroundColor: '#1a1f2e',
                titleColor: '#e8eaf0',
                bodyColor: '#8b91b0',
                borderColor: '#2a3148',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 10,
                titleFont: { size: 13, weight: '600', family: 'Inter' },
                bodyFont: { size: 12, family: 'Inter' },
                callbacks: {
                    label: (ctx) => `  ${ctx.dataset.label}: ₹${ctx.parsed.y?.toLocaleString('en-IN')}`,
                },
            },
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#6b7394', font: { size: 11, family: 'Inter' } } },
            y: { beginAtZero: true, grid: { color: 'rgba(42, 49, 72, 0.5)', drawBorder: false }, ticks: { color: '#6b7394', font: { size: 11, family: 'Inter' }, callback: (v) => `₹${(v / 1000).toFixed(0)}k` } },
        },
    };

    return <Bar data={chartData} options={options} />;
}
