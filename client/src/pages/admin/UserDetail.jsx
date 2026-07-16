import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Tabs, Table, Select, Input, Modal, Radio, message, Button } from "antd";
import { getUserById, apiGetOrdersByUser, apiGetFeedbacksByUser, apiSetStatusUser } from "@/apis";
import avatarDefault from "@/assets/avatarDefault.png";
import { TurnBackHeader } from "@/components/admin";
import { statusOrder, statusHideOrder, sortFeedbackOrder, lockReasonOptions, OTHER_LOCK_REASON, paymentStatusLabelWithClass, getOrderStatusLabel } from "@/utils/constants";
import { renderStarFromNumber, resolveImageUrl } from "@/utils/helper";
import icons from "@/utils/icons";

const { FaInfoCircle } = icons;

const paymentStatusOptions = Object.entries(paymentStatusLabelWithClass).map(([value, { text }]) => ({ label: text, value }));

// statusOrder được dùng chung với trang khách (member/History.jsx) nên giữ nguyên constant gốc,
// chỉ lọc bỏ option giả "Lọc theo trạng thái" ở đây để Select admin dùng placeholder thật.
const orderStatusFilterOptions = statusOrder.filter((o) => o.value !== "default");

const orderSortOptions = [
  { label: "Mới nhất", value: "newest" },
  { label: "Cũ nhất", value: "oldest" },
  { label: "Giá cao nhất", value: "price_desc" },
  { label: "Giá thấp nhất", value: "price_asc" },
];

