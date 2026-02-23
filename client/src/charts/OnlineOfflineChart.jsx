import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function OnlineOfflineChart({ data }) {
    if (!data) return <p className="text-muted">No data</p>;

    const chartData = {
        labels: ['Online', 'Offline'],
        datasets: [{
            data: [data.onlineTotal, data.offlineTotal],
            backgroundColor: ['rgba(99, 102, 241, 0.8)', 'rgba(245, 158, 11, 0.8)'],
            hoverBackgroundColor: ['rgba(129, 140, 248, 0.95)', 'rgba(251, 191, 36, 0.95)'],
            borderWidth: 0,
            hoverOffset: 6,
        }],
    };

    const options = {
        responsive: true,
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

    return (
        <div>
            <Pie data={chartData} options={options} />
            <div className="chart-meta">
                <span>🟣 Online: {data.onlineCount} txns</span>
                <span>🟡 Offline: {data.offlineCount} txns</span>
            </div>
        </div>
    );
}
