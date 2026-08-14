import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface Props {
  labels: string[];
  counts: number[];
}

export function LeaksTrendChart({ labels, counts }: Props) {
  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            label: 'Leaks',
            data: counts,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56,189,248,0.1)',
            tension: 0.3,
            fill: true,
          },
        ],
      }}
      options={{
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Leak Volume Over Time', color: '#94a3b8' },
        },
        scales: { x: { ticks: { color: '#64748b' } }, y: { ticks: { color: '#64748b' } } },
      }}
    />
  );
}
