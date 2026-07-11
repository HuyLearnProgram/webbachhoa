// Nội dung popup giải thích cho từng thẻ/biểu đồ của trang "Gợi ý AI — đo lường".
// buildExplanation(key, ctx) trả về dữ liệu thuần (string), phần render nằm ở
// RecommendationMetrics.jsx. Phần "insight" được tính từ chính dữ liệu đang hiển thị
// để mô tả + kết luận tình trạng hiện tại (không hardcode nhận xét tĩnh).

export const PLACEMENT_LABELS = {
  HOME_PERSONALIZED: 'Gợi ý trang chủ ("Gợi ý dành cho bạn")',
  PDP_SIMILAR: 'Sản phẩm tương tự (trang chi tiết sản phẩm)',
  CART_SUGGESTION: 'Gợi ý trong giỏ hàng ("Có thể bạn cũng thích")',
};

export const SOURCE_LABELS = {
  CONTENT_BASED: "Content-based — sản phẩm có nội dung/giá tương tự",
  CO_PURCHASE: "Co-purchase — hay được mua cùng nhau",
  POPULARITY: "Popularity — bán chạy/đang thịnh hành",
  CF: "Collaborative Filtering — người có gu giống bạn cũng thích",
  BANDIT_EXPLORE: "Bandit explore — ô khám phá của LinUCB (thử danh mục lạ)",
  RULE_BASED_FALLBACK: "Fallback rule-based — Java tự trả khi Python service lỗi/timeout",
};

// Smart Search Phase C — nhãn tiếng Việt cho search_mode trong search_logs
export const SEARCH_MODE_LABELS = {
  SEMANTIC_HYBRID: "Semantic (AI hiểu nhu cầu)",
  TFIDF_HYBRID: "TF-IDF (degrade nhẹ)",
  LEXICAL_ONLY: "Chỉ khớp tên (encoder tắt)",
  LEXICAL_FALLBACK: "LIKE (Python lỗi, Java tự lo)",
  NO_MATCH: "Không có kết quả",
  LEGACY_LIKE: "Đường LIKE cũ (trước nâng cấp / FE fallback)",
};

const placementLabel = (p) => PLACEMENT_LABELS[p] || p;
const sourceLabel = (s) => SOURCE_LABELS[s] || s;
const pct = (v, digits = 2) => (v == null ? "—" : `${(v * 100).toFixed(digits)}%`);
const num = (v) => (v == null ? "—" : Number(v).toLocaleString("vi-VN"));

// Thuật ngữ dùng chung — mỗi popup chỉ nhúng những term liên quan.
const TERMS = {
  impression: {
    term: "Impression (lượt hiển thị)",
    def: "1 sản phẩm gợi ý thực sự lọt vào màn hình khách (đo bằng IntersectionObserver — cuộn tới mới tính, không tính render ngầm).",
  },
  ctr: {
    term: "CTR (Click-Through Rate)",
    def: "Tỉ lệ bấm = số lượt click ÷ số lượt hiển thị. CTR 4% nghĩa là cứ 100 lần sản phẩm gợi ý hiện ra thì có 4 lần khách bấm vào xem. CTR nền của hệ gợi ý này khoảng ~4%.",
  },
  cvr: {
    term: "CVR (Conversion Rate)",
    def: "Tỉ lệ chuyển đổi = số lượt dẫn tới đặt hàng ÷ số lượt hiển thị. Quy công theo kiểu last-touch: sản phẩm được đặt mua trong vòng 7 ngày sau khi hiển thị thì lượt hiển thị gần nhất được tính công. CVR luôn nhỏ hơn CTR nhiều — đó là bình thường.",
  },
  cohort: {
    term: "Cohort A/B",
    def: "Khách được chia cố định thành 2 nhóm bằng hash CRC32 của định danh (user_id khi đăng nhập, session_id khi vãng lai): nhóm bandit-on được bật ô khám phá LinUCB, nhóm bandit-off thì không — để so sánh công bằng bật bandit có tốt hơn thật không.",
  },
  bandit: {
    term: "Bandit / LinUCB",
    def: "Thuật toán khám phá-khai thác: dành 1-2 ô trong danh sách gợi ý cho sản phẩm thuộc danh mục khách CHƯA quen, để hệ thống học được sở thích mới thay vì chỉ lặp lại vùng an toàn (tránh 'bong bóng lọc'). Học gần như tức thời qua phần thưởng: click +0.2, đặt hàng +1.0, hiển thị 24h không bấm −0.05.",
  },
  placement: {
    term: "Placement (vị trí hiển thị)",
    def: "Nơi rail gợi ý xuất hiện: HOME_PERSONALIZED = trang chủ, PDP_SIMILAR = mục 'Sản phẩm tương tự' ở trang chi tiết, CART_SUGGESTION = gợi ý trong giỏ hàng.",
  },
  source: {
    term: "Nguồn thuật toán (algorithm source)",
    def: "Thuật toán nào đề cử sản phẩm đó: CONTENT_BASED (nội dung tương tự), CO_PURCHASE (hay mua cùng), POPULARITY (bán chạy), CF (lọc cộng tác — người giống bạn cũng thích), BANDIT_EXPLORE (ô khám phá), RULE_BASED_FALLBACK (Java tự trả khi Python lỗi).",
  },
  entropy: {
    term: "Entropy danh mục",
    def: "Đại lượng lý thuyết thông tin đo 'độ đa dạng': entropy 0 = mọi gợi ý dồn vào đúng 1 danh mục; entropy càng cao = trải đều trên nhiều danh mục. Ví dụ 3 danh mục đều nhau ⇒ entropy ≈ 1.58; 8 danh mục đều nhau ⇒ 3.0.",
  },
  diversity: {
    term: "Intra-list diversity",
    def: "Độ khác nhau giữa các sản phẩm TRONG CÙNG 1 lần gợi ý = 1 − độ tương tự cosine trung bình theo cặp (trên vector nội dung TF-IDF). 0% = cả danh sách gần như 1 sản phẩm nhân bản; 100% = mỗi sản phẩm một kiểu.",
  },
  coverage: {
    term: "Catalog coverage (độ phủ)",
    def: "Tỉ lệ % sản phẩm đang bán (active) có ít nhất 1 lượt hiển thị gợi ý trong 30 ngày. Coverage thấp = mô hình chỉ xoay quanh vài chục sản phẩm quen thuộc, phần còn lại của kho hàng không bao giờ được giới thiệu.",
  },
  fatigue: {
    term: "Fatigue decay (chống nhàm chán)",
    def: "Nếu 1 danh mục đã hiển thị nhiều lần trong 14 ngày mà khách không bấm, điểm của danh mục đó bị hạ dần ở các lần gợi ý sau — phá vòng lặp 'cứ hiện hoài vài loại sản phẩm quen'.",
  },
  mmr: {
    term: "MMR (Maximal Marginal Relevance)",
    def: "Cơ chế xếp lại danh sách để vừa liên quan vừa không trùng lặp nhau trong CÙNG 1 lần hiển thị (khác fatigue — fatigue nhớ xuyên nhiều lần hiển thị).",
  },
  slate: {
    term: "Slate",
    def: "1 danh sách gợi ý trả về trong 1 lần (VD 12 sản phẩm ở trang chủ) — các chỉ số 'trong slate' so sánh các sản phẩm cùng 1 lần trả về này.",
  },
  searchMode: {
    term: "Search mode",
    def: "Đường xử lý mà 1 lượt tìm kiếm thực sự đi qua: SEMANTIC_HYBRID = xếp hạng AI đầy đủ (embedding + khớp tên + cá nhân hoá); TFIDF/LEXICAL_ONLY = Python tự hạ bậc; LEXICAL_FALLBACK = Python lỗi, Java trả LIKE như trước nâng cấp; NO_MATCH = không có gì khớp; LEGACY_LIKE = bản ghi không có mode (trước nâng cấp hoặc FE fallback).",
  },
  zeroResult: {
    term: "Zero-result rate",
    def: "Tỉ lệ lượt tìm trả về 0 sản phẩm. Danh sách từ khoá 0 kết quả là 'mỏ vàng' vận hành: cho biết khách đang muốn thứ cửa hàng chưa bán hoặc đặt tên chưa khớp cách khách gọi.",
  },
  rescue: {
    term: "Semantic rescue",
    def: "Lượt tìm mà LIKE theo tên KHÔNG khớp gì (trước nâng cấp sẽ trả 0 kết quả) nhưng nhánh semantic vẫn tìm ra sản phẩm phù hợp — đo trực tiếp giá trị cộng thêm của Smart Search.",
  },
  clickedPosition: {
    term: "Vị trí click trung bình",
    def: "Sản phẩm được khách click nằm ở vị trí thứ mấy trong kết quả (tính cả phân trang, 1 = đầu trang nhất). Càng nhỏ càng tốt — xếp hạng đưa đúng thứ khách cần lên đầu.",
  },
};

