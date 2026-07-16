import React, { useEffect, useState } from "react";
import { apiGetOrderDetail, apiGetOrderInfor, getUserById, apiUpdateOrderInfo, apiConfirmRefund } from "@/apis";
import { TurnBackHeader } from "@/components/admin";
import { Card, Row, Col, Typography, Table, Image, Tag } from "antd";
import product_default from "@/assets/product_default.png";
import { Form, Input, Button, message, Divider } from "antd";
import { Modal } from "antd";
import { toast } from 'react-toastify';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import logo from "@/assets/logo.png";
import { PROMOTION_TYPES, getOrderStatusLabel } from "@/utils/constants";
import { getOrderLinePromotionLabel, hasOrderLineDiscount } from "@/utils/promotion";
import { resolveImageUrl } from "@/utils/helper";



const { Title, Text } = Typography;

const floatingButtonGroupStyle = {
  position: 'fixed',
  bottom: 30,
  right: 30,
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const floatingButtonStyle = {
  width: 220,
  textAlign: 'center',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
};

function OrderDetail() {
  const [orderDetail, setOrderDetail] = useState(null);
  const [orderInformation, setOrderInformation] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [user_Id, setUser_Id] = useState(null);
  const [user, setUser] = useState(null);
  const [totalMoney, setTotalMoney] = useState(0);
  const [isRefunding, setIsRefunding] = useState(false);

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const exportToPDF = async () => {
    const element = document.getElementById('export-content');
    if (!element) {
      message.error('Không tìm thấy nội dung để in.');
      return;
    }
  
    try {
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
  
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
  
      const a = document.createElement('a');
      a.href = url;
      a.download = 'invoice.pdf';
      a.style.display = 'none';
      document.body.appendChild(a);
  
      // Tạo flag kiểm tra click có được gọi không
      let clicked = false;
      a.addEventListener('click', () => {
        clicked = true;
      });
  
      a.click();
  
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
  
        if (clicked) {
          toast.success('Tải xuống hóa đơn thành công 🎉');
        } else {
          toast.warning('Có thể người dùng đã hủy lưu file.');
        }
      }, 2500); // delay nhẹ để giả định thao tác
    } catch (error) {
      toast.error('Không thể tải xuống hóa đơn.');
    }
  };
  
  
  
  const fetchOrderDetail = async (oid) => {
    const res = await apiGetOrderDetail(oid);
    const res2 = await apiGetOrderInfor(oid);
    setOrderDetail(res);
    setOrderInformation(res2);
    setUser_Id(res2?.data?.userId);
  };

  const handleConfirmRefund = async (oid) => {
    if (isRefunding) return;
    setIsRefunding(true);
    try {
      const res = await apiConfirmRefund(oid);
      if (res.statusCode !== 200) {
        throw new Error(res.message || "Không thể xác nhận hoàn tiền");
      }
      message.success("Đã xác nhận hoàn tiền cho đơn hàng");
      await fetchOrderDetail(oid);
    } catch (error) {
      message.error("Có lỗi xảy ra: " + error.message);
    } finally {
      setIsRefunding(false);
    }
  };

  const fetchUserById = async (uid) => {
    const userId = parseInt(uid, 10);
    if (isNaN(userId)) {
      console.error("Invalid user ID");
      return;
    }
    try {
      const res = await getUserById(userId);
      setUser(res);
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const showModal = () => {
    form.setFieldsValue({
      address: orderInformation?.data?.address,
      phone: orderInformation?.data?.phone,
      userEmail: orderInformation?.data?.userEmail,
      userName: orderInformation?.data?.userName,
    });
    setIsModalVisible(true);
  };
  
  const handleCancel = () => {
    setIsModalVisible(false);
  };
  
  const handleUpdateInfo = async () => {
    try {
      const values = await form.validateFields();
      await apiUpdateOrderInfo(oid, {
        address: values.address,
        phone: values.phone,
      });
      message.success("Cập nhật thông tin thành công");
      setIsModalVisible(false);
      fetchOrderDetail(oid); // Làm mới lại thông tin hiển thị
    } catch (err) {
      message.error("Cập nhật thất bại");
    }
  };

  const path = window.location.pathname;
  const oid = path.split("/").pop();

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchOrderDetail(oid);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [oid]);

  useEffect(() => {
    if (user_Id) {
      fetchUserById(user_Id);
    }
  }, [user_Id]);

  useEffect(() => {
    if (orderInformation?.data?.paymentMethod == "COD") {
      setPaymentMethod("Tiền mặt 💵");
    } else if (orderInformation?.data?.paymentMethod == "BANKING") {
      setPaymentMethod("Thẻ ngân hàng 💳");
    }
  }, [orderInformation]);

  useEffect(() => {
    if (orderDetail?.data?.result) {
      const total = orderDetail.data.result.reduce((sum, item) => {
        return sum + getLineTotal(item);
      }, 0);
      setTotalMoney(total);
    }
  }, [orderDetail]);

  // Đơn cũ tạo trước khi có snapshot khuyến mãi có lineTotal = 0 (giá trị DEFAULT của cột mới thêm),
  // không phải null/undefined nên "??" không fallback được -> coi luôn giá trị falsy (0) là "chưa có snapshot".
  const getLineTotal = (item) => item.lineTotal || item.unit_price * item.quantity;

  const columns = [
    {
      title: 'Ảnh',
      dataIndex: 'imageUrl',
      render: (text, record) => (
        <Image
          width={50}
          src={resolveImageUrl(record.imageUrl, "product", product_default)}
          alt={record.productName}
        />
      ),
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'productName',
    },
    {
      title: 'Giá',
      dataIndex: 'unit_price',
      render: (text, record) =>
        hasOrderLineDiscount(record) ? (
          <>
            <div style={{ textDecoration: 'line-through', color: '#999', fontSize: 12 }}>
              {record.originalPrice.toLocaleString("vi-VN")} đ
            </div>
            <div>{record.unit_price.toLocaleString("vi-VN")} đ</div>
          </>
        ) : (
          `${text ? text.toLocaleString("vi-VN") : "0"} đ`
        ),
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
    },
    {
      title: 'Khuyến mãi',
      dataIndex: 'promotionType',
      render: (text, record) => {
        const label = getOrderLinePromotionLabel(record);
        if (!label) return <Text type="secondary">—</Text>;
        const color = record.promotionType === PROMOTION_TYPES.BUY_X_GET_Y ? "green"
          : record.promotionType === PROMOTION_TYPES.BUNDLE_PRICE ? "blue"
          : "orange";
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: 'Tổng cộng',
      dataIndex: 'total',
      render: (text, record) => `${getLineTotal(record).toLocaleString("vi-VN")} đ`,
    },
  ];

  return (
    <div className="w-full">
      <TurnBackHeader
        turnBackPage="/admin/order"
        header="Quay về trang đơn đặt hàng"
      />
      <Card title="Chi tiết đơn hàng" style={{ width: '90%', margin: '20px auto' }}>
        <Row gutter={16}>
          <Col span={12}>
            <Title level={4}>Thông tin khách hàng</Title>
            <Text strong>Tên:</Text> {orderInformation?.data?.userName}<br />
            <Text strong>☎Số điện thoại:</Text> {orderInformation?.data?.phone}<br />
            <Text strong>📍Địa chỉ:</Text> {orderInformation?.data?.address}<br />
            <Text strong>📩Email:</Text> {orderInformation?.data?.userEmail}
          </Col>
          <Col span={12}>
            <Title level={4}>Đơn hàng</Title>
            <Text strong>Tổng số tiền:</Text> {orderInformation?.data?.total_price.toLocaleString("vi-VN")} đ<br />
            <Text strong>Phương thức thanh toán:</Text> {paymentMethod}<br />
            <Text strong>📅 Thời gian đặt hàng:</Text> {new Date(orderInformation?.data?.orderTime)
              .toLocaleString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "numeric",
                month: "numeric",
                year: "numeric",
                hour12: false,
              })}
            <br />
            <Text strong>
              {orderInformation?.data?.status === 0 ? "🕑 Đơn hàng đang chờ xác nhận" :
              orderInformation?.data?.status === 1 ? "✅ Đơn hàng đã được xác nhận" :
              orderInformation?.data?.status === 2 ? `📅 Được chuyển đến lúc: ${new Date(orderInformation?.data?.deliveryTime)
                .toLocaleString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "numeric",
                  month: "numeric",
                  year: "numeric",
                  hour12: false,
                })}` :
              orderInformation?.data?.status === 3 ? `❌ Đơn hàng đã bị hủy lúc: ${new Date(orderInformation?.data?.deliveryTime)
                .toLocaleString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "numeric",
                  month: "numeric",
                  year: "numeric",
                  hour12: false,
                })}` :
              orderInformation?.data?.status === 4 ? "🔄 Khách hàng đã yêu cầu trả hàng hoàn tiền" :
              null}
            </Text>
            <br />
            <Text strong>Thanh toán:</Text>{" "}
            {{
              UNPAID: "Chưa thanh toán",
              PENDING_PAYMENT: "Chờ thanh toán",
              PAID: "Đã thanh toán",
              PAYMENT_FAILED: "Thanh toán thất bại",
              REFUND_PENDING: "Chờ hoàn tiền",
              REFUNDED: "Đã hoàn tiền",
            }[orderInformation?.data?.paymentStatus] || "—"}
          </Col>
        </Row>
      </Card>
      
      <Card title="Cart Items" style={{ width: '90%', margin: '20px auto' }}>
        <Table
          columns={columns}
          dataSource={orderDetail?.data?.result}
          rowKey={(record, index) => `${record.orderId}-${index}`}
          pagination={false}
          summary={() => (
            <Table.Summary fixed>
            {/* Tổng tiền gốc trước giảm */}
            <Table.Summary.Row>
              <Table.Summary.Cell colSpan={5}>
                <Text strong>Tổng tiền gốc</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell>
                <Text>{totalMoney.toLocaleString("vi-VN")} đ</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>

            {/* Dòng giảm giá nếu có mã voucher */}
            {orderInformation?.data?.voucherCode && (
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={5}>
                  <Text type="danger">Giảm giá ({orderInformation.data.voucherCode})</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell>
                  <Text type="danger">
                    - {(orderInformation.data.voucherDiscountAmount || 0).toLocaleString("vi-VN")} đ
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}

            {/* Tổng thanh toán sau khi áp dụng giảm */}
            <Table.Summary.Row>
              <Table.Summary.Cell colSpan={5}>
                <Text strong>Tổng thanh toán</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell>
                <Text strong type="success">
                  {orderInformation?.data?.total_price?.toLocaleString("vi-VN")} đ
                </Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
          )}
        />
      </Card>


  <div style={floatingButtonGroupStyle}>
    <Button
      type="default"
      onClick={exportToPDF}
      style={floatingButtonStyle}
    >
      In hóa đơn 🧾
    </Button>

    {orderInformation?.data?.paymentStatus === "REFUND_PENDING" && (
      <Button
        danger
        loading={isRefunding}
        disabled={isRefunding}
        onClick={() => handleConfirmRefund(oid)}
        style={floatingButtonStyle}
      >
        Đánh dấu đã hoàn tiền
      </Button>
    )}

    {orderInformation?.data?.status === 0 && (
      <Button
        type="primary"
        onClick={showModal}
        style={floatingButtonStyle}
      >
        Cập nhật thông tin giao hàng
      </Button>
    )}
  </div>


      <Modal
        title="Cập nhật thông tin giao hàng"
        open={isModalVisible}
        onCancel={handleCancel}
        onOk={handleUpdateInfo}
        okText="Cập nhật"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
        <Form.Item
          label="Tên người nhận"
          name="userName">
          <Input disabled />
        </Form.Item>
        <Form.Item
          label="Email"
          name="userEmail"
          
        >
          <Input disabled />
        </Form.Item>
        <Form.Item
          label="Số điện thoại"
          name="phone"
          rules={[
            { required: true, message: 'Vui lòng nhập số điện thoại' },
            {
              pattern: /^0\d{8,10}$/,
              message: 'Số điện thoại phải từ 9 đến 11 chữ số và bắt đầu bằng số 0',
            },
          ]}
        >
          <Input maxLength={11} />
        </Form.Item>

        <Form.Item
          label="Địa chỉ"
          name="address"
          rules={[
            { required: true, message: 'Vui lòng nhập địa chỉ' },
            {
              min: 5,
              message: 'Địa chỉ phải có ít nhất 5 ký tự',
            },
          ]}
        >
          <Input />
        </Form.Item>
        </Form>
      </Modal>

      

      <div
        id="export-content"
        style={{
          position: "absolute",
          top: "-9999px",       // đẩy ra ngoài màn hình
          left: "-9999px",
          padding: "40px",
          fontFamily: "Arial",
          color: "#000",
          width: "800px",
          margin: "auto",
          background: "#fff"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
          <div>
            <img src={logo} alt="Logo" style={{ width: "150px" }} />
          </div>
          <div style={{ textAlign: "right" }}>
            <h1 style={{ margin: 0, fontSize: "32px", fontWeight: "bold" }}>INVOICE</h1>
            <p><strong>Mã đơn hàng:</strong> {orderInformation?.data?.id}</p>
            <p><strong>Ngày đặt:</strong> {new Date(orderInformation?.data?.orderTime).toLocaleDateString("vi-VN")}</p>
          </div>
        </div>

        <div style={{ marginBottom: "30px" }}>
          <h3>Bill To:</h3>
          <p><strong>Tên khách hàng:</strong> {orderInformation?.data?.userName}</p>
          <p><strong>Số điện thoại:</strong> {orderInformation?.data?.phone}</p>
          <p><strong>Địa chỉ:</strong> {orderInformation?.data?.address}</p>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "30px" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #000", padding: "8px", textAlign: "left", background: "#f5f5f5" }}>STT</th>
              <th style={{ border: "1px solid #000", padding: "8px", textAlign: "left", background: "#f5f5f5" }}>Tên sản phẩm</th>
              <th style={{ border: "1px solid #000", padding: "8px", textAlign: "left", background: "#f5f5f5" }}>Đơn giá</th>
              <th style={{ border: "1px solid #000", padding: "8px", textAlign: "left", background: "#f5f5f5" }}>Số lượng</th>
              <th style={{ border: "1px solid #000", padding: "8px", textAlign: "left", background: "#f5f5f5" }}>Khuyến mãi</th>
              <th style={{ border: "1px solid #000", padding: "8px", textAlign: "left", background: "#f5f5f5" }}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {orderDetail?.data?.result?.map((item, idx) => (
              <tr key={idx}>
                <td style={{ border: "1px solid #000", padding: "8px" }}>{idx + 1}</td>
                <td style={{ border: "1px solid #000", padding: "8px" }}>{item.productName}</td>
                <td style={{ border: "1px solid #000", padding: "8px" }}>
                  {hasOrderLineDiscount(item) ? (
                    <>
                      <div style={{ textDecoration: 'line-through', color: '#999', fontSize: 11 }}>
                        {item.originalPrice.toLocaleString("vi-VN")} đ
                      </div>
                      <div>{item.unit_price.toLocaleString("vi-VN")} đ</div>
                    </>
                  ) : (
                    `${item.unit_price.toLocaleString("vi-VN")} đ`
                  )}
                </td>
                <td style={{ border: "1px solid #000", padding: "8px" }}>{item.quantity}</td>
                <td style={{ border: "1px solid #000", padding: "8px" }}>
                  {getOrderLinePromotionLabel(item) || "—"}
                </td>
                <td style={{ border: "1px solid #000", padding: "8px" }}>
                  {getLineTotal(item).toLocaleString("vi-VN")} đ
                </td>
              </tr>
            ))}
          </tbody>

        </table>

        <div style={{ textAlign: "right" }}>
          <p><strong>Tổng tiền hàng:</strong> {totalMoney.toLocaleString("vi-VN")} đ</p>
          {orderInformation?.data?.voucherCode && (
            <p style={{ color: "red" }}>
              <strong>Giảm giá ({orderInformation?.data?.voucherCode}):</strong>{" "}
              - {(orderInformation?.data?.voucherDiscountAmount || 0).toLocaleString("vi-VN")} đ
            </p>
          )}
          <p style={{ fontSize: "18px", fontWeight: "bold" }}>
            Tổng thanh toán: {orderInformation?.data?.total_price.toLocaleString("vi-VN")} đ
          </p>
          <p><strong>Hình thức thanh toán:</strong> {orderInformation?.data?.paymentMethod === "COD" ? "Tiền mặt" : "Ngân hàng"}</p>
          <p><strong>Trạng thái:</strong>{" "}
            {getOrderStatusLabel(orderInformation?.data?.status)}
          </p>
        </div>

        <hr style={{ marginTop: "40px" }} />
        <p style={{ textAlign: "center", fontStyle: "italic" }}>Cảm ơn quý khách đã mua hàng!</p>
      </div>

    </div>
  );
}

export default OrderDetail;
