import React, { useEffect, useState } from "react";
import { Table, Button, Image, Modal, Select, Radio, Input, message } from "antd";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams, createSearchParams } from "react-router-dom";
import { apiGetAllUser, apiSetStatusUser } from "@/apis";
import avatarDefault from "@/assets/avatarDefault.png";
import { MdModeEdit } from "react-icons/md";
import { statusUserOption, lockReasonOptions, OTHER_LOCK_REASON } from "@/utils/constants";

const User = () => {
  const { current } = useSelector((state) => state.user);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [params] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(Number(params.get('page')) || 1);
  const [totalPage, setTotalPage] = useState(null)
  const [searchTerm, setSearchTerm] = useState(params.get('search') || "");
  const USER_PER_PAGE = 8;
  const navigate = useNavigate();

  const [lockTargetUser, setLockTargetUser] = useState(null);
  const [selectedReason, setSelectedReason] = useState(null);
  const [customReason, setCustomReason] = useState("");

  const search = params.get("search");
  const status = params.get("status");

  useEffect(() => {
    setSearchTerm(search || "");
  }, [search]);

  const fetchUsers = async (queries) => {
    setLoading(true);
    try {
      const { filter, ...rest } = queries;
      const res = await apiGetAllUser({
        ...rest,
        ...(filter?.length ? { filter: filter.join(" and ") } : {}),
      });
      setUsers(res?.data?.result || []);
      setTotalPage(res?.data?.meta.total)
    } catch (error) {
      message.error("Có lỗi xảy ra khi tải dữ liệu người dùng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filters = [];
    if (search) filters.push(`name~'${search}'`);
    if (status && status !== "default") filters.push(`status=${status}`);

    const queries = { page: currentPage, size: USER_PER_PAGE, filter: filters };
    fetchUsers(queries);
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

  const handlePaginationChange = (page) => {
    buildParams({ page });
    setCurrentPage(page);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      setCurrentPage(1);
      buildParams({ search: searchTerm.trim() || undefined, page: 1 });
    }
  };

  const handleChangeStatusFilter = (value) => {
    setCurrentPage(1);
    buildParams({ status: value === "default" ? undefined : value, page: 1 });
  };

  const applyStatusChange = async (user, newStatus, lockReason) => {
    try {
      await apiSetStatusUser({ ...user, status: newStatus, lockReason });
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );
      message.success("Cập nhật trạng thái thành công");
    } catch (error) {
      message.error("Có lỗi xảy ra khi cập nhật trạng thái");
    }
  };

  const handleStatusChange = (user) => {
    if (user.id === current.id) {
      message.warning("Bạn không thể thay đổi trạng thái của chính mình");
      return;
    }
    const newStatus = user.status === 1 ? 0 : 1;
    if (newStatus === 0) {
      // Khoá tài khoản: bắt buộc chọn/nhập lý do trước khi xác nhận
      setLockTargetUser(user);
      setSelectedReason(null);
      setCustomReason("");
      return;
    }
    Modal.confirm({
      title: `Xác nhận thay đổi trạng thái cho người dùng ${user.name}?`,
      onOk: () => applyStatusChange(user, newStatus),
    });
  };

  const closeLockModal = () => {
    setLockTargetUser(null);
    setSelectedReason(null);
    setCustomReason("");
  };

  const handleConfirmLock = async () => {
    const finalReason = selectedReason === OTHER_LOCK_REASON ? customReason.trim() : selectedReason;
    if (!finalReason) {
      message.warning("Vui lòng chọn hoặc nhập lý do khoá tài khoản");
      return;
    }
    await applyStatusChange(lockTargetUser, 0, finalReason);
    closeLockModal();
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
    {
      title: "Sửa",
      key: "edit",
      align: 'center',
      render: (_, record) => (
        <Button type="link" onClick={() => navigate(`/admin/user/edit/${record.id}`)}>
          <MdModeEdit className="w-5 h-5 inline-block" />
        </Button>
      ),
    },
  ];

  return (
    <div className="w-full">
      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Tìm kiếm theo tên"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="w-[300px] border border-gray-300 rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <Select
          placeholder="Lọc theo trạng thái"
          options={statusUserOption}
          onChange={handleChangeStatusFilter}
          style={{ width: 200 }}
        />
      </div>
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

      <Modal
        title={`Lý do khoá tài khoản ${lockTargetUser?.name || ""}`}
        open={!!lockTargetUser}
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
    </div>
  );
};

export default User;
