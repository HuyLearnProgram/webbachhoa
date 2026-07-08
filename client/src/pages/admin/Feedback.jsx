import React, { useEffect, useState } from "react";
import { Button, Select, Table, Modal, message, Input } from "antd";
import { apiGetAllRatingsPage, apiHideRating } from "@/apis";
import { useDispatch, useSelector } from "react-redux";
import { showModal } from '@/store/app/appSlice';
import { useSearchParams } from "react-router-dom";
import { sortFeedbackOrder, statusHideOrder } from "@/utils/constants";
import withBaseComponent from "@/hocs/withBaseComponent";
import icons from "@/utils/icons";
import { getCurrentUser } from "@/store/user/asyncActions";
import { FeedbackCard } from "@/components";
import path from "@/utils/path";

const { FaInfoCircle, MdOutlineBlock } = icons;

const Feedback = ({ navigate, location }) => {
    const { isLoggedIn } = useSelector(state => state.user);
    const [paginate, setPaginate] = useState(null);
    const [feedbacksPage, setFeedbacksPage] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [paramPage, SetParamPage] = useState();
    const dispatch = useDispatch();
    const { current } = useSelector(state => state.user);
    const [params, setParams] = useSearchParams();
    const status = params.get("status");
    const sort = params.get("sort");
    const search = params.get("search");
    const [searchTerm, setSearchTerm] = useState(search || "");

    useEffect(() => {
        setSearchTerm(search || "");
    }, [search]);

    const fetchRatings = async (page = 1, safParam = {}) => {
        const { status, sort, search } = safParam;
        const queryParams = { page };
        if (status !== undefined && status !== null && status !== "") queryParams.status = status;
        if (sort && sort !== "product_name") queryParams.sort = sort;
        if (search) queryParams.search = search;

        const response = await apiGetAllRatingsPage(queryParams);

        if (response.statusCode === 200) {
            let feedbacksList = response.data?.result;
            if (sort === "product_name") {
                feedbacksList = [...feedbacksList].sort((a, b) => {
                    if (a.product_name < b.product_name) return 1;
                    if (a.product_name > b.product_name) return -1;
                    return 0;
                });
            }
            setFeedbacksPage(feedbacksList)
            setPaginate(response.data?.meta)
            setCurrentPage(page)
        }
    }

    useEffect(() => {
        if (current) {
            fetchRatings(currentPage, paramPage);
        }
    }, [current, currentPage]);

    useEffect(() => {
        const pr = Object.fromEntries([...params]);
        SetParamPage(pr);
        fetchRatings(1, pr);
    }, [params]);

    const buildParams = (overrides) => {
        const next = { ...Object.fromEntries([...params]) };
        Object.assign(next, overrides);
        Object.keys(next).forEach((key) => {
            if (next[key] === undefined || next[key] === "") delete next[key];
        });
        setParams(next);
    };

    const handleChangeSortValue = (value) => {
        buildParams({ sort: value });
    };

    const handleChangeStatusValue = (value) => {
        buildParams({ status: value });
    };

    const handleViewDetail = (id) => {
        if (!isLoggedIn) {
            Modal.confirm({
                title: "Oops!",
                content: "Đăng nhập trước xem",
                okText: "Đăng nhập",
                cancelText: "Hủy",
                onOk: () => navigate(`/${path.LOGIN}`)
            });
        } else {
            const feedback = feedbacksPage.find(feedback => feedback?.id === id);
            dispatch(showModal({
                isShowModal: true,
                modalChildren: <FeedbackCard data={feedback} onClose={() => dispatch(showModal({ isShowModal: false }))} />
            }));
        }
    };

    const handleHideFeedback = async (id) => {
        if (!isLoggedIn) {
            Modal.confirm({
                title: "Oops!",
                content: "Đăng nhập trước để ẩn",
                okText: "Đăng nhập",
                cancelText: "Hủy",
                onOk: () => navigate(`/${path.LOGIN}`)
            });
        } else {
            const feedback = feedbacksPage.find(feedback => feedback.id === id);
            const response = await apiHideRating(feedback?.id);
            if (+response.statusCode === 201) {
                message.success(feedback?.status === 0 ? "Ẩn đánh giá thành công" : "Hiện đánh giá thành công");
                setTimeout(() => {
                    dispatch(getCurrentUser());
                }, 1000);
            } else {
                message.error("Có lỗi. Không thể ẩn hay hiện đánh giá này");
            }
        }
    };

    const columns = [
        { title: 'Sản phẩm', dataIndex: 'product_name', key: 'product_name' },
        { title: 'Người dùng', dataIndex: 'userName', key: 'userName' },
        { title: 'Đánh giá', dataIndex: 'ratingStar', key: 'ratingStar', align: 'center', render: (rating) => `${rating} ★` },
        { title: 'Mô tả', dataIndex: 'description', key: 'description', render: (text) => text.length > 50 ? `${text.substring(0, 50)}...` : text },
        { title: 'Thời gian cập nhật', dataIndex: 'updatedAt', key: 'updatedAt', align: 'right', render: (date) => new Date(date).toLocaleString("vi-VN") },
        {
            title: 'Chi tiết',
            key: 'viewDetail',
            align: 'center',
            render: (_, record) => <Button
            type="link"
            onClick={() => handleViewDetail(record.id)}
            title="Xem chi tiết">
                <FaInfoCircle className="w-5 h-5 inline-block" />
            </Button>
        },
        {
            title: 'Ẩn',
            key: 'hide',
            align: 'center',
            render: (_, record) => <Button
            type="link"
            onClick={() => handleHideFeedback(record.id)}
            icon={<MdOutlineBlock color={record.status === 0 ? "red" : "gray"} />}
            title={record.status === 0 ? "Ẩn" : "Hiện"}/>
        }
    ];

    return (
        <div className="w-full">
            <div className="mb-4 flex gap-4 items-center flex-wrap">
                <Input.Search
                    allowClear
                    placeholder="Tìm theo tên sản phẩm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onSearch={(value) => buildParams({ search: value.trim() || undefined })}
                    style={{ width: 280 }}
                />
                <Select
                    allowClear
                    placeholder="Sắp xếp"
                    options={sortFeedbackOrder}
                    value={sort || undefined}
                    onChange={handleChangeSortValue}
                    style={{ width: 200 }}
                />
                <Select
                    allowClear
                    placeholder="Lọc theo trạng thái"
                    options={statusHideOrder}
                    value={status !== null && status !== undefined && status !== "" ? Number(status) : undefined}
                    onChange={handleChangeStatusValue}
                    style={{ width: 200 }}
                />
            </div>
            <Table
                dataSource={feedbacksPage}
                columns={columns}
                rowKey="id"
                pagination={{
                    current: currentPage,
                    pageSize: paginate?.pageSize,
                    onChange: (page) => setCurrentPage(page),
                    total: paginate?.total,
                  }}
            />
        </div>
    );
};

export default withBaseComponent(Feedback);
