import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

export default function CategoryChart({ data }) {
    if (!data || data.length === 0) return <p className="text-muted">No category data</p>;

    const chartData = {
        labels: data.map((d) => d.categoryName),
        datasets: [{
            data: data.map((d) => d.total),
            backgroundColor: data.map((_, i) => COLORS[i % COLORS.length]),
            hoverBackgroundColor: data.map((_, i) => COLORS[i % COLORS.length]),
            borderWidth: 0,
            hoverOffset: 6,
        }],
    };

    const options = {
        responsive: true,
        cutout: '65%',
        plugins: {
            legend: {
                position: 'bottom',
                labels: { color: '#8b91b0', padding: 14, usePointStyle: true, pointStyleWidth: 8, font: { size: 11, family: 'Inter' } },
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
                    label: (ctx) => `  ${ctx.label}: ₹${ctx.parsed?.toLocaleString('en-IN')}`,
                },
            },
        },
    };

    return <Doughnut data={chartData} options={options} />;
}
