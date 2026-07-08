import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, Table, Select, Input, Modal, message, Button, Tag, Image } from "antd";
import {
  apiGetProduct,
  apiGetRatingsPage,
  apiBulkUpdateProductActive,
  apiGetProductReturnStats,
  apiHideRating,
} from "@/apis";
import product_default from "@/assets/product_default.png";
import avatarDefault from "@/assets/avatarDefault.png";
import { TurnBackHeader } from "@/components/admin";
import { statusHideOrder } from "@/utils/constants";
import { renderStarFromNumber } from "@/utils/helper";
import { getPromotionBadgeLabel } from "@/utils/promotion";
import icons from "@/utils/icons";

const { MdOutlineBlock } = icons;

const resolveProductImageUrl = (imageUrl) =>
  imageUrl
    ? (imageUrl.startsWith("https") ? imageUrl : `${import.meta.env.VITE_BACKEND_TARGET}/storage/product/${imageUrl}`)
    : product_default;

const resolveAvatarUrl = (avatarUrl) =>
  avatarUrl
    ? (avatarUrl.startsWith("https") ? avatarUrl : `${import.meta.env.VITE_BACKEND_TARGET}/storage/avatar/${avatarUrl}`)
    : avatarDefault;

const feedbackSortOptions = [
  { label: "Mới nhất", value: "newest" },
  { label: "Cũ nhất", value: "oldest" },
  { label: "Đánh giá cao nhất", value: "rating_desc" },
  { label: "Đánh giá thấp nhất", value: "rating_asc" },
];

