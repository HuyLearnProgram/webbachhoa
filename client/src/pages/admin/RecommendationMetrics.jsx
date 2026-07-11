import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Card, Row, Col, Select, Progress, Alert, Modal, Tag, Button, Slider } from "antd";
import { toast } from "react-toastify";
import { apiGetRecommendationMetrics, apiUpdateAbBanditPct } from "@/apis/recommendation";
import { BarChart, LineChart } from "@/components/admin";
import { CATEGORICAL_COLORS } from "@/utils/chartColors";
import icons from "@/utils/icons";
import { buildExplanation, suggestAbPct } from "./recommendationMetricsExplain";

// Dashboard đo lường hệ thống gợi ý AI (Phase 3): CTR/CVR theo placement×nguồn thuật toán,
// so sánh cohort A/B bandit-on/off, entropy đa dạng hoá theo tuần, catalog coverage,
// tỉ lệ hiển thị lặp không click. Nguồn số liệu: Python /metrics/experiment qua Java proxy
// (khoá ADMIN). Các khối metric có thể null độc lập (1 khối lỗi không giết cả report).
// Click vào bất kỳ thẻ/biểu đồ nào để mở popup giải thích (recommendationMetricsExplain.jsx):
// biểu đồ phóng to nằm trên (ghim được khi cuộn), phần giải thích + nhận xét từ dữ liệu ở dưới.

const { FaInfoCircle, TbPin, TbPinnedOff } = icons;

const DAY_OPTIONS = [7, 30, 60, 90].map((d) => ({ value: d, label: `${d} ngày` }));

// Cho phép chọn tự do 0-100 (mọi giá trị đều hợp lệ về mặt kỹ thuật — % chỉ là ngưỡng hash),
// nhưng neo vào các mốc rollout thường dùng (0/10/25/50/75/90/100) để lịch sử thay đổi dễ đọc
// lại sau này (VD "đang ở 50% suốt 2 tuần rồi lên 70%" dễ diễn giải hơn "47% rồi 53% rồi 61%").
// step=5 vẫn cho tinh chỉnh giữa các mốc, không khoá cứng chỉ 3-4 lựa chọn.
const PCT_STEP = 5;
const PCT_MARKS = { 0: "0%", 10: "10%", 25: "25%", 50: "50%", 75: "75%", 90: "90%", 100: "100%" };
const pct = (v) => (v == null ? "—" : `${(v * 100).toFixed(2)}%`);

const INSIGHT_TAGS = {
  good: { color: "green", label: "Tốt" },
  warn: { color: "orange", label: "Cần chú ý" },
  neutral: { color: "blue", label: "Chưa rõ xu hướng" },
  nodata: { color: "default", label: "Chưa có dữ liệu" },
};

// Icon gọn cho thẻ stat (chữ "giải thích" làm lệch layout thẻ hẹp);
// biểu đồ dùng bản có chữ ở góc extra vì còn nhiều chỗ.
const infoIcon = <FaInfoCircle className="text-gray-300 shrink-0" title="Bấm để xem giải thích" />;
const infoHint = (
  <span className="text-xs text-gray-400 inline-flex items-center gap-1">
    <FaInfoCircle /> giải thích
  </span>
);

