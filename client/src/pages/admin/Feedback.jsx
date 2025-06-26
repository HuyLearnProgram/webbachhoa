import React, { useEffect, useState } from "react";
import { Button, Select, Table, Modal, message } from "antd";
import { apiGetAllRatingsPage, apiHideRating } from "@/apis";
import { useDispatch, useSelector } from "react-redux";
import { showModal } from '@/store/app/appSlice';
import {  useSearchParams } from "react-router-dom";
import { sortFeedbackOrder, statusHideOrder } from "@/utils/constants";
import withBaseComponent from "@/hocs/withBaseComponent";
import { FaEye } from "react-icons/fa6";
import { MdOutlineBlock } from "react-icons/md";
import { getCurrentUser } from "@/store/user/asyncActions";
import { FeedbackCard } from "@/components";

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

    const fetchRatings = async (page = 1, safParam = {}) => {
        const { status, sort } = safParam;
        let response;
        if (status === "default" && sort !== "default" && sort !== "product_name") {
            response = await apiGetAllRatingsPage({ page, sort })
        } else if (status !== "default" && sort === "default") {
            response = await apiGetAllRatingsPage({ page, status })
        } else if (status !== "default" && sort === "product_name") {
            response = await apiGetAllRatingsPage({ page, status })
        } else if (status === "default" && sort === "product_name") {
            response = await apiGetAllRatingsPage({ page })
        } else if (status === "default" && sort === "default") {
            response = await apiGetAllRatingsPage({ page })
        } else {
            response = await apiGetAllRatingsPage({ page, ...safParam })
        }

        if (response.statusCode === 200) {
            let feedbacksList = response.data?.result
            if (sort === "product_name") {
                feedbacksList = feedbacksList.sort((a, b) => {
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

    const handleChangeSortValue = (value) => {
        setParams({ ...Object.fromEntries([...params]), sort: value });
    };

    const handleChangeStatusValue = (value) => {
        setParams({ ...Object.fromEntries([...params]), status: value });
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
            title: 'Xem chi tiết',
            key: 'viewDetail',
            align: 'center',
            render: (_, record) => <Button 
            type="link" 
            onClick={() => handleViewDetail(record.id)} 
            icon={<FaEye color="green" />} 
            title="Xem chi tiết"/>
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
            <div className="mb-4">
                <Select
                    placeholder="Sắp xếp"
                    options={sortFeedbackOrder}
                    onChange={handleChangeSortValue}
                    style={{ width: 200, marginRight: 16 }}
                />
                <Select
                    placeholder="Lọc theo trạng thái"
                    options={statusHideOrder}
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
            {/* {paginate?.pages > 1 && (
                <Pagination
                    current={currentPage}
                    total={paginate?.total}
                    pageSize={paginate?.pageSize}
                    onChange={(page) => setCurrentPage(page)}
                    style={{ textAlign: "center", marginTop: 16 }}
                />
            )} */}
        </div>
    );
};

export default withBaseComponent(Feedback);