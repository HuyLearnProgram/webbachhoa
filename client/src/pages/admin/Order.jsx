/* eslint-disable deprecation/deprecation */
import React, { useState, useEffect } from "react";
import { apiGetAllOrders, apiUpdateOrderStatus } from "@/apis";
import { useNavigate, useSearchParams, createSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Table, Button, Dropdown, Select, Input } from "antd";
import { statusOrder, paymentStatusLabel, getOrderStatusLabel } from "@/utils/constants";
import icons from "@/utils/icons";

const { FaInfoCircle } = icons;

// statusOrder được dùng chung với trang khách (member/History.jsx) nên giữ nguyên constant gốc,
// chỉ lọc bỏ option giả "Lọc theo trạng thái" ở đây để Select admin dùng placeholder thật thay vì
// hiển thị option đó như một giá trị đã chọn (chữ đen đậm thay vì mờ).
const orderStatusFilterOptions = statusOrder.filter((o) => o.value !== "default");

const Order = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(Number(params.get("page")) || 1);
  const ORDER_PER_PAGE = 12;
  const [orderMeta, setOrderMeta] = useState(null);
  const [searchTerm, setSearchTerm] = useState(params.get("search") || "");

  const search = params.get("search");
  const status = params.get("status");

  useEffect(() => {
    setSearchTerm(search || "");
  }, [search]);

  const getQueries = () => {
    const filters = [];
    if (search) {
      filters.push(/^\d+$/.test(search) ? `id='${search}'` : `user.email~'${search}'`);
    }
    if (status) filters.push(`status=${status}`);
    return { page: currentPage, size: ORDER_PER_PAGE, filter: filters };
  };

  const fetchOrders = async (queries) => {
    const filterString = queries.filter.join(" and ");
    const res = await apiGetAllOrders({ ...queries, filter: filterString });
    setOrders(res.data?.result);
    setOrderMeta(res.data?.meta);
  };

  useEffect(() => {
    fetchOrders(getQueries());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, search, status]);

  const buildParams = (overrides) => {
    const next = {};
    if (search) next.search = search;
    if (status) next.status = status;
    Object.assign(next, overrides);
    Object.keys(next).forEach((key) => {
      if (next[key] === undefined || next[key] === "") delete next[key];
    });
    navigate({ search: createSearchParams(next).toString() });
  };

  const handlePagination = (page) => {
    setCurrentPage(page);
    buildParams({ page });
  };

  const handleChangeStatusOrder = (value) => {
    setCurrentPage(1);
    buildParams({ status: value, page: 1 });
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await apiUpdateOrderStatus(orderId, newStatus);
      if (res.statusCode === 200) {
        toast.success("Cập nhật trạng thái đơn hàng thành công!");
        fetchOrders(getQueries());
      } else {
        throw new Error("Cập nhật trạng thái thất bại");
      }
    } catch (err) {
      toast.error("Có lỗi xảy ra: " + err.message);
    }
  };

  const statusMenuItems = (order) => {
    const items = [];

    if (order.status === 0) {
      items.push(
        { key: 'in-delivery', label: 'In Delivery', onClick: () => updateOrderStatus(order.id, 1) },
        { key: 'cancel', label: 'Cancel', onClick: () => updateOrderStatus(order.id, 3) }
      );
    }

    if (order.status === 1) {
      items.push(
        { key: 'success', label: 'Success', onClick: () => updateOrderStatus(order.id, 2) }
      );
    }

    if (order.status === 2) {
      items.push(
        { key: 'returned', label: 'Returned', onClick: () => updateOrderStatus(order.id, 4) }
      );
    }

    return items;
  };

  const columns = [
    {
      title: 'Id',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Email',
      dataIndex: 'userEmail',
      key: 'userEmail',
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: 'Thời gian ĐH',
      dataIndex: 'orderTime',
      key: 'orderTime',
      render: (text) => new Date(text).toLocaleDateString("vi-VN"),
    },
    {
      title: 'Thành tiền',
      dataIndex: 'total_price',
      key: 'total_price',
    },
    {
      title: 'Thanh toán',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
    },
    {
      title: 'Trạng thái TT',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (paymentStatus) => paymentStatusLabel[paymentStatus] || paymentStatus || "—",
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (order) => (
        <Dropdown menu={{ items: statusMenuItems(order) }} trigger={['click']}>
          <Button className="w-20">
            {getOrderStatusLabel(order.status)}
          </Button>
        </Dropdown>
      ),
    },
    {
      title: 'Chi tiết',
      key: 'detail',
      align: 'center',
      render: (_, record) => (
        <Button type="link" title="Xem chi tiết" onClick={() => navigate(`/admin/order/${record.id}`)}>
          <FaInfoCircle className="w-5 h-5 inline-block" />
        </Button>
      ),
    },
  ];

  return (
    <div className="w-full">
      <div className="mb-4 flex gap-4 items-center flex-wrap">
        <Input.Search
          allowClear
          placeholder="Tìm theo ID hoặc email"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onSearch={(value) => {
            setCurrentPage(1);
            buildParams({ search: value.trim() || undefined, page: 1 });
          }}
          style={{ width: 280 }}
        />
        <Select
          allowClear
          placeholder="Lọc theo trạng thái"
          options={orderStatusFilterOptions}
          value={status ? Number(status) : undefined}
          onChange={handleChangeStatusOrder}
          style={{ width: 200 }}
        />
      </div>
      <Table
        columns={columns}
        dataSource={orders}
        rowKey="id"
        pagination={{
          current: currentPage,
          pageSize: ORDER_PER_PAGE,
          total: orderMeta?.total,
          onChange: handlePagination,
        }}
      />
    </div>
  );
};

export default Order;
