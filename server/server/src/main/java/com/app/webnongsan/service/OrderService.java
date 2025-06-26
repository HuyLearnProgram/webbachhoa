package com.app.webnongsan.service;

import com.app.webnongsan.domain.*;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.domain.response.order.OrderDTO;
import com.app.webnongsan.domain.response.order.OrderDetailDTO;
import com.app.webnongsan.domain.response.order.WeeklyRevenue;
import com.app.webnongsan.repository.*;
import com.app.webnongsan.util.PaginationHelper;
import com.app.webnongsan.util.SecurityUtil;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import com.app.webnongsan.util.testcomponent.AddressValidator;
import com.app.webnongsan.util.testcomponent.PhoneValidator;
import com.app.webnongsan.util.testcomponent.ValidationResult;
import lombok.AllArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
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


    public List<OrderDTO> getLastFiveOrders() {
        Pageable pageable = PageRequest.of(0, 5, Sort.by("id").descending());
        List<Order> orders = this.orderRepository.findAll(pageable).getContent();
        return orders.stream()
                .map(this::convertToOrderDTO)
                .collect(Collectors.toList());
    }


    public Optional<OrderDTO> findOrder(long id) {
        OrderDTO res = new OrderDTO();
        Optional<Order> orderOptional = this.orderRepository.findById(id);
        if (orderOptional.isPresent()) {
            Order order = orderOptional.get();
            res.setId(order.getId());
            res.setOrderTime(order.getOrderTime());
            res.setDeliveryTime(order.getDeliveryTime());
            res.setStatus(order.getStatus());
            res.setPaymentMethod(order.getPaymentMethod());
            res.setAddress(order.getAddress());
            res.setTotal_price(order.getTotal_price()); // Chú ý: có thể cần sửa lại tên phương thức
            res.setUserEmail(order.getUser().getEmail());
            res.setUserId(order.getUser().getId());
            res.setUserName(order.getUser().getName());
            res.setPhone(order.getPhone());


            if (order.getVoucher() != null) {
                Voucher voucher = order.getVoucher();
                res.setVoucherId(voucher.getId());
                res.setVoucherCode(voucher.getCode());
                res.setVoucherType(voucher.getType().name()); // PERCENT / FIXED
                res.setVoucherDiscountValue(voucher.getDiscountValue());
            }
            return Optional.of(res);
        } else {
            return Optional.empty();
        }
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

    public OrderDTO cancelOrder(Long id) throws ResourceInvalidException {

        Optional<Order> orderOptional = orderRepository.findById(id);
        Order o = new Order();
        OrderDTO orderDTO = new OrderDTO();
        if (orderOptional.isPresent()) {
            o = orderOptional.get();
            if (o.getStatus() == 0) o.setStatus(1);
            else o.setStatus(3);
            this.orderRepository.save(o);
            orderDTO.setId(o.getId());
            orderDTO.setOrderTime(o.getOrderTime());
            orderDTO.setDeliveryTime(o.getDeliveryTime());
            orderDTO.setStatus(o.getStatus());
            orderDTO.setPaymentMethod(o.getPaymentMethod());

            orderDTO.setAddress(o.getAddress());
            orderDTO.setTotal_price(o.getTotal_price());
            orderDTO.setTotalPrice(o.getTotal_price());

            orderDTO.setUserEmail(o.getUser().getEmail());
            orderDTO.setUserId(o.getUser().getId());
            orderDTO.setUserName(o.getUser().getName());
        }


        return orderDTO;
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
        res.setUserEmail(order.getUser().getEmail());
        res.setUserId(order.getUser().getId());
        res.setUserName(order.getUser().getName());

        if (order.getVoucher() != null) {
            Voucher voucher = order.getVoucher();
            res.setVoucherId(voucher.getId());
            res.setVoucherCode(voucher.getCode());
            res.setVoucherType(voucher.getType().name()); // PERCENT / FIXED
            res.setVoucherDiscountValue(voucher.getDiscountValue());
        }

        return res;
    }


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

        double total = 0;
        for (OrderDetailDTO item : orderDTO.getItems()) {
            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new ResourceInvalidException("Sản phẩm không tồn tại"));
            if(product.getQuantity() <= 0) throw new ResourceInvalidException("Sản phẩm không còn hàng");
            if(item.getQuantity() > product.getQuantity()) throw new ResourceInvalidException("Sản phẩm không còn đủ hàng");
            total += product.getPrice() * item.getQuantity();
        }


        // Khởi tạo đơn hàng
        Order order = new Order();
        order.setUser(currentUserDB);
        order.setAddress(orderDTO.getAddress());
        order.setPhone(orderDTO.getPhone());
        order.setPaymentMethod(orderDTO.getPaymentMethod());
        order.setStatus(0);

        // Áp dụng voucher nếu có
        total = applyVoucherToOrder(order, orderDTO, currentUserDB, total);

        order.setTotal_price(total);
        Order savedOrder = orderRepository.save(order);

        // Lưu chi tiết đơn hàng
        orderDTO.getItems().forEach(item -> {
            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new RuntimeException("Sản phẩm không tồn tại"));
            OrderDetail orderDetail = new OrderDetail();
            OrderDetailId id = new OrderDetailId();
            id.setOrderId(savedOrder.getId());
            id.setProductId(product.getId());
            orderDetail.setId(id);
            orderDetail.setOrder(savedOrder);
            orderDetail.setProduct(product);
            orderDetail.setQuantity(item.getQuantity());
            orderDetail.setUnit_price(product.getPrice());
            orderDetailRepository.save(orderDetail);
        });

        return savedOrder;
    }

    private double applyVoucherToOrder(Order order, OrderDTO orderDTO, User user, double total) throws ResourceInvalidException {
        if (orderDTO.getVoucherId() == null && orderDTO.getVoucherCode() == null) return total;

        Voucher voucher = (orderDTO.getVoucherId() != null)
                ? voucherRepository.findById(orderDTO.getVoucherId())
                .orElseThrow(() -> new ResourceInvalidException("Voucher không tồn tại"))
                : voucherRepository.findByCode(orderDTO.getVoucherCode())
                .orElseThrow(() -> new ResourceInvalidException("Mã giảm giá không tồn tại"));

        if (!voucher.isActiveNow())
            throw new ResourceInvalidException("Voucher không còn hiệu lực");

        if (voucher.getMinimumOrderAmount() != null && total < voucher.getMinimumOrderAmount())
            throw new ResourceInvalidException("Đơn hàng không đủ điều kiện để sử dụng voucher");
        if(voucher.getUsedCount() >= voucher.getMaxUsage())
            throw new ResourceInvalidException("Mã giảm giá đã dùng hết");

        // Tính giảm giá
        double discount = voucher.getType() == Voucher.VoucherType.PERCENT
                ? total * voucher.getDiscountValue() / 100.0
                : voucher.getDiscountValue();

        // Giảm giá hợp lệ
        total = Math.max(0, total - discount);
        order.setVoucher(voucher);

        // Cập nhật usage
        voucher.setUsedCount((voucher.getUsedCount() == null ? 1 : voucher.getUsedCount()) + 1);
        voucherRepository.save(voucher);

        // Cập nhật trạng thái đã dùng trong bảng trung gian user_vouchers
        UserVoucher userVoucher = userVoucherRepository
                .findByUserIdAndVoucherId(user.getId(), voucher.getId())
                .orElse(null);

        if(userVoucher.getIsUsed())
            throw new ResourceInvalidException("Mã giảm giá đã được sử dụng");
        if (userVoucher != null) {
            userVoucher.setIsUsed(true);
            userVoucher.setAssignedAt(Instant.now()); // cập nhật lại thời điểm sử dụng
            userVoucherRepository.save(userVoucher);
        } else {
            // Nếu người dùng không có sẵn (ví dụ voucher public), có thể tạo mới bản ghi
            UserVoucher newUV = new UserVoucher();
            newUV.setUser(user);
            newUV.setVoucher(voucher);
            newUV.setIsUsed(true);
            newUV.setAssignedAt(Instant.now());
            userVoucherRepository.save(newUV);
        }

        return total;
    }


    public PaginationDTO getOrderByCurrentUser(Pageable pageable, Integer status) throws ResourceInvalidException {
        String email = SecurityUtil.getCurrentUserLogin().orElse("");
        User user = this.userRepository.findByEmail(email);

        if (user == null) {
            throw new ResourceInvalidException("User không tồn tại");
        }

        Page<Order> ordersPage = orderRepository.findOrdersWithOptionalStatus(user.getId(), status, pageable);

        // Convert to DTOs
        List<OrderDetailDTO> orderDetailDTOs = new ArrayList<>();

        for (Order order : ordersPage.getContent()) {
            List<OrderDetail> details = orderDetailRepository.findByOrderId(order.getId());
            for (OrderDetail detail : details) {
                OrderDetailDTO dto = new OrderDetailDTO();
                dto.setOrderId(order.getId());
                dto.setOrderTime(order.getOrderTime());
                dto.setStatus(order.getStatus());
                dto.setProductId(detail.getProduct().getId());
                dto.setProductName(detail.getProduct().getProductName());
                dto.setQuantity(detail.getQuantity());
                dto.setUnit_price(detail.getUnit_price());
                dto.setImageUrl(detail.getProduct().getImageUrl());
                dto.setCategory(detail.getProduct().getCategory().getName());

                // Set voucher if available
                if (order.getVoucher() != null) {
                    dto.setVoucherId(order.getVoucher().getId());
                    dto.setVoucherCode(order.getVoucher().getCode());
                    dto.setVoucherType(order.getVoucher().getType().toString());
                    dto.setVoucherDiscountValue(order.getVoucher().getDiscountValue());
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

    public List<Object> getOverviewStats() {
        long totalUsers = userRepository.count();
        double totalProfit = orderRepository.sumTotalPriceByStatus(2);
        long totalOrders = orderRepository.count();
        long totalProducts = productRepository.count();
        return Arrays.asList(totalProfit, totalUsers, totalProducts, totalOrders);
    }
}
