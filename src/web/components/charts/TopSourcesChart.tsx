import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props {
  sources: { name: string; count: number }[];
}

export function TopSourcesChart({ sources }: Props) {
  return (
    <Bar
      data={{
        labels: sources.map((s) => s.name),
        datasets: [
          { label: 'Records', data: sources.map((s) => s.count), backgroundColor: '#6366f1' },
        ],
      }}
      options={{
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Top Sources', color: '#94a3b8' },
        },
        scales: { x: { ticks: { color: '#64748b' } }, y: { ticks: { color: '#64748b' } } },
      }}
    />
  );
}
