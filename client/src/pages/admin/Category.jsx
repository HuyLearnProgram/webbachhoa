import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { MdDelete, MdModeEdit } from "react-icons/md";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { apiDeleteCategory, apiGetCategories } from "@/apis";
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button, Modal, Table } from 'antd';
import { AddScreenButton } from '@/components/admin';

const Category = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(Number(params.get('page')) || 1);
  const [categories, setCategories] = useState(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState(null);
  const [deleteMessageContent, setDeleteMessageContent] = useState('');

  const fetchCategories = async (queries) => {
    const response = await apiGetCategories(queries);
    setCategories(response);
  };

  useEffect(() => {
    const queries = {
      page: currentPage,
      size: 6,
    };
    fetchCategories(queries);
  }, [currentPage]);

  const handleDeleteCategory = async (cid) => {
    try {
      const response = await apiDeleteCategory(cid);
      if (response.statusCode === 200) {
        toast.success('Xóa danh mục thành công!', { autoClose: 2000 });
        fetchCategories({ page: currentPage, size: 6 });
      } else {
        throw new Error('Xóa danh mục thất bại!');
      }
    } catch (error) {
      toast.error('Xóa danh mục thất bại, hãy xóa những sản phẩm liên kết đến phân loại này', { autoClose: 2000 });
    }
  };

  const handleShowDeleteCategoryMessage = (cate, id) => {
    setDeleteMessageContent(`Phân loại: ${cate}`);
    setDeleteCategoryId(id);
  };

  const handleCloseDeleteCategoryMessage = () => {
    setDeleteCategoryId(null);
    setDeleteMessageContent('');
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Ảnh',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      render: (imageUrl) => (
        <img
          src={imageUrl && imageUrl.startsWith('https') ? imageUrl : `${import.meta.env.VITE_BACKEND_TARGET}/storage/category/${imageUrl}`}
          alt="Category"
          style={{ width: '60px', height: '60px', objectFit: 'cover' }}
        />
      ),
    },
    {
      title: 'Tên phân loại',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Sửa',
      key: 'edit',
      render: (_, record) => (
        <Button type="link" onClick={() => navigate(`${location.pathname}/edit/${record.id}`)}>
          <MdModeEdit className="w-5 h-5 inline-block" />
        </Button>
      ),
    },
    {
      title: 'Xóa',
      key: 'delete',
      render: (_, record) => (
        <Button
          type="link"
          danger
          onClick={() => handleShowDeleteCategoryMessage(record.name, record.id)}
        >
          <MdDelete className="w-5 h-5 inline-block" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="w-full">
        <Table
          dataSource={categories?.data?.result}
          columns={columns}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize: 6,
            onChange: (page) => {
              setCurrentPage(page);
              //navigate({ search: `?page=${page}` });
            },
            total: categories?.data?.meta?.total,
          }} />
        <Modal
          title="Xác nhận xóa"
          open={!!deleteCategoryId}
          onCancel={handleCloseDeleteCategoryMessage}
          footer={[
            <Button key="back" onClick={handleCloseDeleteCategoryMessage}>
              Đóng
            </Button>,
            <Button
              key="submit"
              type="primary"
              danger
              onClick={() => {
                handleDeleteCategory(deleteCategoryId);
                handleCloseDeleteCategoryMessage();
              }}
            >
              Xác nhận
            </Button>,
          ]}
        >
          <p>{deleteMessageContent}</p>
        </Modal>

        <div>
          <AddScreenButton buttonName='+ Thêm phân loại' buttonClassName='bg-green-500 hover:bg-green-700' toLink='add' />
        </div>
      </div>
    </>
  );
};

export default Category;