function ProductDetail() {
  const navigate = useNavigate();
  const pid = window.location.pathname.split("/").pop();

  const [product, setProduct] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [returnStats, setReturnStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState(undefined);
  const [feedbackSort, setFeedbackSort] = useState("newest");
  const [feedbackSearch, setFeedbackSearch] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [productRes, feedbackRes, returnStatsRes] = await Promise.all([
        apiGetProduct(pid),
        apiGetRatingsPage(pid),
        apiGetProductReturnStats(pid),
      ]);
      setProduct(productRes.data);
      setFeedbacks(feedbackRes.data?.result || []);
      setReturnStats(returnStatsRes.data || null);
    } catch (error) {
      message.error("Có lỗi xảy ra khi tải thông tin sản phẩm");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  const totalReviews = feedbacks.length;
  const avgRating = totalReviews > 0
    ? feedbacks.reduce((sum, f) => sum + (f.ratingStar || 0), 0) / totalReviews
    : null;

  const filteredFeedbacks = useMemo(() => {
    let list = feedbacks.filter((f) => {
      if (feedbackStatusFilter != null && f.status !== feedbackStatusFilter) return false;
      if (feedbackSearch && !(f.userName || "").toLowerCase().includes(feedbackSearch.trim().toLowerCase())) return false;
      return true;
    });
    if (feedbackSort === "oldest") {
      list = [...list].sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
    } else if (feedbackSort === "rating_desc") {
      list = [...list].sort((a, b) => b.ratingStar - a.ratingStar);
    } else if (feedbackSort === "rating_asc") {
      list = [...list].sort((a, b) => a.ratingStar - b.ratingStar);
    } else {
      list = [...list].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }
    return list;
  }, [feedbacks, feedbackStatusFilter, feedbackSort, feedbackSearch]);

  const handleToggleActive = () => {
    const nextActive = product.active === false;
    Modal.confirm({
      title: nextActive ? "Xác nhận hiện sản phẩm" : "Xác nhận ẩn sản phẩm",
      content: nextActive
        ? `Hiện lại sản phẩm "${product.productName}" cho khách hàng?`
        : `Ẩn sản phẩm "${product.productName}"? Khách hàng sẽ không thấy và không mua được sản phẩm này nữa (dữ liệu đơn hàng/đánh giá cũ vẫn giữ nguyên).`,
      okText: "Xác nhận",
      okButtonProps: { danger: !nextActive },
      cancelText: "Đóng",
      onOk: async () => {
        try {
          const res = await apiBulkUpdateProductActive([product.id], nextActive);
          if (res.statusCode !== 200) throw new Error(res.message);
          setProduct((prev) => ({ ...prev, active: nextActive }));
          message.success(nextActive ? "Đã hiện sản phẩm trở lại!" : "Đã ẩn sản phẩm!");
        } catch (error) {
          message.error("Cập nhật trạng thái thất bại!");
        }
      },
    });
  };

  const handleToggleFeedback = async (fb) => {
    try {
      const res = await apiHideRating(fb.id);
      if (+res.statusCode !== 201) throw new Error(res.message);
      setFeedbacks((prev) => prev.map((f) => (f.id === fb.id ? { ...f, status: f.status === 0 ? 1 : 0 } : f)));
      message.success(fb.status === 0 ? "Đã ẩn đánh giá" : "Đã hiện đánh giá");
    } catch (error) {
      message.error("Có lỗi xảy ra khi cập nhật đánh giá");
    }
  };

  if (loading || !product) {
    return <div className="w-full">Loading...</div>;
  }

  const hasSale = product.originalPrice && product.originalPrice > product.price;
  const isActive = product.active !== false;
  const galleryImages = [
    { id: "main", imageUrl: product.imageUrl },
    ...(product.images || []),
  ];

  const feedbackColumns = [
    {
      title: "Người dùng",
      key: "user",
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <img
            src={resolveAvatarUrl(record.userAvatarUrl)}
            alt={record.userName}
            className="w-8 h-8 rounded-full object-cover border"
          />
          <span>{record.userName}</span>
        </div>
      ),
    },
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
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      align: "center",
      render: (status) => (status === 0 ? <Tag color="green">Hiện</Tag> : <Tag color="default">Đã ẩn</Tag>),
    },
    {
      title: "Ẩn/Hiện",
      key: "toggle",
      align: "center",
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => handleToggleFeedback(record)}
          icon={<MdOutlineBlock color={record.status === 0 ? "red" : "gray"} />}
          title={record.status === 0 ? "Ẩn đánh giá" : "Hiện đánh giá"}
        />
      ),
    },
  ];

  return (
    <div className="w-full">
      <TurnBackHeader turnBackPage="/admin/product" header="Quay về trang sản phẩm" />

      <div className="bg-white shadow-lg rounded-lg p-8 mb-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <Image.PreviewGroup>
            <div className="flex flex-col items-center gap-2">
              <Image
                src={resolveProductImageUrl(product.imageUrl)}
                alt={product.productName}
                width={160}
                height={160}
                className="rounded-lg border object-cover"
              />
              {galleryImages.length > 1 && (
                <div className="flex flex-wrap gap-2 justify-center max-w-[220px]">
                  {galleryImages.slice(1).map((img) => (
                    <Image
                      key={img.id}
                      src={resolveProductImageUrl(img.imageUrl)}
                      width={48}
                      height={48}
                      className="rounded border object-cover"
                    />
                  ))}
                </div>
              )}
              <span className="text-gray-400 text-sm">ID: {product.id}</span>
            </div>
          </Image.PreviewGroup>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 flex-1">
            <div><span className="text-gray-500">Tên sản phẩm: </span>{product.productName}</div>
            <div><span className="text-gray-500">SKU: </span>{product.sku || "—"}</div>
            <div><span className="text-gray-500">Phân loại: </span>{product.category?.name || "—"}</div>
            <div><span className="text-gray-500">Đơn vị tính: </span>{product.unit || "—"}</div>
            <div>
              <span className="text-gray-500">Giá bán: </span>
              {hasSale && (
                <span className="text-gray-400 line-through mr-2">
                  {product.originalPrice.toLocaleString("vi-VN")} đ
                </span>
              )}
              <span>{product.price.toLocaleString("vi-VN")} đ</span>
              {hasSale && (
                <Tag color="red" style={{ marginLeft: 4 }}>
                  -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                </Tag>
              )}
            </div>
            <div>
              <span className="text-gray-500">Khuyến mãi: </span>
              {getPromotionBadgeLabel(product) || "Không có khuyến mãi"}
            </div>
            <div><span className="text-gray-500">Tồn kho: </span>{product.quantity}</div>
            <div>
              <span className="text-gray-500">Trạng thái: </span>
              <span className={isActive ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                {isActive ? "Đang bán" : "Đã ẩn"}
              </span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-gray-500">Mô tả: </span>
              <p className="mt-1 whitespace-pre-line">{product.description || "—"}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button type="primary" onClick={() => navigate(`/admin/product/edit/${product.id}`)}>Sửa sản phẩm</Button>
          <Button danger={isActive} onClick={handleToggleActive}>
            {isActive ? "Ẩn sản phẩm" : "Hiện sản phẩm"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <div className="text-2xl font-semibold text-main">{product.sold}</div>
          <div className="text-gray-500 text-sm">Đã bán</div>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <div className="text-2xl font-semibold text-main">{avgRating !== null ? avgRating.toFixed(1) : "Chưa có"}</div>
          <div className="text-gray-500 text-sm">Đánh giá trung bình</div>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <div className="text-2xl font-semibold text-main">{totalReviews}</div>
          <div className="text-gray-500 text-sm">Số lượt đánh giá</div>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <div className="text-2xl font-semibold text-main">
            {returnStats && returnStats.deliveredCount > 0 ? `${returnStats.returnRate.toFixed(1)}%` : "Chưa có"}
          </div>
          <div className="text-gray-500 text-sm">Tỉ lệ hoàn trả hàng</div>
          {returnStats && returnStats.deliveredCount > 0 && (
            <div className="text-gray-400 text-xs">
              ({returnStats.returnedCount}/{returnStats.deliveredCount} đơn đã giao)
            </div>
          )}
        </div>
      </div>

      <Tabs
        defaultActiveKey="feedbacks"
        items={[
          {
            key: "feedbacks",
            label: "Đánh giá",
            children: (
              <div>
                <div className="mb-4 flex items-center gap-4">
                  <Input.Search
                    allowClear
                    size="large"
                    placeholder="Tìm theo tên người dùng"
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
                    size="large"
                    placeholder="Sắp xếp"
                    options={feedbackSortOptions}
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
    </div>
  );
}

export default ProductDetail;
