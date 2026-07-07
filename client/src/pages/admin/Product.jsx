import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  apiGetProducts,
  apiBulkUpdateProductActive,
  apiExportProducts,
  apiGetImportTemplate,
  apiImportProducts,
} from "@/apis";
import { MdModeEdit } from "react-icons/md";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  useSearchParams,
  useNavigate,
  createSearchParams,
} from "react-router-dom";
import { AddScreenButton } from "@/components/admin";
import { Table, Modal, Button, Select, Tag, Checkbox, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import product_default from "@/assets/product_default.png";
import { sortProductOption, LOW_STOCK_THRESHOLD } from "@/utils/constants";
import { downloadBlob } from "@/utils/helper";

const PRODUCT_PER_PAGE = 6;

const Product = () => {
  const { categories } = useSelector((state) => state.app);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(Number(params.get("page")) || 1);
  const [products, setProducts] = useState(null);
  const [toggleProduct, setToggleProduct] = useState(null);
  const [showMessage, setShowMessage] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [productName, setProductName] = useState("");
  const [searchTerm, setSearchTerm] = useState(params.get("search") || "");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const search = params.get("search");
  const category = params.get("category");
  const sort = params.get("sort");
  const status = params.get("status"); // 'active' | 'hidden'
  const lowStock = params.get("lowStock"); // '1'

  useEffect(() => {
    setSearchTerm(search || "");
  }, [search]);

  const getQueries = () => {
    const filters = [];
    if (search) filters.push(`productName~'${search}'`);
    if (category) filters.push(`category.id='${category}'`);
    if (status === "active") filters.push(`active=true`);
    if (status === "hidden") filters.push(`active=false`);
    if (lowStock === "1") filters.push(`quantity<=${LOW_STOCK_THRESHOLD}`);

    const queries = { page: currentPage, size: PRODUCT_PER_PAGE, filter: filters };
    if (sort) {
      const [sortField, sortDirection] = sort.split("-");
      queries.sort = `${sortField},${sortDirection}`;
    }
    return queries;
  };

  const fetchProducts = async (queries) => {
    const filterString = queries.filter.join(" and ");
    const response = await apiGetProducts({ ...queries, filter: filterString });
    setProducts(response);
  };

  useEffect(() => {
    fetchProducts(getQueries());
  }, [currentPage, search, category, sort, status, lowStock]);

  const buildParams = (overrides) => {
    const next = {};
    if (search) next.search = search;
    if (category) next.category = category;
    if (sort) next.sort = sort;
    if (status) next.status = status;
    if (lowStock) next.lowStock = lowStock;
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

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      setCurrentPage(1);
      buildParams({ search: searchTerm.trim() || undefined, page: 1 });
    }
  };

  const handleCategoryChange = (value) => {
    setCurrentPage(1);
    buildParams({ category: value, page: 1 });
  };

  const handleSortChange = (value) => {
    setCurrentPage(1);
    buildParams({ sort: value, page: 1 });
  };

  const handleStatusChange = (value) => {
    setCurrentPage(1);
    buildParams({ status: value, page: 1 });
  };

  const handleLowStockChange = (e) => {
    setCurrentPage(1);
    buildParams({ lowStock: e.target.checked ? "1" : undefined, page: 1 });
  };

  const handleToggleActiveProcess = (product) => {
    setToggleProduct(product);
  };

  const handleConfirmToggle = async () => {
    try {
      const res = await apiBulkUpdateProductActive(
        [toggleProduct.id],
        !toggleProduct.active
      );
      if (res.statusCode !== 200) throw new Error(res.message);
      toast.success(
        toggleProduct.active
          ? "Đã ẩn sản phẩm, khách hàng sẽ không thấy sản phẩm này nữa!"
          : "Đã hiện sản phẩm trở lại!",
        { autoClose: 2000 }
      );
      setToggleProduct(null);
      fetchProducts(getQueries());
    } catch (error) {
      toast.error("Cập nhật trạng thái thất bại!", { autoClose: 2000 });
    }
  };

  const handleBulkActive = async (active) => {
    if (selectedRowKeys.length === 0) return;
    try {
      setIsBulkUpdating(true);
      const res = await apiBulkUpdateProductActive(selectedRowKeys, active);
      if (res.statusCode !== 200) throw new Error(res.message);
      toast.success(
        `Đã ${active ? "hiện" : "ẩn"} ${res.data} sản phẩm!`,
        { autoClose: 2000 }
      );
      setSelectedRowKeys([]);
      fetchProducts(getQueries());
    } catch (error) {
      toast.error("Cập nhật hàng loạt thất bại!", { autoClose: 2000 });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await apiExportProducts();
      downloadBlob(blob, "products.xlsx");
    } catch (error) {
      toast.error("Xuất file thất bại!");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await apiGetImportTemplate();
      downloadBlob(blob, "product_import_template.xlsx");
    } catch (error) {
      toast.error("Tải file mẫu thất bại!");
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile) return;
    try {
      setIsImporting(true);
      const res = await apiImportProducts(importFile);
      if (res.statusCode !== 200) throw new Error(res.message);
      setImportResult(res.data);
      if (res.data?.successCount > 0) {
        fetchProducts(getQueries());
      }
    } catch (error) {
      toast.error("Import thất bại: " + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportResult(null);
  };

  const handleShowMessage = (detailProduct, name) => {
    setMessageContent(`Chi tiết sản phẩm: ${detailProduct}`);
    setProductName(name);
    setShowMessage(true);
  };

  const categoryOptions =
    categories?.map((c) => ({ label: c.name, value: String(c.id) })) || [];

  const statusOptions = [
    { label: "Đang bán", value: "active" },
    { label: "Đã ẩn", value: "hidden" },
  ];

  const columns = [
    {
      title: "Ảnh",
      dataIndex: "imageUrl",
      key: "imageUrl",
      render: (text, record) => (
        <img
          src={
            record.imageUrl
              ? record.imageUrl.startsWith("https")
                ? record.imageUrl
                : `${import.meta.env.VITE_BACKEND_TARGET}/storage/product/${record.imageUrl
                }`
              : product_default
          }
          alt={record.product_name || "Product Image"}
          style={{ width: "80px", height: "70px", objectFit: "cover" }}
        />
      ),
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "product_name",
      key: "product_name",
    },
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      render: (sku) => sku || <span className="text-gray-400">—</span>,
    },
    {
      title: "Giá",
      dataIndex: "price",
      key: "price",
      render: (_, record) => {
        const hasSale =
          record.originalPrice && record.originalPrice > record.price;
        return (
          <div>
            {hasSale && (
              <div className="text-gray-400 line-through text-xs">
                {record.originalPrice.toLocaleString("vi-VN")} đ
              </div>
            )}
            <span>{record.price.toLocaleString("vi-VN")} đ</span>
            {hasSale && (
              <Tag color="red" style={{ marginLeft: 4 }}>
                -{Math.round((1 - record.price / record.originalPrice) * 100)}%
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      render: (quantity) => {
        if (quantity <= 0)
          return (
            <span>
              <span className="text-red-500 font-semibold">{quantity}</span>{" "}
              <Tag color="red">Hết hàng</Tag>
            </span>
          );
        if (quantity <= LOW_STOCK_THRESHOLD)
          return (
            <span>
              <span className="text-orange-500 font-semibold">{quantity}</span>{" "}
              <Tag color="orange">Sắp hết</Tag>
            </span>
          );
        return quantity;
      },
    },
    {
      title: "Phân loại",
      dataIndex: "category",
      key: "category",
    },
    {
      title: "Đánh giá",
      dataIndex: "rating",
      key: "rating",
    },
    {
      title: "Đã bán",
      dataIndex: "sold",
      key: "sold",
    },
    {
      title: "Trạng thái",
      dataIndex: "active",
      key: "active",
      render: (active) =>
        active === false ? (
          <Tag color="default">Đã ẩn</Tag>
        ) : (
          <Tag color="green">Đang bán</Tag>
        ),
    },
    {
      title: "Chi tiết",
      key: "details",
      render: (_, record) => (
        <Button
          type="link"
          onClick={() =>
            handleShowMessage(record.description, record.product_name)
          }
        >
          Xem chi tiết
        </Button>
      ),
    },
    {
      title: "Sửa",
      key: "edit",
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => navigate(`${location.pathname}/edit/${record.id}`)}
        >
          <MdModeEdit className="w-5 h-5 inline-block" />
        </Button>
      ),
    },
    {
      title: "Ẩn/Hiện",
      key: "toggleActive",
      render: (_, record) => (
        <Button
          type="link"
          danger={record.active !== false}
          onClick={() => handleToggleActiveProcess(record)}
        >
          {record.active === false ? "Hiện" : "Ẩn"}
        </Button>
      ),
    },
  ];

  return (
    <div className="w-full">
      <div className="mb-4 flex gap-4 items-center flex-wrap">
        <input
          type="text"
          placeholder="Tìm kiếm theo tên sản phẩm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="w-[300px] border border-gray-300 rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <Select
          placeholder="Lọc theo phân loại"
          options={categoryOptions}
          onChange={handleCategoryChange}
          allowClear
          style={{ width: 200 }}
        />
        <Select
          placeholder="Lọc theo trạng thái"
          options={statusOptions}
          value={status || undefined}
          onChange={handleStatusChange}
          allowClear
          style={{ width: 160 }}
        />
        <Select
          placeholder="Sắp xếp"
          options={sortProductOption}
          onChange={handleSortChange}
          allowClear
          style={{ width: 200 }}
        />
        <Checkbox checked={lowStock === "1"} onChange={handleLowStockChange}>
          Sắp hết hàng (≤{LOW_STOCK_THRESHOLD})
        </Checkbox>
        <Button loading={isExporting} onClick={handleExport}>
          Xuất Excel
        </Button>
        <Button onClick={() => setShowImportModal(true)}>Nhập Excel</Button>
      </div>

      {selectedRowKeys.length > 0 && (
        <div className="mb-4 flex gap-3 items-center bg-gray-50 border rounded-lg px-4 py-2">
          <span className="text-sm">
            Đã chọn <b>{selectedRowKeys.length}</b> sản phẩm
          </span>
          <Button
            size="small"
            danger
            loading={isBulkUpdating}
            onClick={() => handleBulkActive(false)}
          >
            Ẩn đã chọn
          </Button>
          <Button
            size="small"
            loading={isBulkUpdating}
            onClick={() => handleBulkActive(true)}
          >
            Hiện đã chọn
          </Button>
          <Button size="small" type="link" onClick={() => setSelectedRowKeys([])}>
            Bỏ chọn
          </Button>
        </div>
      )}

      <Table
        dataSource={products?.data?.result}
        columns={columns}
        rowKey="id"
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        rowClassName={(record) =>
          record.active === false
            ? "opacity-60"
            : record.quantity <= LOW_STOCK_THRESHOLD
              ? "bg-orange-50"
              : ""
        }
        pagination={{
          current: currentPage,
          pageSize: PRODUCT_PER_PAGE,
          onChange: handlePagination,
          total: products?.data?.meta?.total,
        }}
      />
      <Modal
        title={
          toggleProduct?.active === false
            ? "Xác nhận hiện sản phẩm"
            : "Xác nhận ẩn sản phẩm"
        }
        open={!!toggleProduct}
        onCancel={() => setToggleProduct(null)}
        footer={[
          <Button key="cancel" onClick={() => setToggleProduct(null)}>
            Đóng
          </Button>,
          <Button
            key="confirm"
            type="primary"
            danger={toggleProduct?.active !== false}
            onClick={handleConfirmToggle}
          >
            Xác nhận
          </Button>,
        ]}
      >
        <p>
          {toggleProduct?.active === false
            ? `Hiện lại sản phẩm "${toggleProduct?.product_name}" cho khách hàng?`
            : `Ẩn sản phẩm "${toggleProduct?.product_name}"? Khách hàng sẽ không thấy và không mua được sản phẩm này nữa (dữ liệu đơn hàng/đánh giá cũ vẫn giữ nguyên).`}
        </p>
      </Modal>

      <Modal
        title={`Sản phẩm: ${productName}`}
        open={showMessage}
        onCancel={() => setShowMessage(false)}
        footer={[
          <Button key="close" onClick={() => setShowMessage(false)}>
            Đóng
          </Button>,
        ]}
      >
        <p>{messageContent}</p>
      </Modal>

      <Modal
        title="Nhập sản phẩm từ Excel"
        open={showImportModal}
        onCancel={handleCloseImportModal}
        footer={[
          <Button key="close" onClick={handleCloseImportModal}>
            Đóng
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={isImporting}
            disabled={!importFile}
            onClick={handleImportSubmit}
          >
            Import
          </Button>,
        ]}
      >
        <p>
          Sản phẩm có <b>SKU</b> trùng với sản phẩm đã tồn tại sẽ được cập nhật, không có SKU hoặc SKU mới sẽ tạo sản phẩm mới.
        </p>
        <Button type="link" onClick={handleDownloadTemplate} style={{ padding: 0, marginBottom: 12 }}>
          Tải file mẫu
        </Button>
        <Upload.Dragger
          accept=".xlsx"
          maxCount={1}
          beforeUpload={(file) => {
            setImportFile(file);
            setImportResult(null);
            return false;
          }}
          onRemove={() => setImportFile(null)}
          fileList={importFile ? [importFile] : []}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p>Kéo thả hoặc bấm để chọn file .xlsx</p>
        </Upload.Dragger>

        {importResult && (
          <div className="mt-4">
            <p>
              Đã import thành công <b>{importResult.successCount}</b>/{importResult.totalRows} dòng.
            </p>
            {importResult.errors?.length > 0 && (
              <div className="max-h-60 overflow-y-auto border rounded">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-2 text-left">Dòng</th>
                      <th className="p-2 text-left">Lỗi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.errors.map((err) => (
                      <tr key={err.row} className="border-t">
                        <td className="p-2">{err.row}</td>
                        <td className="p-2 text-red-500">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      <div>
        <AddScreenButton
          buttonName="+ Thêm sản phẩm mới"
          buttonClassName="bg-green-500 hover:bg-green-700"
          toLink="add"
        />
      </div>
    </div>
  );
};

export default Product;
