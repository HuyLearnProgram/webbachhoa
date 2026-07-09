import React from 'react';
import { Bar } from 'react-chartjs-2';
import { CATEGORICAL_COLORS, GRIDLINE_COLOR, MUTED_INK } from '@/utils/chartColors';

const BarChart = ({ labels, data, label, colors, horizontal = false }) => {
  const chartData = {
    labels,
    datasets: [
      {
        label,
        data,
        backgroundColor: colors || labels.map((_, i) => CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length]),
        borderRadius: 4,
        maxBarThickness: 40,
      },
    ],
  };

  const options = {
    indexAxis: horizontal ? 'y' : 'x',
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: GRIDLINE_COLOR },
        ticks: { color: MUTED_INK },
      },
      y: {
        beginAtZero: true,
        grid: { color: GRIDLINE_COLOR },
        ticks: { color: MUTED_INK },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
};

export default BarChart;