function UserDetail() {
  const { current } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const uid = window.location.pathname.split("/").pop();

  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [orderStatusFilter, setOrderStatusFilter] = useState(undefined);
  const [orderPaymentStatusFilter, setOrderPaymentStatusFilter] = useState(undefined);
  const [orderSort, setOrderSort] = useState("newest");
  const [orderSearch, setOrderSearch] = useState("");

  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState(undefined);
  const [feedbackSort, setFeedbackSort] = useState(undefined);
  const [feedbackSearch, setFeedbackSearch] = useState("");

  const [showLockModal, setShowLockModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState(null);
  const [customReason, setCustomReason] = useState("");
  const [showSpendingModal, setShowSpendingModal] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [userRes, orderRes, feedbackRes] = await Promise.all([
        getUserById(uid),
        apiGetOrdersByUser(uid),
        apiGetFeedbacksByUser(uid),
      ]);
      setUser(userRes.data);
      setOrders(orderRes.data?.result || []);
      setFeedbacks(feedbackRes.data?.result || []);
    } catch (error) {
      message.error("Có lỗi xảy ra khi tải thông tin người dùng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const avatarUrl = resolveImageUrl(user?.avatarUrl, "avatar", avatarDefault);

  const totalOrders = orders.length;
  // Chỉ tính đơn đã paymentStatus === 'PAID' (tiền đã thực sự thu được, xác nhận qua verify callback VNPay
  // hoặc đã giao COD) — loại đúng mọi trường hợp: chưa thanh toán, thanh toán thất bại, đang/đã hoàn tiền.
  const totalSpent = Math.round(
    orders
      .filter((o) => o.paymentStatus === "PAID")
      .reduce((sum, o) => sum + (o.total_price || 0), 0)
  );
  // Tiền hoàn: đơn đã chuyển hẳn sang REFUNDED (khác totalSpent — REFUNDED không còn tính vào "đã thanh
  // toán thành công" ở trên, nên 2 số này không trùng nhau, không phải trừ đi trừ lại).
  const totalRefunded = Math.round(
    orders
      .filter((o) => o.paymentStatus === "REFUNDED")
      .reduce((sum, o) => sum + (o.total_price || 0), 0)
  );
  // Tiết kiệm từ voucher: chỉ tính trên đơn PAID (khớp phạm vi với totalSpent) — voucherDiscountAmount
  // là snapshot số tiền THỰC TẾ đã giảm tại thời điểm đặt hàng.
  const totalVoucherSaved = Math.round(
    orders
      .filter((o) => o.paymentStatus === "PAID")
      .reduce((sum, o) => sum + (o.voucherDiscountAmount || 0), 0)
  );
  const totalFeedbacks = feedbacks.length;
  const avgRating = totalFeedbacks > 0
    ? feedbacks.reduce((sum, f) => sum + (f.ratingStar || 0), 0) / totalFeedbacks
    : null;

  const filteredOrders = useMemo(() => {
    let list = orders.filter((o) => {
      if (orderStatusFilter != null && o.status !== orderStatusFilter) return false;
      if (orderPaymentStatusFilter != null && o.paymentStatus !== orderPaymentStatusFilter) return false;
      if (orderSearch && !String(o.id).includes(orderSearch.trim())) return false;
      return true;
    });
    if (orderSort === "oldest") {
      list = [...list].sort((a, b) => new Date(a.orderTime) - new Date(b.orderTime));
    } else if (orderSort === "price_desc") {
      list = [...list].sort((a, b) => (b.total_price || 0) - (a.total_price || 0));
    } else if (orderSort === "price_asc") {
      list = [...list].sort((a, b) => (a.total_price || 0) - (b.total_price || 0));
    } else {
      list = [...list].sort((a, b) => new Date(b.orderTime) - new Date(a.orderTime));
    }
    return list;
  }, [orders, orderStatusFilter, orderPaymentStatusFilter, orderSearch, orderSort]);

  const filteredFeedbacks = useMemo(() => {
    let list = feedbacks.filter((f) => {
      if (feedbackStatusFilter != null && f.status !== feedbackStatusFilter) return false;
      if (feedbackSearch && !(f.product_name || "").toLowerCase().includes(feedbackSearch.trim().toLowerCase())) return false;
      return true;
    });
    if (feedbackSort === "ratingStar") {
      list = [...list].sort((a, b) => b.ratingStar - a.ratingStar);
    } else if (feedbackSort === "product_name") {
      list = [...list].sort((a, b) => (a.product_name || "").localeCompare(b.product_name || ""));
    } else if (feedbackSort === "updatedAt") {
      list = [...list].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }
    return list;
  }, [feedbacks, feedbackStatusFilter, feedbackSort, feedbackSearch]);

  const applyStatusChange = async (newStatus, lockReason) => {
    try {
      await apiSetStatusUser({ ...user, status: newStatus, lockReason });
      setUser((prev) => ({ ...prev, status: newStatus }));
      message.success("Cập nhật trạng thái thành công");
    } catch (error) {
      message.error("Có lỗi xảy ra khi cập nhật trạng thái");
    }
  };

  const closeLockModal = () => {
    setShowLockModal(false);
    setSelectedReason(null);
    setCustomReason("");
  };

  const handleToggleStatus = () => {
    if (user.id === current.id) {
      message.warning("Bạn không thể thay đổi trạng thái của chính mình");
      return;
    }
    const newStatus = user.status === 1 ? 0 : 1;
    if (newStatus === 0) {
      setSelectedReason(null);
      setCustomReason("");
      setShowLockModal(true);
      return;
    }
    applyStatusChange(newStatus, null);
  };

  const handleConfirmLock = async () => {
    const finalReason = selectedReason === OTHER_LOCK_REASON ? customReason.trim() : selectedReason;
    if (!finalReason) {
      message.warning("Vui lòng chọn hoặc nhập lý do khoá tài khoản");
      return;
    }
    await applyStatusChange(0, finalReason);
    closeLockModal();
  };

  if (loading || !user) {
    return <div className="w-full">Loading...</div>;
  }

  const orderColumns = [
    { title: "ID", dataIndex: "id", key: "id" },
    {
      title: "Ngày đặt",
      dataIndex: "orderTime",
      key: "orderTime",
      render: (text) => new Date(text).toLocaleDateString("vi-VN"),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => getOrderStatusLabel(status),
    },
    {
      title: "Thanh toán",
      dataIndex: "paymentStatus",
      key: "paymentStatus",
      render: (paymentStatus) => {
        const info = paymentStatusLabelWithClass[paymentStatus] || { text: paymentStatus || "—", className: "text-gray-500" };
        return <span className={info.className}>{info.text}</span>;
      },
    },
    {
      title: "Tổng tiền",
      dataIndex: "total_price",
      key: "total_price",
      render: (value) => `${(value || 0).toLocaleString("vi-VN")} đ`,
    },
    {
      title: "Chi tiết",
      key: "detail",
      align: "center",
      render: (_, record) => (
        <Button type="link" title="Xem chi tiết" onClick={() => navigate(`/admin/order/${record.id}`)}>
          <FaInfoCircle className="w-5 h-5 inline-block" />
        </Button>
      ),
    },
  ];

  const feedbackColumns = [
    { title: "Sản phẩm", dataIndex: "product_name", key: "product_name" },
    {
      title: "Đánh giá",
      dataIndex: "ratingStar",
      key: "ratingStar",
      render: (rating) => <div className="flex">{renderStarFromNumber(rating)}</div>,
    },
    {
      title: "Nội dung",
      dataIndex: "description",
      key: "description",
      render: (text) => (text?.length > 60 ? `${text.substring(0, 60)}...` : text),
    },
    {
      title: "Ngày cập nhật",
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: (date) => new Date(date).toLocaleString("vi-VN"),
    },
  ];

  return (
    <div className="w-full">
      <TurnBackHeader turnBackPage="/admin/user" header="Quay về trang người dùng" />

      <div className="bg-white shadow-lg rounded-lg p-8 mb-6">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex flex-col items-center gap-1">
            <img src={avatarUrl} alt={user.name} className="w-28 h-28 rounded-full object-cover border" />
            <span className="text-gray-400 text-sm">ID: {user.id}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 flex-1">
            <div><span className="text-gray-500">Tên: </span>{user.name}</div>
            <div><span className="text-gray-500">Email: </span>{user.email}</div>
            <div><span className="text-gray-500">Số điện thoại: </span>{user.phone || "—"}</div>
            <div><span className="text-gray-500">Địa chỉ: </span>{user.address || "—"}</div>
            <div>
              <span className="text-gray-500">Trạng thái: </span>
              <span className={user.status === 1 ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                {user.status === 1 ? "Active" : "Lock"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Nguồn đăng nhập: </span>
              {user.provider === "GOOGLE" ? "Google" : "Tài khoản thường"}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button type="primary" onClick={() => navigate(`/admin/user/edit/${user.id}`)}>Sửa thông tin</Button>
          <Button danger={user.status === 1} onClick={handleToggleStatus}>
            {user.status === 1 ? "Khoá tài khoản" : "Mở khoá tài khoản"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <div className="text-2xl font-semibold text-main">{totalOrders}</div>
          <div className="text-gray-500 text-sm">Tổng đơn hàng</div>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <div className="text-2xl font-semibold text-main">{totalSpent.toLocaleString("vi-VN")} đ</div>
          <div className="text-gray-500 text-sm">Tổng chi tiêu</div>
          <div
            className="text-blue-500 text-xs cursor-pointer hover:underline"
            onClick={() => setShowSpendingModal(true)}
          >
            Xem chi tiết
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <div className="text-2xl font-semibold text-main">{totalFeedbacks}</div>
          <div className="text-gray-500 text-sm">Số feedback</div>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <div className="text-2xl font-semibold text-main">{avgRating !== null ? avgRating.toFixed(1) : "Chưa có"}</div>
          <div className="text-gray-500 text-sm">Đánh giá TB đã cho</div>
        </div>
      </div>

      <Tabs
        defaultActiveKey="orders"
        items={[
          {
            key: "orders",
            label: "Đơn hàng",
            children: (
              <div>
                <div className="mb-4 flex items-center gap-4">
                  <Input.Search
                    allowClear
                    size="large"
                    placeholder="Tìm theo ID đơn hàng"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    style={{ width: 240 }}
                  />
                  <Select
                    allowClear
                    size="large"
                    placeholder="Lọc theo trạng thái"
                    options={orderStatusFilterOptions}
                    value={orderStatusFilter}
                    onChange={setOrderStatusFilter}
                    style={{ width: 200 }}
                  />
                  <Select
                    allowClear
                    size="large"
                    placeholder="Lọc theo thanh toán"
                    options={paymentStatusOptions}
                    value={orderPaymentStatusFilter}
                    onChange={setOrderPaymentStatusFilter}
                    style={{ width: 200 }}
                  />
                  <Select
                    size="large"
                    placeholder="Sắp xếp"
                    options={orderSortOptions}
                    value={orderSort}
                    onChange={setOrderSort}
                    style={{ width: 200 }}
                  />
                </div>
                <Table
                  columns={orderColumns}
                  dataSource={filteredOrders}
                  rowKey="id"
                  pagination={{ pageSize: 5 }}
                />
              </div>
            ),
          },
          {
            key: "feedbacks",
            label: "Đánh giá",
            children: (
              <div>
                <div className="mb-4 flex items-center gap-4">
                  <Input.Search
                    allowClear
                    size="large"
                    placeholder="Tìm theo tên sản phẩm"
                    value={feedbackSearch}
                    onChange={(e) => setFeedbackSearch(e.target.value)}
                    style={{ width: 240 }}
                  />
                  <Select
                    allowClear
                    size="large"
                    placeholder="Lọc theo trạng thái"
                    options={statusHideOrder}
                    value={feedbackStatusFilter}
                    onChange={setFeedbackStatusFilter}
                    style={{ width: 200 }}
                  />
                  <Select
                    allowClear
                    size="large"
                    placeholder="Sắp xếp"
                    options={sortFeedbackOrder}
                    value={feedbackSort}
                    onChange={setFeedbackSort}
                    style={{ width: 200 }}
                  />
                </div>
                <Table
                  columns={feedbackColumns}
                  dataSource={filteredFeedbacks}
                  rowKey="id"
                  pagination={{ pageSize: 5 }}
                />
              </div>
            ),
          },
        ]}
      />

      <Modal
        title={`Lý do khoá tài khoản ${user.name || ""}`}
        open={showLockModal}
        onOk={handleConfirmLock}
        onCancel={closeLockModal}
        okText="Xác nhận khoá"
        okButtonProps={{ danger: true }}
        cancelText="Hủy"
      >
        <Radio.Group
          className="flex flex-col gap-2"
          value={selectedReason}
          onChange={(e) => setSelectedReason(e.target.value)}
        >
          {lockReasonOptions.map((reason) => (
            <Radio key={reason} value={reason}>{reason}</Radio>
          ))}
          <Radio value={OTHER_LOCK_REASON}>Khác (nhập lý do)</Radio>
        </Radio.Group>
        {selectedReason === OTHER_LOCK_REASON && (
          <Input.TextArea
            className="mt-2"
            rows={3}
            placeholder="Nhập lý do khoá tài khoản"
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
          />
        )}
      </Modal>

      <Modal
        title={`Chi tiết chi tiêu — ${user.name || ""}`}
        open={showSpendingModal}
        onCancel={() => setShowSpendingModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowSpendingModal(false)}>Đóng</Button>,
        ]}
      >
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Tiền hoàn (hoàn tiền)</span>
            <span className="text-red-500 font-medium">-{totalRefunded.toLocaleString("vi-VN")} đ</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Tiết kiệm từ voucher</span>
            <span className="text-green-600 font-medium">-{totalVoucherSaved.toLocaleString("vi-VN")} đ</span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t">
            <span className="font-semibold">Tổng chi tiêu</span>
            <span className="text-main font-bold text-lg">{totalSpent.toLocaleString("vi-VN")} đ</span>
          </div>
          <div className="text-gray-400 text-xs">(chỉ tính đơn đã thanh toán thành công)</div>
        </div>
      </Modal>
    </div>
  );
}

export default UserDetail;