// Ngưỡng cỡ mẫu tối thiểu để coi số liệu là đáng tin khi so sánh/xếp hạng.
const MIN_IMPRESSIONS = 300;

const sampleCaveat = (imp) =>
  imp != null && imp < MIN_IMPRESSIONS
    ? `Cỡ mẫu còn nhỏ (${num(imp)} lượt hiển thị < ${MIN_IMPRESSIONS}) — số liệu dao động mạnh, chưa nên rút kết luận chắc chắn.`
    : null;

const cohortInsight = (label, c, days) => {
  if (!c) {
    return {
      status: "nodata",
      summary: `Chưa có dữ liệu cho nhóm ${label} trong ${days} ngày qua.`,
      points: [],
      suggestion: "Đợi hệ thống tích luỹ thêm lượt hiển thị, hoặc kiểm tra recommendation-service có đang chạy không.",
    };
  }
  const points = [
    `${num(c.impressions)} lượt hiển thị, ${num(c.clicks)} lượt click → CTR ${pct(c.ctr)}.`,
    `${num(c.conversions)} lượt quy được về đơn hàng → CVR ${pct(c.cvr)}.`,
  ];
  const caveat = sampleCaveat(c.impressions);
  if (caveat) points.push(caveat);
  const vsBase =
    c.ctr >= 0.05
      ? "CTR đang cao hơn mức nền ~4% của hệ thống."
      : c.ctr >= 0.03
      ? "CTR quanh mức nền ~4% của hệ thống — bình thường."
      : "CTR đang thấp hơn mức nền ~4% — gợi ý chưa đủ hấp dẫn với nhóm này.";
  return {
    status: caveat ? "neutral" : c.ctr >= 0.03 ? "good" : "warn",
    summary: `Nhóm ${label}: cứ 100 sản phẩm gợi ý hiện ra thì có ~${(c.ctr * 100).toFixed(1)} lần được bấm vào xem. ${vsBase}`,
    points,
    suggestion:
      "Đừng đọc thẻ này một mình — hãy so với thẻ nhóm còn lại và thẻ 'Chênh lệch CTR on/off' để biết bandit có đang tạo khác biệt không.",
  };
};

// Ngưỡng coi chênh lệch CTR/CVR là "đủ mạnh" để đề xuất đổi AB_BANDIT_PCT — không có công thức
// chuẩn tuyệt đối cho việc này, đây là lựa chọn thận trọng: ưu tiên KHÔNG đổi khi tín hiệu mơ hồ
// hoặc trái chiều (như trường hợp CTR tăng nhưng CVR giảm — xem nhánh "decrease" bên dưới),
// chỉ đề xuất tăng khi cả CTR lẫn CVR đều không xấu đi.
const AB_MIN_IMPRESSIONS = 300; // mỗi cohort cần tối thiểu bấy nhiêu lượt hiển thị mới tin số liệu
const AB_CTR_STRONG_PCT = 5; // % chênh lệch CTR tương đối được coi là "rõ rệt"
const AB_CVR_BAD_PCT = -10; // % chênh lệch CVR tương đối được coi là "đáng lo" dù CTR có tốt
const AB_STEP = 20; // mỗi lần đề xuất tăng/giảm bao nhiêu điểm %, kiểu rollout tăng dần
// Sau khi admin áp dụng 1 thay đổi, KHÔNG đề xuất đổi tiếp ngay — bandit cần thời gian tích luỹ
// phần thưởng mới rồi CTR/CVR mới phản ánh đúng tỉ lệ mới. Trong lúc chờ, thẻ chỉ hiện thời gian
// còn lại, không tính toán CTR/CVR delta (số liệu lúc này vẫn còn lẫn hành vi từ tỉ lệ cũ).
const AB_SUGGEST_COOLDOWN_DAYS = 14;

