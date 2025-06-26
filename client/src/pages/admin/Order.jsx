/* eslint-disable deprecation/deprecation */
import React, { useState, useEffect } from "react";
import { apiGetAllOrders, apiUpdateOrderStatus } from "@/apis";
import { FaInfoCircle } from "react-icons/fa";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Table, Button, Dropdown, Menu, Select } from "antd";
import { createSearchParams } from "react-router-dom";
import { statusOrder } from "@/utils/constants";
const Order = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(Number(params.get("page")) || 1);
  const ORDER_PER_PAGE = 12;
  const [orderMeta, setOrderMeta] = useState(null)
  const status = params.get("status")

  const fetchOrders = async (queries) => {
    const res = await apiGetAllOrders(queries);
    setOrders(res.data?.result);
    setOrderMeta(res.data?.meta)
  };

  useEffect(() => {
    const queries = {
      page: currentPage,
      size: ORDER_PER_PAGE,
      filter: [],
    };
    fetchOrders(queries);
  }, []);

  const handlePagination = (page) => {
    setCurrentPage(page);
    const queries = {
      page: page,
      size: ORDER_PER_PAGE,
      filter: []
    };
  
    if (status) {
      queries.filter.push(`status=${status}`);
    }
  
    fetchOrders(queries);
  
    const params = {};
    if (status) params.status = status;
    params.page = page;
    navigate({
      search: createSearchParams(params).toString(),
    });
  };
  

  const handleChangeStatusOrder = (value) => {
    setCurrentPage(1);
    const filter = [];
    const params = {};
    if (value === "default") {
      const queries = {
        page: 1,
        size: ORDER_PER_PAGE,
        filter: []
      };
      params.page = 1;
      fetchOrders(queries);
      navigate({
        search: createSearchParams(params).toString(),
      });

    } else {
      filter.push(`status=${value}`);

      const queries = {
        page: 1,
        size: ORDER_PER_PAGE,
        filter: filter
      };
      fetchOrders(queries);
      params.status = value
      params.page = 1;
      navigate({
        search: createSearchParams(params).toString(),
      });
    }

  }

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await apiUpdateOrderStatus(orderId, newStatus);
      if (res.statusCode === 200) {
        toast.success("Cập nhật trạng thái đơn hàng thành công!");
  
        const queries = {
          page: currentPage,
          size: ORDER_PER_PAGE,
          filter: []
        };
        
        if (status) {
          queries.filter.push(`status=${status}`);
        }
  
        fetchOrders(queries);
  
        const params = {};
        if (status) params.status = status;
        params.page = currentPage;
        navigate({
          search: createSearchParams(params).toString(),
        });
  
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
      title: 'Trạng thái',
      key: 'status',
      render: (order) => (
        <Dropdown menu={{ items: statusMenuItems(order) }} trigger={['click']}>
          <Button className="w-20">
            {order.status === 0
              ? 'Pending'
              : order.status === 1
                ? 'In Delivery'
                : order.status === 2
                  ? 'Succeed'
                  : 'Cancelled'}
          </Button>
        </Dropdown>
      ),
    },
    {
      title: 'Chi tiết',
      key: 'detail',
      render: (record) => (
        <a href={`${location.pathname}/${record.id}`} className="text-blue-500 hover:text-blue-700">
          <FaInfoCircle />
        </a>
      ),
    },
  ];

  return (
    <div className="w-full">
      <div className="mb-4">
        <Select
          placeholder="Sắp xếp theo trạng thái đơn đặt hàng"
          options={statusOrder}
          onChange={handleChangeStatusOrder}
          style={{ width: 200, marginRight: 16 }}
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