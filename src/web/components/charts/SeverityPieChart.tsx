import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  counts: Record<string, number>;
}

const COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#3b82f6',
  INFO: '#64748b',
};

export function SeverityPieChart({ counts }: Props) {
  const labels = Object.keys(counts);
  return (
    <Doughnut
      data={{
        labels,
        datasets: [
          {
            data: labels.map((l) => counts[l] ?? 0),
            backgroundColor: labels.map((l) => COLORS[l] ?? '#64748b'),
          },
        ],
      }}
      options={{
        responsive: true,
        plugins: {
          legend: { labels: { color: '#94a3b8' } },
          title: { display: true, text: 'Severity Distribution', color: '#94a3b8' },
        },
      }}
    />
  );
}
