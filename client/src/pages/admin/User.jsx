import React, { useEffect, useState } from "react";
import { Table, Button, Image, Modal, message } from "antd";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams, createSearchParams } from "react-router-dom";
import { apiGetAllUser, apiSetStatusUser } from "@/apis";
import avatarDefault from "@/assets/avatarDefault.png";

const User = () => {
  const { current } = useSelector((state) => state.user);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [params] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(Number(params.get('page')) || 1);
  const [totalPage, setTotalPage] = useState(null)
  const USER_PER_PAGE = 8;
  const navigate = useNavigate();

  const fetchUsers = async (queries) => {
    setLoading(true);
    try {
      const res = await apiGetAllUser(queries);
      setUsers(res?.data?.result || []);
      setTotalPage(res?.data?.meta.total)
    } catch (error) {
      message.error("Có lỗi xảy ra khi tải dữ liệu người dùng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const queries = { page: currentPage, size: USER_PER_PAGE };
    fetchUsers(queries);
  }, [currentPage]);

  const handleStatusChange = async (user) => {
    if (user.id === current.id) {
      message.warning("Bạn không thể thay đổi trạng thái của chính mình");
      return;
    }
    const newStatus = user.status === 1 ? 0 : 1;
    Modal.confirm({
      title: `Xác nhận thay đổi trạng thái cho người dùng ${user.name}?`,
      onOk: async () => {
        try {
          await apiSetStatusUser({ ...user, status: newStatus });
          setUsers((prevUsers) =>
            prevUsers.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
          );
          message.success("Cập nhật trạng thái thành công");
        } catch (error) {
          message.error("Có lỗi xảy ra khi cập nhật trạng thái");
        }
      },
    });
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id" },
    {
      title: "Avatar",
      dataIndex: "avatarUrl",
      key: "avatarUrl",
      render: (avatarUrl) => (
        <Image
          width={50}
          src={avatarUrl || avatarDefault}
          fallback={avatarDefault}
          alt="Avatar"
        />
      ),
    },
    { title: "Tên", dataIndex: "name", key: "name" },
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "Địa chỉ", dataIndex: "address", key: "address" },
    { title: "Số điện thoại", dataIndex: "phone", key: "phone" },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status, user) => (
        <Button className="w-20"
          type={status === 1 ? "primary" : "default"}
          onClick={() => handleStatusChange(user)}
        >
          {status === 1 ? "Active" : "Lock"}
        </Button>
      ),
    },
  ];

  const handlePaginationChange = (page) => {
    navigate({ search: createSearchParams({ page }).toString() });
    setCurrentPage(page);
  };

  return (
    <div className="w-full">
      <Table
        columns={columns}
        dataSource={users}
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize: USER_PER_PAGE,
          onChange: handlePaginationChange,
          total: totalPage,
        }}
        rowKey="id"
      />
    </div>
  );
};

export default User;
