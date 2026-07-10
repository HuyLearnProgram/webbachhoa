import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Card, Row, Col, Select, Progress, Alert } from "antd";
import { apiGetRecommendationMetrics } from "@/apis/recommendation";
import { BarChart, LineChart } from "@/components/admin";
import { CATEGORICAL_COLORS } from "@/utils/chartColors";

// Dashboard đo lường hệ thống gợi ý AI (Phase 3): CTR/CVR theo placement×nguồn thuật toán,
// so sánh cohort A/B bandit-on/off, entropy đa dạng hoá theo tuần, catalog coverage,
// tỉ lệ hiển thị lặp không click. Nguồn số liệu: Python /metrics/experiment qua Java proxy
// (khoá ADMIN). Các khối metric có thể null độc lập (1 khối lỗi không giết cả report).

const DAY_OPTIONS = [7, 30, 60, 90].map((d) => ({ value: d, label: `${d} ngày` }));
const pct = (v) => (v == null ? "—" : `${(v * 100).toFixed(2)}%`);

const RecommendationMetrics = () => {
  const { categories } = useSelector((state) => state.app);
  const [days, setDays] = useState(30);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGetRecommendationMetrics(days);
        if (res.statusCode === 200) setReport(res.data);
        else setError(res?.data?.error || res?.message || "Không tải được số liệu");
      } catch (e) {
        setError("Không tải được số liệu — kiểm tra recommendation-service đã chạy chưa");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [days]);

  const categoryName = (id) =>
    categories?.find((c) => String(c.id) === String(id))?.name || `Danh mục ${id}`;

  const ctrRows = report?.ctr_by_placement_source || [];
  const ctrLabels = ctrRows.map((r) => `${r.placement} · ${r.algorithm_source}`);

  const cohorts = report?.ab_cohorts?.cohorts || {};
  const on = cohorts.bandit_on, off = cohorts.bandit_off;
  const ctrDelta = on && off && off.ctr > 0 ? ((on.ctr - off.ctr) / off.ctr) * 100 : null;

  const entropy = report?.weekly_entropy || [];
  const coverage = report?.catalog_coverage_30d;
  const diversity = report?.intra_list_diversity || [];
  const repeatRows = report?.repeat_no_click_by_category || [];

  return (
    <div className="w-full">
      <div className="flex-1 p-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Gợi ý AI — đo lường</h1>
          <Select value={days} onChange={setDays} options={DAY_OPTIONS} style={{ width: 120 }} />
        </div>

        {error && <Alert type="warning" showIcon message={error} className="mb-4" />}

        {/* A/B cohort + coverage */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} lg={6}>
            <Card loading={loading}>
              <h2 className="text-sm font-medium">CTR cohort bandit-on</h2>
              <p className="text-2xl font-bold">{pct(on?.ctr)}</p>
              <p className="text-xs text-gray-500">{on?.impressions?.toLocaleString("vi-VN") || 0} lượt hiển thị</p>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={loading}>
              <h2 className="text-sm font-medium">CTR cohort bandit-off</h2>
              <p className="text-2xl font-bold">{pct(off?.ctr)}</p>
              <p className="text-xs text-gray-500">{off?.impressions?.toLocaleString("vi-VN") || 0} lượt hiển thị</p>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={loading}>
              <h2 className="text-sm font-medium">Chênh lệch CTR on/off</h2>
              <p className={`text-2xl font-bold ${ctrDelta > 0 ? "text-green-600" : ctrDelta < 0 ? "text-red-500" : ""}`}>
                {ctrDelta == null ? "—" : `${ctrDelta > 0 ? "+" : ""}${ctrDelta.toFixed(1)}%`}
              </p>
              <p className="text-xs text-gray-500">
                CVR: {pct(on?.cvr)} vs {pct(off?.cvr)}
              </p>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={loading}>
              <h2 className="text-sm font-medium">Độ phủ catalog (30 ngày)</h2>
              <Progress
                percent={coverage ? Math.round(coverage.coverage * 100) : 0}
                size="small"
                status="normal"
              />
              <p className="text-xs text-gray-500">
                {coverage ? `${coverage.covered_products}/${coverage.total_active_products} sản phẩm được gợi ý` : "—"}
              </p>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} lg={12}>
            <Card title="CTR theo vị trí × nguồn thuật toán" loading={loading}>
              {ctrRows.length ? (
                <BarChart
                  labels={ctrLabels}
                  data={ctrRows.map((r) => +(r.ctr * 100).toFixed(2))}
                  label="CTR (%)"
                  horizontal
                />
              ) : <p className="text-gray-400">Chưa có dữ liệu</p>}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Tỉ lệ chuyển đổi (CVR) theo vị trí × nguồn" loading={loading}>
              {ctrRows.length ? (
                <BarChart
                  labels={ctrLabels}
                  data={ctrRows.map((r) => +(r.cvr * 100).toFixed(2))}
                  label="CVR (%)"
                  horizontal
                />
              ) : <p className="text-gray-400">Chưa có dữ liệu</p>}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} lg={12}>
            <Card
              title="Entropy danh mục theo tuần (hiển thị vs click)"
              loading={loading}
              extra={<span className="text-xs text-gray-400">tăng dần = đa dạng hoá hiệu quả</span>}
            >
              {entropy.length ? (
                <LineChart
                  labels={entropy.map((w) => String(w.yearweek))}
                  datasets={[
                    { label: "Được hiển thị", data: entropy.map((w) => w.entropy_shown), color: CATEGORICAL_COLORS[0] },
                    { label: "Được click", data: entropy.map((w) => w.entropy_clicked), color: CATEGORICAL_COLORS[2] },
                  ]}
                />
              ) : <p className="text-gray-400">Chưa có dữ liệu</p>}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              title="Đa dạng trong slate (intra-list diversity)"
              loading={loading}
              extra={<span className="text-xs text-gray-400">1 − cosine trung bình, cao = đa dạng</span>}
            >
              {diversity.length ? (
                <BarChart
                  labels={diversity.map((d) => d.placement)}
                  data={diversity.map((d) => +(d.diversity * 100).toFixed(1))}
                  label="Diversity (%)"
                  horizontal
                />
              ) : <p className="text-gray-400">Chưa có dữ liệu</p>}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              title="Hiển thị lặp lại không click theo danh mục"
              loading={loading}
              extra={<span className="text-xs text-gray-400">phải giảm dần nếu chống nhàm chán hiệu quả</span>}
            >
              {repeatRows.length ? (
                <BarChart
                  labels={repeatRows.map((r) => categoryName(r.category_id))}
                  data={repeatRows.map((r) => +(r.rate * 100).toFixed(1))}
                  label="Tỉ lệ lặp không click (%)"
                  horizontal
                />
              ) : <p className="text-gray-400">Chưa có dữ liệu</p>}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Cấu hình A/B hiện tại" loading={loading}>
              <p>Bandit A/B: <b>{report?.ab_cohorts?.ab_bandit_enabled ? "đang bật" : "tắt"}</b></p>
              <p>Tỉ lệ cohort bandit-on: <b>{report?.ab_cohorts?.ab_bandit_pct ?? "—"}%</b></p>
              <p className="text-xs text-gray-400 mt-2">
                Cohort chia deterministic theo CRC32(user_id/session_id) — đổi tỉ lệ qua .env của
                recommendation-service (AB_BANDIT_PCT), không cần deploy lại.
              </p>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default RecommendationMetrics;