const RecommendationMetrics = () => {
  const { categories } = useSelector((state) => state.app);
  const [days, setDays] = useState(30);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [explainKey, setExplainKey] = useState(null);
  const [pinPreview, setPinPreview] = useState(false);
  const [pctInput, setPctInput] = useState(null);
  const [applyingPct, setApplyingPct] = useState(false);

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

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const categoryName = (id) =>
    categories?.find((c) => String(c.id) === String(id))?.name || `Danh mục ${id}`;

  const ctrRows = report?.ctr_by_placement_source || [];
  const ctrLabels = ctrRows.map((r) => `${r.placement} · ${r.algorithm_source}`);

  const cohorts = report?.ab_cohorts?.cohorts || {};
  const on = cohorts.bandit_on, off = cohorts.bandit_off;
  const ctrDelta = on && off && off.ctr > 0 ? ((on.ctr - off.ctr) / off.ctr) * 100 : null;

  const currentPct = report?.ab_cohorts?.ab_bandit_pct ?? 50;
  const pctAppliedAt = report?.ab_cohorts?.ab_pct_applied_at;
  const pctSuggestion = suggestAbPct(on, off, currentPct, pctAppliedAt);

  useEffect(() => {
    // Đồng bộ ô nhập theo đề xuất mỗi khi có báo cáo mới — admin vẫn có thể tự gõ số khác trước khi Áp dụng.
    if (report) setPctInput(pctSuggestion.suggestedPct);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report]);

  const applyPct = async () => {
    if (pctInput == null || pctInput < 0 || pctInput > 100) {
      toast.error("Tỉ lệ phải trong khoảng 0-100");
      return;
    }
    setApplyingPct(true);
    try {
      const res = await apiUpdateAbBanditPct(pctInput);
      if (res.statusCode === 200) {
        toast.success(`Đã đổi AB_BANDIT_PCT thành ${pctInput}% (đã lưu vào .env, giữ nguyên qua các lần restart sau)`);
        await fetchReport();
      } else {
        toast.error(res?.data?.error || res?.message || "Không đổi được tỉ lệ");
      }
    } catch (e) {
      toast.error("Không đổi được tỉ lệ — kiểm tra recommendation-service đã chạy chưa");
    } finally {
      setApplyingPct(false);
    }
  };

  const entropy = report?.weekly_entropy || [];
  const coverage = report?.catalog_coverage_30d;
  const diversity = report?.intra_list_diversity || [];
  const repeatRows = report?.repeat_no_click_by_category || [];

  const explain = explainKey
    ? buildExplanation(explainKey, {
        report, on, off, ctrDelta, coverage, entropy, diversity, repeatRows, ctrRows, categoryName, days,
      })
    : null;
  const insightTag = explain ? INSIGHT_TAGS[explain.insight?.status] || INSIGHT_TAGS.neutral : null;

  const openExplain = (key) => {
    setPinPreview(false);
    setExplainKey(key);
  };

  // Mọi Card đều mở popup giải thích khi click — gom prop chung tại đây.
  const clickable = (key) => ({
    hoverable: true,
    onClick: () => openExplain(key),
    className: "cursor-pointer",
  });

  // Bản phóng to của chính thẻ/biểu đồ được click, hiển thị trên cùng popup.
  const statPreview = (value, sub, valueClass = "") => (
    <div className="flex flex-col items-center py-4">
      <p className={`text-5xl font-bold ${valueClass}`}>{value}</p>
      {sub && <p className="text-sm text-gray-500 mt-2">{sub}</p>}
    </div>
  );

  const renderPreview = (key) => {
    switch (key) {
      case "ctr_on":
        return statPreview(pct(on?.ctr), `${on?.impressions?.toLocaleString("vi-VN") || 0} lượt hiển thị · ${on?.clicks?.toLocaleString("vi-VN") || 0} lượt click`);
      case "ctr_off":
        return statPreview(pct(off?.ctr), `${off?.impressions?.toLocaleString("vi-VN") || 0} lượt hiển thị · ${off?.clicks?.toLocaleString("vi-VN") || 0} lượt click`);
      case "ctr_delta":
        return statPreview(
          ctrDelta == null ? "—" : `${ctrDelta > 0 ? "+" : ""}${ctrDelta.toFixed(1)}%`,
          `CVR: ${pct(on?.cvr)} (bandit-on) vs ${pct(off?.cvr)} (bandit-off)`,
          ctrDelta > 0 ? "text-green-600" : ctrDelta < 0 ? "text-red-500" : ""
        );
      case "coverage":
        return (
          <div className="py-4 px-6">
            <Progress percent={coverage ? Math.round(coverage.coverage * 100) : 0} status="normal" />
            <p className="text-sm text-gray-500 text-center mt-2">
              {coverage ? `${coverage.covered_products}/${coverage.total_active_products} sản phẩm được gợi ý trong 30 ngày` : "—"}
            </p>
          </div>
        );
      case "ctr_chart":
        return ctrRows.length ? (
          <BarChart labels={ctrLabels} data={ctrRows.map((r) => +(r.ctr * 100).toFixed(2))} label="CTR (%)" horizontal />
        ) : null;
      case "cvr_chart":
        return ctrRows.length ? (
          <BarChart labels={ctrLabels} data={ctrRows.map((r) => +(r.cvr * 100).toFixed(2))} label="CVR (%)" horizontal />
        ) : null;
      case "entropy":
        return entropy.length ? (
          <LineChart
            labels={entropy.map((w) => String(w.yearweek))}
            datasets={[
              { label: "Được hiển thị", data: entropy.map((w) => w.entropy_shown), color: CATEGORICAL_COLORS[0] },
              { label: "Được click", data: entropy.map((w) => w.entropy_clicked), color: CATEGORICAL_COLORS[2] },
            ]}
          />
        ) : null;
      case "diversity":
        return diversity.length ? (
          <BarChart
            labels={diversity.map((d) => d.placement)}
            data={diversity.map((d) => +(d.diversity * 100).toFixed(1))}
            label="Diversity (%)"
            horizontal
          />
        ) : null;
      case "repeat":
        return repeatRows.length ? (
          <BarChart
            labels={repeatRows.map((r) => categoryName(r.category_id))}
            data={repeatRows.map((r) => +(r.rate * 100).toFixed(1))}
            label="Tỉ lệ lặp không click (%)"
            horizontal
          />
        ) : null;
      case "ab_config":
        return statPreview(
          report?.ab_cohorts?.ab_bandit_enabled ? `${report?.ab_cohorts?.ab_bandit_pct}% bandit-on` : "Đang tắt",
          report?.ab_cohorts?.ab_bandit_enabled
            ? `${100 - (report?.ab_cohorts?.ab_bandit_pct ?? 0)}% còn lại là nhóm đối chứng`
            : "Bật lại qua .env của recommendation-service"
        );
      default:
        return null;
    }
  };

  const preview = explain ? renderPreview(explainKey) : null;

  return (
    <div className="w-full">
      <div className="flex-1 p-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Gợi ý AI — đo lường</h1>
            <p className="text-xs text-gray-400">Bấm vào từng thẻ/biểu đồ để xem giải thích chỉ số và nhận xét từ dữ liệu hiện tại.</p>
          </div>
          <Select value={days} onChange={setDays} options={DAY_OPTIONS} style={{ width: 120 }} />
        </div>

        {error && <Alert type="warning" showIcon message={error} className="mb-4" />}

        {/* A/B cohort + coverage */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} lg={6}>
            <Card loading={loading} {...clickable("ctr_on")}>
              <h2 className="text-sm font-medium flex items-center justify-between gap-2">CTR cohort bandit-on {infoIcon}</h2>
              <p className="text-2xl font-bold">{pct(on?.ctr)}</p>
              <p className="text-xs text-gray-500">{on?.impressions?.toLocaleString("vi-VN") || 0} lượt hiển thị</p>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={loading} {...clickable("ctr_off")}>
              <h2 className="text-sm font-medium flex items-center justify-between gap-2">CTR cohort bandit-off {infoIcon}</h2>
              <p className="text-2xl font-bold">{pct(off?.ctr)}</p>
              <p className="text-xs text-gray-500">{off?.impressions?.toLocaleString("vi-VN") || 0} lượt hiển thị</p>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={loading} {...clickable("ctr_delta")}>
              <h2 className="text-sm font-medium flex items-center justify-between gap-2">Chênh lệch CTR on/off {infoIcon}</h2>
              <p className={`text-2xl font-bold ${ctrDelta > 0 ? "text-green-600" : ctrDelta < 0 ? "text-red-500" : ""}`}>
                {ctrDelta == null ? "—" : `${ctrDelta > 0 ? "+" : ""}${ctrDelta.toFixed(1)}%`}
              </p>
              <p className="text-xs text-gray-500">
                CVR: {pct(on?.cvr)} vs {pct(off?.cvr)}
              </p>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={loading} {...clickable("coverage")}>
              <h2 className="text-sm font-medium flex items-center justify-between gap-2">Độ phủ catalog (30 ngày) {infoIcon}</h2>
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
            <Card title="CTR theo vị trí × nguồn thuật toán" loading={loading} extra={infoHint} {...clickable("ctr_chart")}>
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
            <Card title="Tỉ lệ chuyển đổi (CVR) theo vị trí × nguồn" loading={loading} extra={infoHint} {...clickable("cvr_chart")}>
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
              extra={infoHint}
              {...clickable("entropy")}
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
              extra={infoHint}
              {...clickable("diversity")}
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
              extra={infoHint}
              {...clickable("repeat")}
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
            <Card title="Cấu hình A/B hiện tại" loading={loading} extra={infoHint} {...clickable("ab_config")}>
              <p>Bandit A/B: <b>{report?.ab_cohorts?.ab_bandit_enabled ? "đang bật" : "tắt"}</b></p>
              <p>Tỉ lệ cohort bandit-on: <b>{currentPct}%</b></p>
              <p className="text-xs text-gray-400 mt-2">
                Cohort chia deterministic theo CRC32(user_id/session_id) — đổi tỉ lệ ngay dưới đây,
                tự động lưu vào .env nên vẫn giữ nguyên qua các lần restart recommendation-service sau này.
              </p>

              {report?.ab_cohorts?.ab_bandit_enabled && (
                // stopPropagation vì cả Card cha đang mở modal giải thích khi click
                <div className="mt-3 pt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                  <p className="text-xs mb-2">
                    <b>Đề xuất:</b>{" "}
                    {pctSuggestion.action === "hold" ? (
                      <span className="text-gray-500">Giữ nguyên {currentPct}%</span>
                    ) : pctSuggestion.action === "increase" ? (
                      <span className="text-green-600">Tăng lên {pctSuggestion.suggestedPct}%</span>
                    ) : (
                      <span className="text-red-500">Giảm xuống {pctSuggestion.suggestedPct}%</span>
                    )}
                    {" — "}{pctSuggestion.reason}
                  </p>
                  <Slider
                    min={0}
                    max={100}
                    step={PCT_STEP}
                    marks={PCT_MARKS}
                    value={pctInput}
                    onChange={setPctInput}
                    disabled={applyingPct}
                    tooltip={{ formatter: (v) => `${v}%` }}
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm">
                      Giá trị đang chọn: <b>{pctInput}%</b>
                    </span>
                    <Button
                      size="small"
                      type="primary"
                      loading={applyingPct}
                      disabled={pctInput === currentPct}
                      onClick={applyPct}
                    >
                      Áp dụng
                    </Button>
                    {pctInput !== pctSuggestion.suggestedPct && (
                      <Button size="small" disabled={applyingPct} onClick={() => setPctInput(pctSuggestion.suggestedPct)}>
                        Dùng đề xuất
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        <Modal
          open={!!explain}
          onCancel={() => setExplainKey(null)}
          footer={null}
          width={760}
          title={
            explain && (
              <span className="flex items-center gap-2">
                <FaInfoCircle className="text-main" /> {explain.title}
              </span>
            )
          }
        >
          {explain && (
            // Chiều cao cố định, nội dung trượt bên trong; khối biểu đồ có thể ghim
            // (position: sticky) để vừa đọc giải thích vừa quan sát biểu đồ.
            <div className="overflow-y-auto pr-2" style={{ maxHeight: "68vh" }}>
              {preview && (
                <div className={`bg-white pb-3 mb-3 border-b border-gray-100 ${pinPreview ? "sticky top-0 z-10 shadow-sm" : ""}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Xem nhanh ({days} ngày)</span>
                    <Button
                      size="small"
                      type={pinPreview ? "primary" : "default"}
                      icon={pinPreview ? <TbPinnedOff /> : <TbPin />}
                      onClick={() => setPinPreview(!pinPreview)}
                    >
                      {pinPreview ? "Bỏ ghim" : "Ghim biểu đồ"}
                    </Button>
                  </div>
                  {/* Giới hạn bề rộng để chart (giữ aspect-ratio) không quá cao khi ghim */}
                  <div className="mx-auto" style={{ maxWidth: 620 }}>{preview}</div>
                </div>
              )}

              <div className="flex flex-col gap-4 text-sm">
                <div>
                  <h3 className="font-semibold mb-1">Thẻ này nói về gì?</h3>
                  <p className="text-gray-700">{explain.what}</p>
                </div>

                {explain.howToRead && (
                  <div>
                    <h3 className="font-semibold mb-1">Cách đọc</h3>
                    <p className="text-gray-700">{explain.howToRead}</p>
                  </div>
                )}

                {explain.insight && (
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      Tình trạng hiện tại ({days} ngày)
                      <Tag color={insightTag.color}>{insightTag.label}</Tag>
                    </h3>
                    <p className="text-gray-800 mb-2">{explain.insight.summary}</p>
                    {explain.insight.points?.length > 0 && (
                      <ul className="list-disc pl-5 text-gray-700 flex flex-col gap-1 mb-2">
                        {explain.insight.points.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    )}
                    {explain.insight.suggestion && (
                      <p className="text-gray-800">
                        <b>Gợi ý:</b> {explain.insight.suggestion}
                      </p>
                    )}
                  </div>
                )}

                {explain.terms?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-1">Thuật ngữ</h3>
                    <ul className="flex flex-col gap-1">
                      {explain.terms.map((t) => (
                        <li key={t.term} className="text-gray-700">
                          <b>{t.term}</b>: {t.def}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-xs text-gray-400">
                  Nhận xét được tính tự động từ số liệu đang hiển thị. Lưu ý: nếu DB còn dữ liệu seed thử
                  nghiệm thì kết luận phản ánh cả dữ liệu seed, chưa phải hành vi khách thật.
                </p>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default RecommendationMetrics;
