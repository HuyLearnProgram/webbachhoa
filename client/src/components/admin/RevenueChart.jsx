import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const RevenueChart = ({ data }) => {
  const labels = data.map(item => item.days);
  const totalRevenue = data.map(item => item.totalRevenue);

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: 'Doanh thu theo tuần',
        data: totalRevenue,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderWidth: 2,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div>
      <h2>Biểu đồ doanh thu theo tuần trong tháng</h2>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default RevenueChart;