// Tính tỉ lệ AB_BANDIT_PCT nên đổi thành bao nhiêu, dựa trên đúng 2 cohort đang hiển thị trên
// dashboard. Trả { action, suggestedPct, reason } — dùng chung cho cả card "Cấu hình A/B" và
// phần giải thích ctr_delta để 2 nơi không bao giờ nói ngược nhau.
export const suggestAbPct = (on, off, currentPct, appliedAt) => {
  if (appliedAt) {
    const daysSince = (Date.now() - new Date(appliedAt).getTime()) / 86400000;
    if (daysSince >= 0 && daysSince < AB_SUGGEST_COOLDOWN_DAYS) {
      const daysLeft = Math.ceil(AB_SUGGEST_COOLDOWN_DAYS - daysSince);
      return {
        action: "hold",
        suggestedPct: currentPct,
        cooldown: true,
        reason:
          daysSince < 1
            ? `Tỉ lệ vừa được đổi chưa đầy 1 ngày trước — cần đợi thêm khoảng ${daysLeft} ngày để bandit tích luỹ đủ dữ liệu mới trước khi đề xuất lại.`
            : `Tỉ lệ vừa được đổi ${Math.floor(daysSince)} ngày trước — cần đợi thêm khoảng ${daysLeft} ngày để bandit tích luỹ đủ dữ liệu mới trước khi đề xuất lại.`,
      };
    }
  }
  if (!on || !off) {
    return { action: "hold", suggestedPct: currentPct, reason: "Thiếu dữ liệu ở 1 trong 2 nhóm — chưa thể đề xuất." };
  }
  if (on.impressions < AB_MIN_IMPRESSIONS || off.impressions < AB_MIN_IMPRESSIONS) {
    return {
      action: "hold",
      suggestedPct: currentPct,
      reason: `Cỡ mẫu còn nhỏ (cần ≥ ${AB_MIN_IMPRESSIONS} lượt hiển thị mỗi nhóm) — số liệu dao động mạnh, chưa nên đổi tỉ lệ.`,
    };
  }
  const ctrDelta = off.ctr > 0 ? ((on.ctr - off.ctr) / off.ctr) * 100 : 0;
  const cvrDelta = off.cvr > 0 ? ((on.cvr - off.cvr) / off.cvr) * 100 : 0;

  // Ưu tiên kiểm tra CVR xấu trước CTR tốt: CTR tăng nhưng CVR giảm mạnh nghĩa là khách tò mò
  // bấm nhiều hơn nhưng không mua nhiều hơn — không nên nhân rộng hành vi đó ra thêm khách.
  if (ctrDelta <= -AB_CTR_STRONG_PCT || cvrDelta <= AB_CVR_BAD_PCT) {
    return {
      action: "decrease",
      suggestedPct: Math.max(0, currentPct - AB_STEP),
      reason:
        cvrDelta <= AB_CVR_BAD_PCT
          ? `CVR nhóm bandit-on thấp hơn nhóm đối chứng ${Math.abs(cvrDelta).toFixed(1)}%${ctrDelta > 0 ? " (dù CTR có cao hơn)" : ""} — dấu hiệu "bấm nhiều nhưng không mua", nên thu hẹp lại.`
          : `CTR nhóm bandit-on thấp hơn nhóm đối chứng ${Math.abs(ctrDelta).toFixed(1)}% — ô khám phá đang làm giảm hiệu quả tổng thể.`,
    };
  }
  if (ctrDelta >= AB_CTR_STRONG_PCT && cvrDelta >= 0) {
    return {
      action: "increase",
      suggestedPct: Math.min(100, currentPct + AB_STEP),
      reason: `CTR bandit-on cao hơn ${ctrDelta.toFixed(1)}% và CVR không kém hơn nhóm đối chứng — tín hiệu đủ nhất quán để mở rộng dần cho nhiều khách hơn.`,
    };
  }
  return {
    action: "hold",
    suggestedPct: currentPct,
    reason: "Chênh lệch CTR/CVR chưa đủ rõ hoặc còn trái chiều — giữ nguyên tỉ lệ, quan sát thêm vài tuần trước khi đổi.",
  };
};

