import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { CATEGORICAL_COLORS } from '@/utils/chartColors';

const DoughnutChart = ({ labels, data, colors }) => {
  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: colors || labels.map((_, i) => CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length]),
        borderWidth: 2,
        borderColor: '#fcfcfb',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
    },
  };

  return <Doughnut data={chartData} options={options} />;
};

export default DoughnutChart;
