import React, { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { Card, Row, Col } from "antd";
import {
  apiGetSummary,
  apiGetMonthlyRevenue,
  apiGetOrderStatusStats,
  apiGetFeedbackStats,
  apiGetTopProducts,
  apiGetRatingDistribution,
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

  // Mặc định luôn là tháng/năm hiện tại khi mới vào trang
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [stats, setStats] = useState({ totalProfit: 0, totalUsers: 0, totalProducts: 0, totalOrders: 0 });
  const [chartData, setChartData] = useState([]);
  const [orderBreakdown, setOrderBreakdown] = useState({ byStatus: [], byPaymentStatus: [] });
  const [feedbackStats, setFeedbackStats] = useState({
    avgRating: 0, totalFeedbacks: 0, hiddenCount: 0,
  });
  // Tách riêng khỏi feedbackStats.ratingDistribution cũ (all-time) — giờ theo tháng/năm chọn, phục vụ
  // riêng biểu đồ "Phân bố đánh giá theo sao"; 2 stat card avgRating/hiddenCount vẫn all-time.
  const [ratingDistribution, setRatingDistribution] = useState([]);
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

  const fetchOrderBreakdown = async (month, year) => {
    const res = await apiGetOrderStatusStats(month, year);
    if (res.statusCode === 200) setOrderBreakdown(res.data);
  };

  const fetchTopProducts = async (month, year) => {
    const res = await apiGetTopProducts(month, year, 5);
    if (res.statusCode === 200) setTopProducts(res.data || []);
  };

  const fetchRatingDistribution = async (month, year) => {
    const res = await apiGetRatingDistribution(month, year);
    if (res.statusCode === 200) setRatingDistribution(res.data || []);
  };

  const fetchFeedbackStats = async () => {
    const res = await apiGetFeedbackStats();
    if (res.statusCode === 200) setFeedbackStats(res.data);
  };

  const fetchProductStats = async () => {
    const lowStockRes = await apiGetProducts({ filter: `quantity<=${LOW_STOCK_THRESHOLD}`, size: 1 });
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
  };

  const handleYearChange = (event) => {
    const year = parseInt(event.target.value, 10);
    setSelectedYear(year);
    // Reset month selection if year is changed
    if (year === currentDate.getFullYear()) {
      setSelectedMonth(currentMonth);
    } else {
      setSelectedMonth(12); // Reset về tháng 12 cho năm trước
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchFeedbackStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dùng CHUNG 1 bộ chọn tháng/năm cho 5 biểu đồ: doanh thu, đơn theo trạng thái, thanh toán,
  // top sản phẩm bán chạy, phân bố đánh giá — đổi tháng/năm sẽ refetch cả 5 cùng lúc.
  useEffect(() => {
    fetchOverviewOrder(selectedMonth);
    fetchOrderBreakdown(selectedMonth, selectedYear);
    fetchTopProducts(selectedMonth, selectedYear);
    fetchRatingDistribution(selectedMonth, selectedYear);
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
    (s) => ratingDistribution.find((r) => r.ratingStar === s)?.count || 0
  );

  const topProductLabels = topProducts.map((p) => p.productName);
  const topProductData = topProducts.map((p) => p.totalSold);

  const categoryChartLabels = categoryDistribution.map((c) => c.name);
  const categoryChartData = categoryDistribution.map((c) => c.count);

  const promotionChartLabels = promotionDistribution.map((p) => p.label);
  const promotionChartData = promotionDistribution.map((p) => p.count);

  // 3 thẻ dưới đây đổi từ "toàn thời gian" sang "theo tháng/năm đang chọn" — tận dụng thẳng dữ liệu
  // đã fetch cho orderBreakdown/ratingDistribution (cùng nguồn với 3 biểu đồ bên dưới), không cần gọi
  // thêm API nào. Tiêu đề thẻ luôn ghi rõ "(Tháng M/YYYY)" để admin không nhầm là số liệu toàn thời gian.
  const monthlyProfit = orderBreakdown.byPaymentStatus.find((p) => p.paymentStatus === 'PAID')?.revenue || 0;
  const monthlyOrderCount = orderBreakdown.byStatus.reduce((sum, s) => sum + (s.count || 0), 0);
  const monthlyRatingCount = ratingDistribution.reduce((sum, r) => sum + (r.count || 0), 0);
  const monthlyAvgRating = monthlyRatingCount > 0
    ? ratingDistribution.reduce((sum, r) => sum + r.ratingStar * r.count, 0) / monthlyRatingCount
    : 0;
  const monthLabel = `Tháng ${selectedMonth}/${selectedYear}`;

  return (
    <div className="w-full">
      <div className="flex-1 p-6 bg-white">
        <h1 className="text-2xl font-bold mb-4">Overview</h1>

        <div className="flex items-end gap-8 mb-6 bg-gray-50 border rounded-lg p-4">
          <div>
            <div className="text-sm font-medium mb-2">
              Xem theo tháng (áp dụng cho: doanh thu, đơn theo trạng thái, thanh toán, top sản phẩm, đánh giá)
            </div>
            <div className="flex gap-4">
              <div>
                <label htmlFor="yearSelect" className="block text-xs text-gray-500 mb-1">
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
              <div>
                <label htmlFor="monthSelect" className="block text-xs text-gray-500 mb-1">
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
          </div>
        </div>

        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <h2 className="text-sm font-medium">Tổng lợi nhuận <span className="text-gray-400 font-normal">({monthLabel})</span></h2>
              <p className="text-2xl font-bold">{monthlyProfit.toLocaleString("vi-VN")} đ</p>
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
              <h2 className="text-sm font-medium">Đơn hàng <span className="text-gray-400 font-normal">({monthLabel})</span></h2>
              <p className="text-2xl font-bold">{monthlyOrderCount}</p>
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
              <h2 className="text-sm font-medium">Đánh giá trung bình <span className="text-gray-400 font-normal">({monthLabel})</span></h2>
              <p className="text-2xl font-bold">{monthlyAvgRating.toFixed(1)} / 5</p>
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
