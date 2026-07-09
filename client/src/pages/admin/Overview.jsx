import React, { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { Card, Row, Col } from "antd";
import {
  apiGetSummary,
  apiGetMonthlyRevenue,
  apiGetOrderStatusStats,
  apiGetFeedbackStats,
  apiGetProducts,
} from "@/apis";
import { RevenueChart, BarChart, DoughnutChart } from "@/components/admin";
import {
  statusOrder,
  paymentStatusLabel,
  promotionTypeOptions,
  LOW_STOCK_THRESHOLD,
} from "@/utils/constants";
import { ORDER_STATUS_COLORS, PAYMENT_STATUS_COLORS, SEQUENTIAL_BLUE } from "@/utils/chartColors";

const orderStatusLabels = statusOrder.filter((o) => o.value !== "default");
const RATING_STARS = [1, 2, 3, 4, 5];

const Overview = () => {
  const { categories } = useSelector((state) => state.app);
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const lastYear = currentDate.getFullYear() - 1;

  // Thiết lập tháng mặc định là tháng trước và năm mặc định là năm hiện tại
  const [selectedMonth, setSelectedMonth] = useState(currentMonth > 1 ? currentMonth - 1 : 12);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [stats, setStats] = useState({ totalProfit: 0, totalUsers: 0, totalProducts: 0, totalOrders: 0 });
  const [chartData, setChartData] = useState([]);
  const [orderBreakdown, setOrderBreakdown] = useState({ byStatus: [], byPaymentStatus: [] });
  const [feedbackStats, setFeedbackStats] = useState({
    avgRating: 0, totalFeedbacks: 0, hiddenCount: 0, ratingDistribution: [],
  });
  const [topProducts, setTopProducts] = useState([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [categoryDistribution, setCategoryDistribution] = useState([]);
  const [promotionDistribution, setPromotionDistribution] = useState([]);

  const months = useMemo(() => {
    const monthOptions = [];
    for (let month = 1; month <= 12; month++) {
      monthOptions.push({
        value: month,
        label: `${String(month).padStart(2, '0')}`, // Chỉ để lại số tháng
      });
    }
    return monthOptions;
  }, []);

  const fetchSummary = async () => {
    const res = await apiGetSummary();
    if (res.statusCode === 200) setStats(res.data);
  };

  const fetchOverviewOrder = async (month) => {
    const res = await apiGetMonthlyRevenue(month, selectedYear);
    if (res.statusCode === 200) setChartData(res.data);
  };

  const fetchOrderBreakdown = async () => {
    const res = await apiGetOrderStatusStats();
    if (res.statusCode === 200) setOrderBreakdown(res.data);
  };

  const fetchFeedbackStats = async () => {
    const res = await apiGetFeedbackStats();
    if (res.statusCode === 200) setFeedbackStats(res.data);
  };

  const fetchProductStats = async () => {
    const [topRes, lowStockRes] = await Promise.all([
      apiGetProducts({ sort: 'sold,desc', size: 5 }),
      apiGetProducts({ filter: `quantity<=${LOW_STOCK_THRESHOLD}`, size: 1 }),
    ]);
    setTopProducts(topRes?.data?.result || []);
    setLowStockCount(lowStockRes?.data?.meta?.total || 0);

    const categoryCounts = await Promise.all(
      categories.map((c) => apiGetProducts({ filter: `category.id='${c.id}'`, size: 1 }))
    );
    setCategoryDistribution(
      categories.map((c, i) => ({ name: c.name, count: categoryCounts[i]?.data?.meta?.total || 0 }))
    );

    const promotionCounts = await Promise.all(
      promotionTypeOptions.map((opt) => apiGetProducts({ filter: `promotionType='${opt.value}'`, size: 1 }))
    );
    setPromotionDistribution(
      promotionTypeOptions.map((opt, i) => ({ label: opt.label, count: promotionCounts[i]?.data?.meta?.total || 0 }))
    );
  };

  const handleMonthChange = (event) => {
    const month = parseInt(event.target.value, 10);
    setSelectedMonth(month);
    fetchOverviewOrder(month);
  };

  const handleYearChange = (event) => {
    const year = parseInt(event.target.value, 10);
    setSelectedYear(year);
    // Reset month selection if year is changed
    if (year === currentDate.getFullYear()) {
      setSelectedMonth(currentMonth > 1 ? currentMonth - 1 : 12);
    } else {
      setSelectedMonth(12); // Reset về tháng 12 cho năm trước
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchOrderBreakdown();
    fetchFeedbackStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchOverviewOrder(selectedMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (categories?.length) fetchProductStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  const statusChartLabels = orderBreakdown.byStatus.map(
    (item) => orderStatusLabels.find((s) => s.value === item.status)?.label || item.status
  );
  const statusChartData = orderBreakdown.byStatus.map((item) => item.count);
  const statusChartColors = orderBreakdown.byStatus.map((item) => ORDER_STATUS_COLORS[item.status]);

  const paymentChartLabels = orderBreakdown.byPaymentStatus.map(
    (item) => paymentStatusLabel[item.paymentStatus] || item.paymentStatus
  );
  const paymentChartData = orderBreakdown.byPaymentStatus.map((item) => item.revenue);
  const paymentChartColors = orderBreakdown.byPaymentStatus.map((item) => PAYMENT_STATUS_COLORS[item.paymentStatus]);

  const ratingChartLabels = RATING_STARS.map((s) => `${s} sao`);
  const ratingChartData = RATING_STARS.map(
    (s) => feedbackStats.ratingDistribution.find((r) => r.ratingStar === s)?.count || 0
  );

  const topProductLabels = topProducts.map((p) => p.product_name);
  const topProductData = topProducts.map((p) => p.sold);

  const categoryChartLabels = categoryDistribution.map((c) => c.name);
  const categoryChartData = categoryDistribution.map((c) => c.count);

  const promotionChartLabels = promotionDistribution.map((p) => p.label);
  const promotionChartData = promotionDistribution.map((p) => p.count);

  return (
    <div className="w-full">
      <div className="flex-1 p-6 bg-white">
        <h1 className="text-2xl font-bold mb-4">Overview</h1>

        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <h2 className="text-sm font-medium">Tổng lợi nhuận</h2>
              <p className="text-2xl font-bold">{stats.totalProfit.toLocaleString("vi-VN")} đ</p>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <h2 className="text-sm font-medium">Người sử dụng</h2>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <h2 className="text-sm font-medium">Tổng sản phẩm</h2>
              <p className="text-2xl font-bold">{stats.totalProducts}</p>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <h2 className="text-sm font-medium">Đơn hàng</h2>
              <p className="text-2xl font-bold">{stats.totalOrders}</p>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <h2 className="text-sm font-medium">Sản phẩm sắp hết hàng</h2>
              <p className="text-2xl font-bold">{lowStockCount}</p>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <h2 className="text-sm font-medium">Đánh giá trung bình</h2>
              <p className="text-2xl font-bold">{feedbackStats.avgRating.toFixed(1)} / 5</p>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <h2 className="text-sm font-medium">Đánh giá đang bị ẩn</h2>
              <p className="text-2xl font-bold">{feedbackStats.hiddenCount}</p>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="Biểu đồ doanh thu theo tuần trong tháng">
              <div className="flex mb-4">
                <div className="mb-4">
                  <label htmlFor="yearSelect" className="block text-sm font-medium mb-2">
                    Chọn năm
                  </label>
                  <select
                    id="yearSelect"
                    value={selectedYear}
                    onChange={handleYearChange}
                    className="border w-[105px] rounded p-2 text-sm"
                  >
                    <option value={lastYear}>{lastYear}</option>
                    <option value={currentDate.getFullYear()}>{currentDate.getFullYear()}</option>
                  </select>
                </div>
                <div className="mb-4 ml-20">
                  <label htmlFor="monthSelect" className="block text-sm font-medium mb-2">
                    Chọn tháng
                  </label>
                  <select
                    id="monthSelect"
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    className="border w-[105px] rounded p-2 text-sm"
                  >
                    {months
                      .filter((month) =>
                        (selectedYear === currentDate.getFullYear() ? month.value <= currentMonth : true)
                      )
                      .map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <RevenueChart data={chartData} />
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Đơn hàng theo trạng thái">
              <BarChart labels={statusChartLabels} data={statusChartData} label="Số đơn" colors={statusChartColors} />
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Giá trị đơn hàng theo tình trạng thanh toán">
              <DoughnutChart labels={paymentChartLabels} data={paymentChartData} colors={paymentChartColors} />
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Top 5 sản phẩm bán chạy">
              <BarChart labels={topProductLabels} data={topProductData} label="Đã bán" horizontal />
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Sản phẩm theo danh mục">
              <BarChart labels={categoryChartLabels} data={categoryChartData} label="Số sản phẩm" horizontal />
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Sản phẩm theo loại khuyến mãi">
              <DoughnutChart labels={promotionChartLabels} data={promotionChartData} />
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Phân bố đánh giá theo sao">
              <BarChart labels={ratingChartLabels} data={ratingChartData} label="Số đánh giá" colors={SEQUENTIAL_BLUE} />
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Overview;
