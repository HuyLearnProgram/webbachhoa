import React from 'react';
import { Line } from 'react-chartjs-2';
import { CATEGORICAL_COLORS, GRIDLINE_COLOR, MUTED_INK } from '@/utils/chartColors';

// Line chart đa series dùng chung (RevenueChart cũ hardcode 1 series doanh thu).
// datasets: [{ label, data, color? }] — màu tự lấy từ CATEGORICAL_COLORS nếu không truyền.
const LineChart = ({ labels, datasets }) => {
  const chartData = {
    labels,
    datasets: datasets.map((ds, i) => {
      const color = ds.color || CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length];
      return {
        label: ds.label,
        data: ds.data,
        borderColor: color,
        backgroundColor: color,
        borderWidth: 2,
        pointRadius: 3,
        fill: false,
        tension: 0.2,
      };
    }),
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: true, labels: { color: MUTED_INK } },
    },
    scales: {
      x: { grid: { color: GRIDLINE_COLOR }, ticks: { color: MUTED_INK } },
      y: { beginAtZero: true, grid: { color: GRIDLINE_COLOR }, ticks: { color: MUTED_INK } },
    },
  };

  return <Line data={chartData} options={options} />;
};

export default LineChart;
