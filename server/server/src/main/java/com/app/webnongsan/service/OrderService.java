package com.app.webnongsan.service;

import com.app.webnongsan.domain.*;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.domain.response.order.OrderBreakdownDTO;
import com.app.webnongsan.domain.response.order.OrderDTO;
import com.app.webnongsan.domain.response.order.OrderDetailDTO;
import com.app.webnongsan.domain.response.order.OverviewStatsDTO;
import com.app.webnongsan.domain.response.order.PaymentStatusCountDTO;
import com.app.webnongsan.domain.response.order.StatusCountDTO;
import com.app.webnongsan.domain.response.order.TopProductDTO;
import com.app.webnongsan.domain.response.order.WeeklyRevenue;
import com.app.webnongsan.domain.response.product.ProductReturnStatsDTO;
import com.app.webnongsan.repository.*;
import com.app.webnongsan.util.PaginationHelper;
import com.app.webnongsan.util.SecurityUtil;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import com.app.webnongsan.util.testcomponent.AddressValidator;
import com.app.webnongsan.util.testcomponent.PhoneValidator;
import com.app.webnongsan.util.testcomponent.ValidationResult;
import lombok.AllArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;


@Service
@AllArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final OrderDetailRepository orderDetailRepository;
    private final VoucherRepository voucherRepository;
    private final UserVoucherRepository userVoucherRepository;
    private final UserService userService;
    private final ProductRepository productRepository;
    private final PaginationHelper paginationHelper;
    private final PromotionService promotionService;
    private final VoucherValidationService voucherValidationService;
    @Autowired
    private final AddressValidator addressValidator;
    @Autowired
    private final PhoneValidator phoneValidator;

    public Order get(long id) {
        return this.orderRepository.findById(id).orElse(null);
    }

    public Order save(Order order) {
        return this.orderRepository.save(order);
    }

    public void delete(long id) {
        this.orderRepository.deleteById(id);
    }

    // status 2 = Succeed, 4 = Returned (chỉ có thể trả hàng từ đơn đã giao thành công, xem isValidStatusTransition
    // trong OrderController) -> "đã giao" = Succeed + Returned, tỉ lệ hoàn trả = Returned / đã giao
    public ProductReturnStatsDTO getProductReturnStats(Long productId) {
        long succeeded = this.orderRepository.countOrdersByProductIdAndStatus(productId, 2);
        long returned = this.orderRepository.countOrdersByProductIdAndStatus(productId, 4);
        long delivered = succeeded + returned;

        ProductReturnStatsDTO dto = new ProductReturnStatsDTO();
        dto.setDeliveredCount(delivered);
        dto.setReturnedCount(returned);
        dto.setReturnRate(delivered > 0 ? (double) returned / delivered * 100 : 0);
        return dto;
    }


    public List<OrderDTO> getLastFiveOrders() {
        Pageable pageable = PageRequest.of(0, 5, Sort.by("id").descending());
        List<Order> orders = this.orderRepository.findAll(pageable).getContent();
        return orders.stream()
                .map(this::convertToOrderDTO)
                .collect(Collectors.toList());
    }


    public Optional<OrderDTO> findOrder(long id) {
        return this.orderRepository.findById(id).map(this::convertToOrderDTO);
    }

    public PaginationDTO getAll(Specification<Order> spec, Pageable pageable) {

        Page<Order> ordersPage = this.orderRepository.findAll(spec, pageable);

        PaginationDTO p = new PaginationDTO();
        PaginationDTO.Meta meta = new PaginationDTO.Meta();

        meta.setPage(pageable.getPageNumber() + 1);
        meta.setPageSize(pageable.getPageSize());
        meta.setPages(ordersPage.getTotalPages());
        meta.setTotal(ordersPage.getTotalElements());

        p.setMeta(meta);

        List<OrderDTO> listOrders = ordersPage.getContent().stream().map(this::convertToOrderDTO).toList();
        p.setResult(listOrders);
        return p;
    }

    public long getTotalOrdersByUserId(Long userId) {
        return this.orderRepository.countByUser_Id(userId);
    }

    public PaginationDTO getOrdersByUserId(Long userId, Pageable pageable) {
        Page<Order> ordersPage = this.orderRepository.findOrdersWithOptionalStatus(userId, null, pageable);

        PaginationDTO p = new PaginationDTO();
        PaginationDTO.Meta meta = new PaginationDTO.Meta();

        meta.setPage(pageable.getPageNumber() + 1);
        meta.setPageSize(pageable.getPageSize());
        meta.setPages(ordersPage.getTotalPages());
        meta.setTotal(ordersPage.getTotalElements());

        p.setMeta(meta);

        List<OrderDTO> listOrders = ordersPage.getContent().stream().map(this::convertToOrderDTO).toList();
        p.setResult(listOrders);
        return p;
    }

    public OrderDTO convertToOrderDTO(Order order) {
        OrderDTO res = new OrderDTO();
        res.setId(order.getId());
        res.setOrderTime(order.getOrderTime());
        res.setDeliveryTime(order.getDeliveryTime());
        res.setStatus(order.getStatus());
        res.setPaymentMethod(order.getPaymentMethod());
        res.setAddress(order.getAddress());
        res.setPhone(order.getPhone());
        res.setTotal_price(order.getTotal_price());
        res.setTotalPrice(order.getTotal_price());
        res.setPaymentStatus(order.getPaymentStatus());
        res.setUserEmail(order.getUser().getEmail());
        res.setUserId(order.getUser().getId());
        res.setUserName(order.getUser().getName());

        // Đọc từ snapshot lưu tại thời điểm đặt hàng — KHÔNG đọc order.getVoucher().getX() (field
        // sống, có thể bị admin sửa sau này làm sai lệch số liệu hiển thị cho đơn hàng cũ).
        if (order.getVoucher() != null) {
            res.setVoucherId(order.getVoucher().getId());
            res.setVoucherCode(order.getVoucherCode());
            res.setVoucherType(order.getVoucherType());
            res.setVoucherDiscountValue(order.getVoucherDiscountValue());
            res.setVoucherDiscountAmount(order.getVoucherDiscountAmount());
        }

        return res;
    }


    // @Transactional: nếu bất kỳ bước nào sau khi voucher đã được áp (usedCount tăng, UserVoucher
    // ghi nhận) bị lỗi (VD lưu OrderDetail thất bại), toàn bộ phải rollback — trước đây không có
    // transaction nên usedCount có thể bị tăng "khống" dù đơn hàng thất bại hoàn toàn. KHÔNG ảnh
    // hưởng trừ kho: trừ kho (apiUpdateProduct) là 1 HTTP request RIÊNG do FE gọi SAU KHI đơn tạo
    // thành công, nằm ngoài hoàn toàn method này.
    @Transactional
    public Order create(OrderDTO orderDTO) throws ResourceInvalidException {
        // Validate address before processing
        ValidationResult addressValidation = addressValidator.validateAddress(orderDTO.getAddress());
        if (!addressValidation.isValid()) {
            throw new ResourceInvalidException(addressValidation.getErrorMessage());
        }

        // Validate phone number before processing
        ValidationResult phoneValidation = phoneValidator.validatePhoneNumber(orderDTO.getPhone());
        if (!phoneValidation.isValid()) {
            throw new ResourceInvalidException(phoneValidation.getErrorMessage());
        }

        String emailLoggedIn = SecurityUtil.getCurrentUserLogin().orElse("");
        User currentUserDB = userService.getUserByUsername(emailLoggedIn);

        // Fetch sản phẩm + tính giá/khuyến mãi ĐÚNG 1 LẦN mỗi item, lưu lại snapshot dùng chung cho cả
        // bước tính total (voucher) LẪN bước lưu OrderDetail bên dưới — trước đây tách 2 vòng lặp riêng
        // biệt (mỗi vòng tự fetch + tự gọi calculateLineTotal()) gây N+1 query thừa, và có khe hở TOCTOU
        // thật: nếu giá/khuyến mãi đổi đúng lúc giữa 2 vòng lặp (VD Flash Sale window vừa kết thúc),
        // total_price của Order sẽ lệch với tổng line_total thực lưu trong order_detail.
        double total = 0;
        List<VoucherValidationService.ItemLine> itemLines = new ArrayList<>();
        List<OrderItemSnapshot> itemSnapshots = new ArrayList<>();
        for (OrderDetailDTO item : orderDTO.getItems()) {
            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new ResourceInvalidException("Sản phẩm không tồn tại"));
            if(product.getQuantity() <= 0) throw new ResourceInvalidException("Sản phẩm không còn hàng");
            PromotionService.LineTotal lineTotal = promotionService.calculateLineTotal(product, item.getQuantity(), currentUserDB.getId());
            // Tồn kho phải đủ cho cả số lượng trả tiền LẪN quà tặng đi kèm (BUY_X_GET_Y) — cả 2 lấy chung 1 kho
            if(item.getQuantity() + lineTotal.getFreeUnits() > product.getQuantity()) throw new ResourceInvalidException("Sản phẩm không còn đủ hàng");
            double unitPrice = promotionService.getEffectiveUnitPrice(product, currentUserDB.getId());
            total += lineTotal.getTotal();
            itemLines.add(new VoucherValidationService.ItemLine(product.getId(), lineTotal.getTotal()));
            itemSnapshots.add(new OrderItemSnapshot(product, item.getQuantity(), lineTotal, unitPrice));
        }


        // Khởi tạo đơn hàng
        Order order = new Order();
        order.setUser(currentUserDB);
        order.setAddress(orderDTO.getAddress());
        order.setPhone(orderDTO.getPhone());
        order.setPaymentMethod(orderDTO.getPaymentMethod());
        order.setStatus(0);
        order.setPaymentStatus("COD".equalsIgnoreCase(orderDTO.getPaymentMethod()) ? "UNPAID" : "PENDING_PAYMENT");

        // Áp dụng voucher nếu có
        total = applyVoucherToOrder(order, orderDTO, currentUserDB, total, itemLines);

        order.setTotal_price(total);
        Order savedOrder = orderRepository.save(order);

        // Lưu chi tiết đơn hàng — dùng lại đúng snapshot (product/lineTotal/unitPrice) đã tính ở vòng
        // lặp trên, không fetch/tính lại lần 2 (xem comment ở vòng lặp đầu).
        for (OrderItemSnapshot snap : itemSnapshots) {
            Product product = snap.product();
            double unitPrice = snap.unitPrice();
            // unit_price = giá KHÁCH THỰC TRẢ mỗi đơn vị; originalPrice = giá tham chiếu cao hơn để
            // hiển thị gạch ngang, chỉ có giá trị khi đang thực sự giảm giá.
            boolean discountActive = unitPrice < product.getPrice();

            OrderDetail orderDetail = new OrderDetail();
            OrderDetailId id = new OrderDetailId();
            id.setOrderId(savedOrder.getId());
            id.setProductId(product.getId());
            orderDetail.setId(id);
            orderDetail.setOrder(savedOrder);
            orderDetail.setProduct(product);
            orderDetail.setQuantity(snap.quantity());
            orderDetail.setUnit_price(unitPrice);
            orderDetail.setLineTotal(snap.lineTotal().getTotal());
            orderDetail.setPromotionType(product.getPromotionType() == null ? "NONE" : product.getPromotionType());
            orderDetail.setFreeUnits(snap.lineTotal().getFreeUnits());
            orderDetail.setPromoBundleQuantity(product.getPromoBundleQuantity());
            orderDetail.setPromoBundlePrice(product.getPromoBundlePrice());
            orderDetail.setOriginalPrice(discountActive ? product.getPrice() : null);
            orderDetailRepository.save(orderDetail);
        }

        return savedOrder;
    }

    // Snapshot 1 dòng sản phẩm đã fetch + tính giá — dùng chung giữa bước tính total (voucher) và
    // bước lưu OrderDetail trong create(), tránh fetch/tính lại lần 2 (xem comment trong create()).
    private record OrderItemSnapshot(Product product, int quantity, PromotionService.LineTotal lineTotal, double unitPrice) {}

    private double applyVoucherToOrder(Order order, OrderDTO orderDTO, User user, double total,
                                        List<VoucherValidationService.ItemLine> itemLines) throws ResourceInvalidException {
        if (orderDTO.getVoucherId() == null && orderDTO.getVoucherCode() == null) return total;

        VoucherValidationService.VoucherResolution res = voucherValidationService
                .resolveAndValidate(orderDTO.getVoucherId(), orderDTO.getVoucherCode(), user, total, itemLines, true);
        Voucher voucher = res.getVoucher();

        // Atomic — enforcement THẬT của maxUsage, chặn race condition giữa các request đồng thời
        // (check advisory ở resolveAndValidate phía trên không đủ an toàn một mình).
        int updated = voucherRepository.incrementUsedCountIfAvailable(voucher.getId());
        if (updated == 0) throw new ResourceInvalidException("Mã giảm giá đã dùng hết");

        try {
            UserVoucher userVoucher = res.getExistingUserVoucher();
            if (userVoucher != null) {
                userVoucher.setIsUsed(true);
                userVoucher.setAssignedAt(Instant.now());
                userVoucherRepository.save(userVoucher);
            } else {
                // Voucher public dùng lần đầu qua mã (chưa từng được assign vào ví user)
                UserVoucher newUV = new UserVoucher();
                newUV.setUser(user);
                newUV.setVoucher(voucher);
                newUV.setIsUsed(true);
                newUV.setAssignedAt(Instant.now());
                userVoucherRepository.save(newUV);
            }
        } catch (DataIntegrityViolationException e) {
            // Backstop DB-level (unique constraint user_id+voucher_id) cho race hiếm giữa 2 request
            // cùng user cùng lúc dùng voucher lần đầu
            throw new ResourceInvalidException("Mã giảm giá đã được sử dụng");
        }

        order.setVoucher(voucher);
        order.setVoucherCode(voucher.getCode());
        order.setVoucherType(voucher.getType().name());
        order.setVoucherDiscountValue(voucher.getDiscountValue());
        order.setVoucherDiscountAmount(res.getDiscountAmount());

        return res.getTotalAfterDiscount();
    }


    public PaginationDTO getOrderByCurrentUser(Pageable pageable, Integer status) throws ResourceInvalidException {
        String email = SecurityUtil.getCurrentUserLogin().orElse("");
        User user = this.userRepository.findByEmail(email);

        if (user == null) {
            throw new ResourceInvalidException("User không tồn tại");
        }

        Page<Order> ordersPage = orderRepository.findOrdersWithOptionalStatus(user.getId(), status, pageable);

        // 1 query duy nhất cho cả trang (thay vì findByOrderId() trong vòng lặp per-order — N+1),
        // rồi group lại theo orderId phía Java.
        List<Long> orderIds = ordersPage.getContent().stream().map(Order::getId).toList();
        Map<Long, List<OrderDetail>> detailsByOrderId = orderDetailRepository.findByOrderIdIn(orderIds).stream()
                .collect(Collectors.groupingBy(d -> d.getId().getOrderId()));

        // Convert to DTOs
        List<OrderDetailDTO> orderDetailDTOs = new ArrayList<>();

        for (Order order : ordersPage.getContent()) {
            List<OrderDetail> details = detailsByOrderId.getOrDefault(order.getId(), List.of());
            for (OrderDetail detail : details) {
                OrderDetailDTO dto = new OrderDetailDTO();
                dto.setOrderId(order.getId());
                dto.setOrderTime(order.getOrderTime());
                dto.setStatus(order.getStatus());
                dto.setDeliveryTime(order.getDeliveryTime());
                dto.setPaymentStatus(order.getPaymentStatus());
                dto.setProductId(detail.getProduct().getId());
                dto.setProductName(detail.getProduct().getProductName());
                dto.setQuantity(detail.getQuantity());
                dto.setUnit_price(detail.getUnit_price());
                dto.setLineTotal(detail.getLineTotal());
                dto.setPromotionType(detail.getPromotionType());
                dto.setFreeUnits(detail.getFreeUnits());
                dto.setPromoBundleQuantity(detail.getPromoBundleQuantity());
                dto.setPromoBundlePrice(detail.getPromoBundlePrice());
                dto.setOriginalPrice(detail.getOriginalPrice());
                dto.setImageUrl(detail.getProduct().getImageUrl());
                dto.setCategory(detail.getProduct().getCategory().getName());

                // Đọc từ snapshot lưu tại thời điểm đặt hàng (xem convertToOrderDTO — cùng lý do)
                if (order.getVoucher() != null) {
                    dto.setVoucherId(order.getVoucher().getId());
                    dto.setVoucherCode(order.getVoucherCode());
                    dto.setVoucherType(order.getVoucherType());
                    dto.setVoucherDiscountValue(order.getVoucherDiscountValue());
                    dto.setVoucherDiscountAmount(order.getVoucherDiscountAmount());
                }

                orderDetailDTOs.add(dto);
            }
        }
        return paginationHelper.buildPaginationFromList(orderDetailDTOs, ordersPage.getTotalElements(), pageable);
    }

    public List<WeeklyRevenue> getMonthlyRevenue(int month, int year) {
        List<Object[]> results = orderRepository.getMonthlyRevenue(month, year);
        List<WeeklyRevenue> weeklyRevenues = new ArrayList<>();

        for (Object[] result : results) {
            String days = String.valueOf(result[0]);
            double totalRevenue = (Double) result[1];
            weeklyRevenues.add(new WeeklyRevenue(days, totalRevenue));
        }
        return weeklyRevenues;
    }

    public OverviewStatsDTO getOverviewStats() {
        long totalUsers = userRepository.count();
        double totalProfit = orderRepository.sumTotalPriceByPaymentStatus("PAID");
        long totalOrders = orderRepository.count();
        long totalProducts = productRepository.count();
        return new OverviewStatsDTO(totalProfit, totalUsers, totalProducts, totalOrders);
    }

    private static final int[] ORDER_STATUSES = {0, 1, 2, 3, 4};
    private static final String[] PAYMENT_STATUSES =
            {"UNPAID", "PENDING_PAYMENT", "PAID", "PAYMENT_FAILED", "REFUND_PENDING", "REFUNDED"};

    // Khoảng [đầu tháng, đầu tháng sau) theo giờ hệ thống — dùng chung cho mọi biểu đồ Overview lọc
    // theo tháng/năm (order-status-stats, top-products, feedback-rating-distribution).
    private Instant[] monthRange(int month, int year) {
        YearMonth ym = YearMonth.of(year, month);
        Instant start = ym.atDay(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant end = ym.plusMonths(1).atDay(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
        return new Instant[]{start, end};
    }

    public OrderBreakdownDTO getOrderBreakdown(int month, int year) {
        Instant[] range = monthRange(month, year);
        Instant start = range[0];
        Instant end = range[1];

        List<StatusCountDTO> byStatus = new ArrayList<>();
        for (int status : ORDER_STATUSES) {
            long count = orderRepository.countByStatusAndOrderTimeBetween(status, start, end);
            double revenue = orderRepository.sumTotalPriceByStatusAndMonth(status, start, end);
            byStatus.add(new StatusCountDTO(status, count, revenue));
        }

        List<PaymentStatusCountDTO> byPaymentStatus = new ArrayList<>();
        for (String paymentStatus : PAYMENT_STATUSES) {
            long count = orderRepository.countByPaymentStatusAndOrderTimeBetween(paymentStatus, start, end);
            double revenue = orderRepository.sumTotalPriceByPaymentStatusAndMonth(paymentStatus, start, end);
            byPaymentStatus.add(new PaymentStatusCountDTO(paymentStatus, count, revenue));
        }

        return new OrderBreakdownDTO(byStatus, byPaymentStatus);
    }

    /**
     * Top N sản phẩm bán chạy trong 1 tháng (theo số lượng bán, chỉ tính đơn PAID) — dùng cho biểu đồ
     * "Top 5 sản phẩm bán chạy" ở Overview admin, thay cho Product.sold (cột cộng dồn toàn thời gian).
     */
    public List<TopProductDTO> getTopSellingProducts(int month, int year, int limit) {
        Instant[] range = monthRange(month, year);
        List<Object[]> rows = orderDetailRepository.findTopSellingProductsByMonth(
                range[0], range[1], PageRequest.of(0, limit));
        List<TopProductDTO> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(new TopProductDTO((Long) row[0], (String) row[1], (Long) row[2]));
        }
        return result;
    }
}