export const buildExplanation = (key, ctx) => {
  const { report, on, off, ctrDelta, coverage, entropy, diversity, repeatRows, ctrRows, categoryName, days } = ctx;

  switch (key) {
    case "ctr_on":
      return {
        title: "CTR cohort bandit-on",
        what: `Tỉ lệ bấm (CTR) của NHÓM KHÁCH ĐƯỢC BẬT ô khám phá bandit, tính trên toàn bộ lượt hiển thị gợi ý của nhóm này trong ${days} ngày qua. Đây là nửa "thí nghiệm" của phép thử A/B — nhóm này thỉnh thoảng được chèn 1-2 sản phẩm thuộc danh mục lạ để hệ thống học sở thích mới.`,
        howToRead: "Số to là CTR; dòng nhỏ bên dưới là tổng lượt hiển thị (cỡ mẫu). Cỡ mẫu càng lớn, CTR càng đáng tin.",
        terms: [TERMS.ctr, TERMS.impression, TERMS.cohort, TERMS.bandit],
        insight: cohortInsight("bandit-on", on, days),
      };

    case "ctr_off":
      return {
        title: "CTR cohort bandit-off",
        what: `Tỉ lệ bấm (CTR) của NHÓM ĐỐI CHỨNG — khách KHÔNG được chèn ô khám phá, chỉ nhận gợi ý từ các nguồn "an toàn" (content-based, mua cùng, bán chạy, CF) trong ${days} ngày qua. Nhóm này là mốc chuẩn để biết bandit có thật sự cải thiện gì không.`,
        howToRead: "Số to là CTR; dòng nhỏ bên dưới là tổng lượt hiển thị (cỡ mẫu). So sánh trực tiếp với thẻ bandit-on bên cạnh.",
        terms: [TERMS.ctr, TERMS.impression, TERMS.cohort],
        insight: cohortInsight("bandit-off (đối chứng)", off, days),
      };

    case "ctr_delta": {
      let insight;
      if (ctrDelta == null || !on || !off) {
        insight = {
          status: "nodata",
          summary: "Chưa đủ dữ liệu ở 1 trong 2 nhóm để tính chênh lệch.",
          points: [],
          suggestion: "Đợi cả 2 nhóm tích luỹ đủ lượt hiển thị.",
        };
      } else {
        const caveats = [sampleCaveat(on.impressions), sampleCaveat(off.impressions)].filter(Boolean);
        const cvrDelta = off.cvr > 0 ? ((on.cvr - off.cvr) / off.cvr) * 100 : 0;
        const points = [
          `CTR: bandit-on ${pct(on.ctr)} vs bandit-off ${pct(off.ctr)} → chênh ${ctrDelta > 0 ? "+" : ""}${ctrDelta.toFixed(1)}%.`,
          `CVR: bandit-on ${pct(on.cvr)} vs bandit-off ${pct(off.cvr)} → chênh ${cvrDelta > 0 ? "+" : ""}${cvrDelta.toFixed(1)}%.`,
          ...caveats,
        ];
        const suggested = suggestAbPct(on, off, report?.ab_cohorts?.ab_bandit_pct ?? 50, report?.ab_cohorts?.ab_pct_applied_at);
        if (Math.abs(ctrDelta) < 5 && Math.abs(cvrDelta) < 10) {
          insight = {
            status: "neutral",
            summary: `Chênh lệch CTR ${ctrDelta.toFixed(1)}% và CVR ${cvrDelta.toFixed(1)}% đều còn nhỏ — 2 nhóm hiện chưa khác biệt rõ rệt.`,
            points,
            suggestion:
              "Bình thường ở giai đoạn đầu: bandit cần thời gian tích luỹ phần thưởng để học. Tiếp tục quan sát theo tuần; chỉ kết luận khi chênh lệch giữ ổn định cùng dấu qua nhiều tuần với cỡ mẫu lớn.",
          };
        } else if (ctrDelta > 0 && cvrDelta < AB_CVR_BAD_PCT) {
          // CTR tăng nhưng CVR giảm mạnh — tín hiệu trái chiều, KHÔNG được kết luận "tốt" chỉ vì CTR đẹp.
          insight = {
            status: "warn",
            summary: `CTR cao hơn ${ctrDelta.toFixed(1)}% nhưng CVR lại thấp hơn ${Math.abs(cvrDelta).toFixed(1)}% — khách bấm vào ô khám phá nhiều hơn nhưng KHÔNG mua nhiều hơn, đây là tín hiệu trái chiều chứ chưa hẳn là bandit đang tốt.`,
            points,
            suggestion: suggested.reason,
          };
        } else if (ctrDelta > 0) {
          insight = {
            status: "good",
            summary: `Nhóm được bật bandit đang có CTR cao hơn ${ctrDelta.toFixed(1)}% và CVR không kém hơn nhóm đối chứng — dấu hiệu ô khám phá đang chọn trúng danh mục khách quan tâm.`,
            points,
            suggestion: suggested.reason,
          };
        } else {
          insight = {
            status: "warn",
            summary: `Nhóm bật bandit đang KÉM hơn ${Math.abs(ctrDelta).toFixed(1)}% — chi phí khám phá (chèn sản phẩm lạ, khách ít bấm) đang lớn hơn lợi ích học được.`,
            points,
            suggestion: suggested.reason,
          };
        }
      }
      return {
        title: "Chênh lệch CTR on/off",
        what: "Thước đo QUAN TRỌNG NHẤT của phép thử A/B: CTR nhóm bandit-on cao/thấp hơn nhóm đối chứng bao nhiêu phần trăm (tương đối). Đây là con số trả lời câu hỏi 'bật bandit có đáng không'.",
        howToRead:
          "Công thức: (CTR_on − CTR_off) ÷ CTR_off × 100. Màu xanh = bandit tốt hơn, đỏ = kém hơn. Dòng nhỏ so sánh thêm CVR 2 nhóm — CTR tăng nhưng CVR giảm nghĩa là khách tò mò bấm xem nhưng không mua.",
        terms: [TERMS.ctr, TERMS.cvr, TERMS.cohort, TERMS.bandit],
        insight,
      };
    }

    case "coverage": {
      let insight;
      if (!coverage) {
        insight = { status: "nodata", summary: "Chưa có dữ liệu độ phủ.", points: [], suggestion: "" };
      } else {
        const c = coverage.coverage;
        const points = [
          `${num(coverage.covered_products)}/${num(coverage.total_active_products)} sản phẩm đang bán đã được gợi ý ít nhất 1 lần trong 30 ngày.`,
          `${num(coverage.total_active_products - coverage.covered_products)} sản phẩm chưa từng xuất hiện trong bất kỳ rail gợi ý nào.`,
        ];
        if (c >= 0.6) {
          insight = {
            status: "good",
            summary: `Độ phủ ${pct(c, 0)} — phần lớn kho hàng đều có cơ hội được giới thiệu, mô hình không bị kẹt trong nhóm nhỏ sản phẩm quen.`,
            points,
            suggestion: "Duy trì quan sát; nếu tụt dần theo thời gian là dấu hiệu mô hình bắt đầu hội tụ quá hẹp.",
          };
        } else if (c >= 0.3) {
          insight = {
            status: "neutral",
            summary: `Độ phủ ${pct(c, 0)} — mức trung bình: một phần đáng kể kho hàng vẫn chưa bao giờ được gợi ý.`,
            points,
            suggestion:
              "Ô khám phá bandit và MMR chính là 2 cơ chế kéo coverage lên — theo dõi xem chỉ số này có tăng dần sau khi bandit chạy đủ lâu không.",
          };
        } else {
          insight = {
            status: "warn",
            summary: `Độ phủ chỉ ${pct(c, 0)} — mô hình đang lặp đi lặp lại một nhóm nhỏ sản phẩm, phần lớn kho hàng vô hình với khách.`,
            points,
            suggestion:
              "Kiểm tra: sản phẩm không được phủ có phải do hết hàng/không active? Nếu không, cân nhắc tăng số ô explore của bandit hoặc hạ λ của MMR để ép đa dạng mạnh hơn.",
          };
        }
      }
      return {
        title: "Độ phủ catalog (30 ngày)",
        what: "Bao nhiêu % sản phẩm đang bán (active, còn hàng) có ít nhất 1 lượt hiển thị gợi ý trong 30 ngày gần nhất — chỉ số chống việc mô hình chỉ xoay vòng vài chục sản phẩm quen thuộc và bỏ quên phần còn lại của kho.",
        howToRead: "Thanh tiến độ = % độ phủ. Lưu ý: thẻ này luôn tính cửa sổ 30 ngày cố định, KHÔNG đổi theo bộ lọc số ngày ở góc phải.",
        terms: [TERMS.coverage, TERMS.impression],
        insight,
      };
    }

    case "ctr_chart":
    case "cvr_chart": {
      const isCtr = key === "ctr_chart";
      const metric = isCtr ? "ctr" : "cvr";
      const metricName = isCtr ? "CTR" : "CVR";
      let insight;
      if (!ctrRows.length) {
        insight = { status: "nodata", summary: "Chưa có dữ liệu.", points: [], suggestion: "" };
      } else {
        const reliable = ctrRows.filter((r) => r.impressions >= 50);
        const ranked = [...(reliable.length ? reliable : ctrRows)].sort((a, b) => b[metric] - a[metric]);
        const best = ranked[0];
        const worst = ranked[ranked.length - 1];
        const totalImp = ctrRows.reduce((s, r) => s + r.impressions, 0);
        const fallbackImp = ctrRows.filter((r) => r.algorithm_source === "RULE_BASED_FALLBACK").reduce((s, r) => s + r.impressions, 0);
        const points = [
          `Hiệu quả nhất: ${placementLabel(best.placement)} × ${sourceLabel(best.algorithm_source)} — ${metricName} ${pct(best[metric])} (${num(best.impressions)} lượt hiển thị).`,
        ];
        if (worst !== best)
          points.push(
            `Kém nhất: ${placementLabel(worst.placement)} × ${sourceLabel(worst.algorithm_source)} — ${metricName} ${pct(worst[metric])} (${num(worst.impressions)} lượt hiển thị).`
          );
        if (ctrRows.some((r) => r.algorithm_source === "BANDIT_EXPLORE"))
          points.push(
            `${metricName} của BANDIT_EXPLORE thấp hơn các nguồn khác là BÌNH THƯỜNG — đó là ô thử danh mục lạ, mục đích là học chứ không phải tối đa ${metricName} tức thời.`
          );
        if (!reliable.length) points.push("Tất cả các dòng đều dưới 50 lượt hiển thị — xếp hạng trên chỉ mang tính tham khảo.");
        let suggestion = `Nguồn nào ${metricName} cao và ổn định qua nhiều tuần xứng đáng được tăng trọng số blend cho placement đó; nguồn thấp kéo dài thì giảm.`;
        let status = "neutral";
        if (totalImp && fallbackImp / totalImp > 0.2) {
          status = "warn";
          points.push(
            `⚠ RULE_BASED_FALLBACK chiếm ${pct(fallbackImp / totalImp, 0)} tổng lượt hiển thị — Python service có vẻ hay bị lỗi/timeout, kiểm tra uvicorn :8000.`
          );
          suggestion = "Ưu tiên xử lý tỉ lệ fallback cao trước — khi fallback chiếm nhiều, mọi so sánh giữa các nguồn AI đều méo.";
        }
        insight = {
          status,
          summary: isCtr
            ? `Trong ${days} ngày: tổng ${num(totalImp)} lượt hiển thị trên ${ctrRows.length} tổ hợp vị trí×nguồn; chênh lệch CTR giữa tổ hợp tốt nhất và kém nhất là ${pct(best[metric])} vs ${pct(worst[metric])}.`
            : `Trong ${days} ngày: CVR cao nhất ${pct(best[metric])} và thấp nhất ${pct(worst[metric])}. CVR nhỏ hơn CTR rất nhiều là bình thường — bấm xem thì dễ, xuống tiền mới khó.`,
          points,
          suggestion,
        };
      }
      return {
        title: isCtr ? "CTR theo vị trí × nguồn thuật toán" : "Tỉ lệ chuyển đổi (CVR) theo vị trí × nguồn",
        what: isCtr
          ? "So sánh tỉ lệ bấm của TỪNG thuật toán tại TỪNG vị trí hiển thị — trả lời câu hỏi 'thuật toán nào đang thuyết phục khách bấm tốt nhất, ở đâu'. Mỗi thanh là 1 tổ hợp vị trí × nguồn."
          : "Giống biểu đồ CTR bên cạnh nhưng đo tới tận ĐƠN HÀNG: bao nhiêu % lượt hiển thị dẫn tới việc khách đặt mua sản phẩm đó trong vòng 7 ngày (quy công last-touch). Đây là thước đo giá trị kinh doanh thật, còn CTR chỉ đo sự chú ý.",
        howToRead: `Trục dọc: "vị trí · nguồn" (VD "HOME_PERSONALIZED · CF" = nguồn lọc cộng tác tại trang chủ). Trục ngang: ${metricName} (%). Thanh càng dài càng tốt — nhưng phải nhìn kèm cỡ mẫu: thanh dài trên vài chục lượt hiển thị không đáng tin bằng thanh ngắn hơn trên hàng nghìn lượt.`,
        terms: isCtr ? [TERMS.ctr, TERMS.placement, TERMS.source, TERMS.impression] : [TERMS.cvr, TERMS.ctr, TERMS.placement, TERMS.source],
        insight,
      };
    }

    case "entropy": {
      let insight;
      if (entropy.length < 2) {
        insight = {
          status: "nodata",
          summary: entropy.length === 1 ? "Mới có 1 tuần dữ liệu — chưa vẽ được xu hướng." : "Chưa có dữ liệu.",
          points: [],
          suggestion: "Cần ít nhất 2 tuần để so xu hướng tăng/giảm.",
        };
      } else {
        const first = entropy[0];
        const last = entropy[entropy.length - 1];
        const dShown = last.entropy_shown - first.entropy_shown;
        const dClicked = last.entropy_clicked - first.entropy_clicked;
        const gap = last.entropy_shown - last.entropy_clicked;
        const points = [
          `Đường "Được hiển thị": ${first.entropy_shown} (tuần ${first.yearweek}) → ${last.entropy_shown} (tuần ${last.yearweek}) — ${dShown > 0.05 ? "đang tăng, hệ thống cho khách xem đa dạng danh mục hơn" : dShown < -0.05 ? "đang giảm, gợi ý đang co hẹp về ít danh mục hơn" : "gần như đi ngang"}.`,
          `Đường "Được click": ${first.entropy_clicked} → ${last.entropy_clicked} — ${dClicked > 0.05 ? "khách đang bấm vào NHIỀU danh mục hơn trước: đa dạng hoá thực sự chạm tới hành vi, không chỉ nằm trên màn hình" : dClicked < -0.05 ? "khách đang bấm co cụm vào ít danh mục hơn" : "gần như đi ngang"}.`,
          `Khoảng cách hiển thị − click tuần gần nhất: ${gap.toFixed(2)} — ${gap > 1 ? "khá lớn: hệ thống cho xem rất đa dạng nhưng khách chỉ bấm quanh nhóm hẹp (bình thường ở giai đoạn đầu, bandit sinh ra để thu hẹp dần khoảng này)" : "nhỏ: những gì được cho xem và những gì được bấm khá khớp nhau"}.`,
        ];
        insight = {
          status: dClicked > 0.05 ? "good" : dShown < -0.05 ? "warn" : "neutral",
          summary:
            dClicked > 0.05
              ? "Tín hiệu tốt nhất có thể có ở biểu đồ này: entropy CLICK tăng — khách thật sự mở rộng vùng quan tâm."
              : "Đa dạng hoá phía hiển thị đang " +
                (dShown > 0.05 ? "tăng" : dShown < -0.05 ? "giảm" : "ổn định") +
                ", nhưng hành vi click của khách chưa mở rộng rõ rệt.",
          points,
          suggestion:
            "Chỉ số cần dõi theo TUẦN, không theo ngày. Kỳ vọng đúng: cả 2 đường tăng dần và tiến lại gần nhau. Nếu đường hiển thị giảm liên tục → kiểm tra MMR/fatigue có đang bị vô hiệu không.",
        };
      }
      return {
        title: "Entropy danh mục theo tuần (hiển thị vs click)",
        what: "Theo dõi độ ĐA DẠNG danh mục theo thời gian, ở 2 phía: những gì hệ thống cho khách XEM (đường 1) và những gì khách thật sự BẤM vào (đường 2). Đây là thước đo trực tiếp của mục tiêu 'chống nhàm chán, không lặp mãi vài category'.",
        howToRead:
          "Trục ngang: tuần (định dạng năm+tuần, VD 202628 = tuần 28 năm 2026). Trục dọc: entropy (không có đơn vị; 0 = dồn hết 1 danh mục, càng cao càng trải đều). Muốn thấy: cả 2 đường TĂNG dần theo tuần, và đường click đuổi kịp đường hiển thị.",
        terms: [TERMS.entropy, TERMS.fatigue, TERMS.mmr],
        insight,
      };
    }

    case "diversity": {
      let insight;
      if (!diversity.length) {
        insight = { status: "nodata", summary: "Chưa có dữ liệu.", points: [], suggestion: "" };
      } else {
        const ranked = [...diversity].sort((a, b) => a.diversity - b.diversity);
        const lowest = ranked[0];
        const highest = ranked[ranked.length - 1];
        const points = diversity.map(
          (d) => `${placementLabel(d.placement)}: ${pct(d.diversity, 1)} (trung bình trên ${num(d.slates)} slate).`
        );
        points.push(
          "Lưu ý ngữ cảnh: PDP_SIMILAR vốn dĩ CẦN kém đa dạng hơn (nhiệm vụ của nó là 'tương tự sản phẩm đang xem'), nên đừng so ngang nó với trang chủ."
        );
        insight = {
          status: lowest.diversity < 0.3 && lowest.placement !== "PDP_SIMILAR" ? "warn" : "good",
          summary: `Đa dạng nhất: ${placementLabel(highest.placement)} (${pct(highest.diversity, 1)}); ít đa dạng nhất: ${placementLabel(lowest.placement)} (${pct(lowest.diversity, 1)}).`,
          points,
          suggestion:
            lowest.diversity < 0.3 && lowest.placement !== "PDP_SIMILAR"
              ? `${placementLabel(lowest.placement)} dưới 30% — các sản phẩm trong cùng 1 lần gợi ý đang khá giống nhau. Cân nhắc hạ λ của MMR (ép đa dạng mạnh hơn); nếu vẫn không cải thiện, roadmap đã ghi sẵn phương án thay MMR bằng DPP.`
              : "Mức hiện tại ổn. Nếu chỉ số này tụt dần theo thời gian ở trang chủ/giỏ hàng thì mới cần can thiệp (hạ λ MMR).",
        };
      }
      return {
        title: "Đa dạng trong slate (intra-list diversity)",
        what: "Đo các sản phẩm TRONG CÙNG 1 lần gợi ý khác nhau đến mức nào về nội dung — chống tình huống '12 ô gợi ý đều là 12 loại gạo'. Tính bằng 1 − độ tương tự cosine trung bình giữa mọi cặp sản phẩm trong slate (trên vector TF-IDF), lấy trung bình theo từng vị trí hiển thị.",
        howToRead:
          "Mỗi thanh là 1 vị trí hiển thị. 0% = cả danh sách gần như trùng nhau; 100% = mỗi sản phẩm một kiểu hoàn toàn. Khác biểu đồ entropy: entropy đo đa dạng XUYÊN nhiều lần hiển thị theo tuần, còn thẻ này đo đa dạng BÊN TRONG từng lần một.",
        terms: [TERMS.diversity, TERMS.slate, TERMS.mmr, TERMS.placement],
        insight,
      };
    }

    case "repeat": {
      let insight;
      if (!repeatRows.length) {
        insight = { status: "nodata", summary: "Chưa có dữ liệu.", points: [], suggestion: "" };
      } else {
        const ranked = [...repeatRows].sort((a, b) => b.rate - a.rate);
        const worst = ranked[0];
        const avg = repeatRows.reduce((s, r) => s + r.rate, 0) / repeatRows.length;
        const points = [
          `Trung bình toàn bộ danh mục: ${pct(avg, 1)}.`,
          `Cao nhất: "${categoryName(worst.category_id)}" — ${pct(worst.rate, 1)} trên ${num(worst.impressions)} lượt hiển thị: danh mục này đang bị đẩy lặp lại cho cùng 1 khách nhiều nhất mà không được đáp lại.`,
        ];
        if (ranked.length > 1) {
          const bestRow = ranked[ranked.length - 1];
          points.push(`Thấp nhất: "${categoryName(bestRow.category_id)}" — ${pct(bestRow.rate, 1)}.`);
        }
        insight = {
          status: worst.rate > 0.4 ? "warn" : avg > 0.25 ? "neutral" : "good",
          summary:
            worst.rate > 0.4
              ? `Danh mục "${categoryName(worst.category_id)}" có tới ${pct(worst.rate, 1)} lượt hiển thị là lặp lại vô ích — fatigue decay chưa ghìm được danh mục này.`
              : `Mức lặp vô ích trung bình ${pct(avg, 1)} — trong tầm kiểm soát.`,
          points,
          suggestion:
            "Đây là chỉ số ĐO NGƯỢC hiệu quả của fatigue decay: nếu cơ chế chống nhàm chán hoạt động, các thanh này phải NGẮN DẦN qua các lần xem (so sánh giữa các khoảng 30/60/90 ngày). Nếu 1 danh mục cao mãi không giảm: kiểm tra danh mục đó có đang được boost quá tay ở tầng blend, hoặc tăng hệ số phạt fatigue.",
        };
      }
      return {
        title: "Hiển thị lặp lại không click theo danh mục",
        what: "Trong các lần 1 sản phẩm bị hiển thị LẶP LẠI cho CÙNG 1 khách (lần thứ 2 trở đi), bao nhiêu % vẫn không được bấm — tức là 'cho xem lại mà khách vẫn làm ngơ'. Chỉ số này tồn tại để kiểm chứng cơ chế chống nhàm chán (fatigue decay) có thật sự hoạt động không.",
        howToRead:
          "Mỗi thanh 1 danh mục, càng NGẮN càng tốt (ngược với đa số biểu đồ khác trong trang). Thanh dài = danh mục đó đang bị hệ thống 'ép' xem lại nhiều lần một cách vô ích.",
        terms: [TERMS.fatigue, TERMS.impression, TERMS.mmr],
        insight,
      };
    }

    case "ab_config": {
      const enabled = report?.ab_cohorts?.ab_bandit_enabled;
      const pctOn = report?.ab_cohorts?.ab_bandit_pct;
      const suggested = enabled ? suggestAbPct(on, off, pctOn, report?.ab_cohorts?.ab_pct_applied_at) : null;
      return {
        title: "Cấu hình A/B hiện tại",
        what: "Trạng thái công tắc của phép thử A/B bandit: có đang bật không, và bao nhiêu % khách rơi vào nhóm bandit-on. Việc chia nhóm dùng hash CRC32 trên định danh khách nên cùng 1 khách LUÔN rơi vào cùng 1 nhóm (deterministic) — không cần lưu thêm cột nào trong DB.",
        howToRead:
          "Dùng Slider + nút 'Áp dụng' ngay trên thẻ này để đổi tỉ lệ (0 = tắt hẳn thí nghiệm, 100 = mọi khách đều bật bandit) — có hiệu lực ngay VÀ được ghi lại vào .env của recommendation-service nên vẫn giữ nguyên qua các lần restart sau này (không cần sửa .env thủ công). BANDIT_ENABLED=false trong .env là kill-switch tắt toàn bộ, vẫn phải sửa tay + restart. Sau mỗi lần áp dụng, dashboard tạm ngưng đề xuất đổi tiếp trong 14 ngày để bandit có đủ thời gian tích luỹ dữ liệu mới. Hạn chế đã biết: khách vãng lai đăng nhập xong bị chia lại nhóm theo hash mới (~50% khả năng đổi nhóm) — nhiễu nhỏ, chấp nhận được.",
        terms: [TERMS.cohort, TERMS.bandit],
        insight: {
          status: enabled ? (suggested?.action === "hold" ? "neutral" : suggested?.action === "increase" ? "good" : "warn") : "warn",
          summary: enabled
            ? `Thí nghiệm đang chạy: ${pctOn}% khách thuộc nhóm bandit-on, ${100 - pctOn}% là nhóm đối chứng.`
            : "Bandit A/B đang TẮT — các thẻ so sánh cohort phía trên chỉ phản ánh dữ liệu lịch sử từ lúc còn bật.",
          points: [],
          suggestion: enabled
            ? suggested.reason +
              (suggested.action !== "hold" ? ` (đề xuất: ${suggested.suggestedPct}%, hiện tại ${pctOn}%)` : "")
            : "Nếu muốn tiếp tục đánh giá bandit, bật lại qua .env rồi restart recommendation-service.",
        },
      };
    }

    // ===== Smart Search Phase C — section "Chất lượng tìm kiếm" (nguồn: search_logs, thuần Java) =====

    case "search_volume": {
      const sr = ctx.searchReport;
      const total = sr?.totalSearches ?? 0;
      const zeroRate = sr?.zeroResultRate;
      return {
        title: "Lượt tìm kiếm & tỉ lệ 0 kết quả",
        what: `Tổng số lượt tìm kiếm trong ${days} ngày qua và tỉ lệ lượt tìm không ra sản phẩm nào. Nguồn số liệu là bảng search_logs phía Java — vẫn sống kể cả khi recommendation-service (Python) chết.`,
        howToRead: "Tỉ lệ 0 kết quả càng THẤP càng tốt. Sau khi bật Smart Search, kỳ vọng tỉ lệ này giảm dần vì các query theo nhu cầu ('đồ sấy'...) trước đây trả 0 giờ được semantic cứu.",
        terms: [TERMS.zeroResult, TERMS.searchMode],
        insight: total === 0
          ? { status: "nodata", summary: `Chưa có lượt tìm kiếm nào trong ${days} ngày qua.`, points: [], suggestion: "Đợi có traffic tìm kiếm thật." }
          : {
              status: zeroRate != null && zeroRate > 0.2 ? "warn" : "good",
              summary: `${num(total)} lượt tìm, ${pct(zeroRate, 1)} trong đó không ra kết quả nào.`,
              points: total < 50 ? [`Cỡ mẫu còn nhỏ (${num(total)} lượt < 50) — số liệu dao động mạnh.`] : [],
              suggestion: zeroRate != null && zeroRate > 0.2
                ? "Tỉ lệ 0 kết quả cao — xem bảng 'Từ khoá 0 kết quả' để biết khách đang tìm gì mà không thấy."
                : "Theo dõi xu hướng theo tuần; tăng đột biến thường do catalog thiếu hàng khách cần.",
            },
      };
    }

    case "search_rescue": {
      const sr = ctx.searchReport;
      const total = sr?.totalSearches ?? 0;
      const rescued = sr?.semanticRescueCount ?? 0;
      return {
        title: "Semantic rescue — giá trị cộng thêm của Smart Search",
        what: "Số lượt tìm mà khớp tên (LIKE) KHÔNG ra gì — tức trước nâng cấp chắc chắn trả 'Không tìm thấy sản phẩm' — nhưng nhánh semantic vẫn hiểu nhu cầu và trả được kết quả. Đây là con số trả lời trực tiếp câu hỏi 'Smart Search có đáng không?'.",
        howToRead: "Mỗi lượt rescue là 1 khách lẽ ra đã rời đi tay trắng. Xem kèm CTR của nhóm SEMANTIC_HYBRID ở biểu đồ bên cạnh để biết kết quả cứu được có được khách bấm vào không.",
        terms: [TERMS.rescue, TERMS.searchMode],
        insight: total === 0
          ? { status: "nodata", summary: "Chưa có dữ liệu.", points: [], suggestion: "Đợi có traffic tìm kiếm thật." }
          : {
              status: rescued > 0 ? "good" : "neutral",
              summary: rescued > 0
                ? `${num(rescued)} lượt tìm được semantic cứu (${pct(sr?.semanticRescueRate, 1)} tổng lượt tìm).`
                : "Chưa ghi nhận lượt rescue nào — khách hiện chủ yếu tìm theo tên sản phẩm.",
              points: [],
              suggestion: "Nếu con số này luôn ~0 sau vài tuần, cân nhắc lại độ ưu tiên các tinh chỉnh semantic tiếp theo.",
            },
      };
    }

    case "search_mode_chart": {
      const sr = ctx.searchReport;
      const rows = (sr?.byMode || []).filter((m) => m.searches > 0);
      const best = rows.filter((m) => m.ctr != null && m.searches >= 20).sort((a, b) => b.ctr - a.ctr)[0];
      return {
        title: "CTR tìm kiếm theo đường xử lý (search mode)",
        what: "Tỉ lệ lượt tìm dẫn tới ít nhất 1 click sản phẩm, tách theo đường xử lý thực tế của từng lượt tìm. So sánh trực tiếp SEMANTIC_HYBRID với LEGACY_LIKE/LEXICAL_FALLBACK là phép đo A/B tự nhiên giữa search mới và cũ.",
        howToRead: "Cột dài hơn = đường xử lý đó dẫn tới click nhiều hơn. Kèm vị trí click trung bình trong bảng dưới biểu đồ: càng nhỏ nghĩa là thứ khách cần nằm càng gần đầu danh sách.",
        terms: [TERMS.searchMode, TERMS.ctr, TERMS.clickedPosition],
        insight: rows.length === 0
          ? { status: "nodata", summary: "Chưa có dữ liệu search mode (cột mới chỉ được ghi từ khi Phase C chạy).", points: [], suggestion: "Đợi thêm traffic sau khi deploy." }
          : {
              status: "neutral",
              summary: best
                ? `Đường xử lý CTR cao nhất (đủ mẫu ≥20 lượt): ${SEARCH_MODE_LABELS[best.mode] || best.mode} với ${pct(best.ctr, 1)}.`
                : "Các nhóm đều chưa đủ mẫu (≥20 lượt) để so sánh CTR đáng tin.",
              points: rows.map((m) =>
                `${SEARCH_MODE_LABELS[m.mode] || m.mode}: ${num(m.searches)} lượt, CTR ${pct(m.ctr, 1)}${m.avgClickedPosition != null ? `, vị trí click TB ${m.avgClickedPosition.toFixed(1)}` : ""}`),
              suggestion: "LEXICAL_FALLBACK chiếm tỉ trọng lớn kéo dài = Python service chết thường xuyên — kiểm tra vận hành.",
            },
      };
    }

    case "search_zero_table": {
      const sr = ctx.searchReport;
      const rows = sr?.topZeroResultKeywords || [];
      return {
        title: "Từ khoá tìm nhiều nhưng 0 kết quả",
        what: "Những từ khoá khách gõ nhiều lần nhất mà hệ thống không trả được sản phẩm nào — kể cả sau khi semantic đã cố cứu. Đây là danh sách hành động cho vận hành/nhập hàng, không chỉ là số liệu kỹ thuật.",
        howToRead: "Mỗi dòng là 1 nhu cầu thật đang bị bỏ lỡ: hoặc cửa hàng chưa bán thứ đó (cân nhắc nhập), hoặc có bán nhưng tên/mô tả sản phẩm không khớp cách khách gọi (cân nhắc đổi tên/bổ sung mô tả).",
        terms: [TERMS.zeroResult],
        insight: rows.length === 0
          ? { status: "good", summary: `Không có từ khoá 0 kết quả nào lặp lại trong ${days} ngày qua.`, points: [], suggestion: "Tín hiệu tốt — semantic recall đang phủ đủ nhu cầu khách gõ." }
          : {
              status: "warn",
              summary: `${rows.length} từ khoá đang bị bỏ lỡ, đứng đầu là "${rows[0].keyword}" (${num(rows[0].count)} lượt).`,
              points: rows.slice(0, 5).map((r) => `"${r.keyword}" — ${num(r.count)} lượt tìm không ra gì`),
              suggestion: "Lưu ý đã biết từ lúc calibrate: query về ngành hàng cửa hàng KHÔNG bán vẫn có thể vượt gate semantic và trả kết quả gần nghĩa — bảng này chỉ bắt được trường hợp gate chặn hẳn.",
            },
      };
    }

    default:
      return null;
  }
};
