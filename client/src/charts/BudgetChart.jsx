import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function BudgetChart({ data }) {
    if (!data || data.length === 0) return <p className="text-muted">No budget data</p>;

    const labels = data.map((d) => `${d.categoryName} (${d.month}/${d.year})`);

    const chartData = {
        labels,
        datasets: [
            {
                label: 'Budget',
                data: data.map((d) => d.budgetAmount),
                backgroundColor: 'rgba(99, 102, 241, 0.7)',
                hoverBackgroundColor: 'rgba(129, 140, 248, 0.9)',
                borderRadius: 6,
                borderSkipped: false,
            },
            {
                label: 'Actual',
                data: data.map((d) => d.actualSpent),
                backgroundColor: 'rgba(239, 68, 68, 0.7)',
                hoverBackgroundColor: 'rgba(248, 113, 113, 0.9)',
                borderRadius: 6,
                borderSkipped: false,
            },
        ],
    };

    const options = {
        responsive: true,
        indexAxis: 'y',
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
                    label: (ctx) => `  ${ctx.dataset.label}: ₹${ctx.parsed.x?.toLocaleString('en-IN')}`,
                },
            },
        },
        scales: {
            x: { beginAtZero: true, grid: { color: 'rgba(42, 49, 72, 0.5)', drawBorder: false }, ticks: { color: '#6b7394', font: { size: 11, family: 'Inter' }, callback: (v) => `₹${(v / 1000).toFixed(0)}k` } },
            y: { grid: { display: false }, ticks: { color: '#8b91b0', font: { size: 11, family: 'Inter' } } },
        },
    };

    return <Bar data={chartData} options={options} />;
}
