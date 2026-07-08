package com.app.webnongsan.controller;

import com.app.webnongsan.domain.Order;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.domain.response.RestResponse;
import com.app.webnongsan.domain.response.order.OrderDTO;
import com.app.webnongsan.domain.response.order.OrderDetailDTO;
import com.app.webnongsan.domain.response.order.WeeklyRevenue;
import com.app.webnongsan.domain.response.product.ProductReturnStatsDTO;
import com.app.webnongsan.repository.ProductRepository;
import com.app.webnongsan.service.OrderService;
import com.app.webnongsan.util.SecurityUtil;
import com.app.webnongsan.util.annotation.ApiMessage;
import com.app.webnongsan.util.exception.PermissionException;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import com.turkraft.springfilter.boot.Filter;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("api/v2")
@AllArgsConstructor
public class OrderController {
    private final OrderService orderService;
    private final ProductRepository productRepository;

    @GetMapping("allOrders")
    @ApiMessage("Get all Orders")
    public ResponseEntity<PaginationDTO> getAll(@Filter Specification<Order> spec,
                                                @PageableDefault(sort = "orderTime", direction = Sort.Direction.DESC) Pageable pageable){
        return ResponseEntity.ok(this.orderService.getAll(spec, pageable));
    }

    @GetMapping("users/{id}/orders")
    @ApiMessage("Get orders by user (admin)")
    public ResponseEntity<PaginationDTO> getOrdersByUserId(
            @PathVariable("id") Long id,
            @RequestParam(value = "size", required = false) Integer size,
            Pageable pageable) {
        if (size == null || size < 1) {
            long totalEls = this.orderService.getTotalOrdersByUserId(id);
            size = totalEls > 0 ? (int) totalEls : 1;
        }
        Pageable updatedPageable = PageRequest.of(pageable.getPageNumber(), size);
        return ResponseEntity.ok(this.orderService.getOrdersByUserId(id, updatedPageable));
    }

    @GetMapping("products/{id}/return-stats")
    @ApiMessage("Get return rate stats for a product (admin)")
    public ResponseEntity<ProductReturnStatsDTO> getProductReturnStats(@PathVariable("id") Long id) {
        return ResponseEntity.ok(this.orderService.getProductReturnStats(id));
    }

    @GetMapping("orderInfo/{orderId}")
    @ApiMessage("Get order information")
    public ResponseEntity<Optional<OrderDTO>> getOrderInfor(@PathVariable("orderId") long orderId){
        return ResponseEntity.ok(this.orderService.findOrder(orderId));
    }

    @GetMapping("updateOrderStatus/{orderId}")
    @ApiMessage("Update order status")
    public ResponseEntity<RestResponse<OrderDTO>> updateOrderStatus(
            @PathVariable Long orderId,
            @RequestParam("status") int status) {

        RestResponse<OrderDTO> response = new RestResponse<>();

        try {
            Order order = this.orderService.get(orderId);
            // Kiểm tra logic hợp lệ
            if (!isValidStatusTransition(order.getStatus(), status)) {
                throw new ResourceInvalidException("Không thể chuyển trạng thái từ " + order.getStatus() + " sang " + status);
            }
            if (status == 4) {
                // Trả hàng hoàn tiền - hành động tự-phục vụ của khách hàng, cần kiểm tra thêm
                String actorEmail = SecurityUtil.getCurrentUserLogin().orElse(null);
                boolean isOwner = actorEmail != null && actorEmail.equalsIgnoreCase(order.getUser().getEmail());
                boolean isAdmin = SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                        .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
                if (!isOwner && !isAdmin) {
                    throw new PermissionException("Bạn không có quyền thao tác trên đơn hàng này");
                }
                if (!"PAID".equals(order.getPaymentStatus())) {
                    throw new ResourceInvalidException("Đơn hàng chưa thanh toán, không thể trả hàng hoàn tiền");
                }
                if (!isAdmin && (order.getDeliveryTime() == null
                        || order.getDeliveryTime().isBefore(Instant.now().minus(15, ChronoUnit.DAYS)))) {
                    throw new ResourceInvalidException("Đã quá hạn 15 ngày trả hàng");
                }
            }
            // Cập nhật trạng thái
            order.setStatus(status);
            if (status == 2 || status == 3) {
                order.setDeliveryTime(Instant.now());
            }
            if (status == 2 && "COD".equalsIgnoreCase(order.getPaymentMethod())) {
                order.setPaymentStatus("PAID");
                order.setPaidAt(Instant.now());
            }
            if ((status == 3 || status == 4) && "PAID".equals(order.getPaymentStatus())) {
                order.setPaymentStatus("REFUND_PENDING");
            }

            // Lưu lại đơn hàng
            this.orderService.save(order);


            // Tạo DTO phản hồi
            OrderDTO dto = new OrderDTO();
            dto.setId(order.getId());
            dto.setStatus(order.getStatus());
            dto.setOrderTime(order.getOrderTime());
            dto.setDeliveryTime(order.getDeliveryTime());

            response.setData(dto);
            response.setStatusCode(HttpStatus.OK.value());
            response.setMessage("Cập nhật trạng thái đơn hàng thành công");

            return ResponseEntity.ok(response);

        } catch (ResourceInvalidException e) {
            response.setStatusCode(HttpStatus.BAD_REQUEST.value());
            response.setError(e.getMessage());
            response.setMessage("Có lỗi xảy ra: " + e.getMessage());
            return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);

        } catch (PermissionException e) {
            response.setStatusCode(HttpStatus.FORBIDDEN.value());
            response.setError(e.getMessage());
            response.setMessage(e.getMessage());
            return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);

        } catch (Exception e) {
            response.setStatusCode(HttpStatus.INTERNAL_SERVER_ERROR.value());
            response.setError(e.getMessage());
            response.setMessage("Có lỗi xảy ra trong quá trình cập nhật trạng thái");
            return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("orders/{id}/confirm-refund")
    @ApiMessage("Đã xác nhận hoàn tiền cho đơn hàng")
    public ResponseEntity<Void> confirmRefund(@PathVariable("id") Long id) throws ResourceInvalidException {
        Order order = this.orderService.get(id);
        if (!"REFUND_PENDING".equals(order.getPaymentStatus())) {
            throw new ResourceInvalidException("Đơn hàng này không ở trạng thái chờ hoàn tiền");
        }
        order.setPaymentStatus("REFUNDED");
        this.orderService.save(order);
        return ResponseEntity.ok(null);
    }

    @PutMapping("/updateOrderInfo/{orderId}")
    @ApiMessage("Update order contact info (address, phone)")
    public ResponseEntity<OrderDTO> updateOrderInfo(
            @PathVariable Long orderId,
            @RequestBody OrderDTO inputDto) {

        // Tìm đơn hàng theo ID
        Order order = orderService.get(orderId);

        // Cập nhật các trường cho phép
        order.setAddress(inputDto.getAddress());
        order.setPhone(inputDto.getPhone());


        // Lưu lại đơn hàng
        orderService.save(order);

        // Chuẩn bị DTO phản hồi
        OrderDTO dto = new OrderDTO();
        dto.setId(order.getId());
        dto.setAddress(order.getAddress());
        dto.setPhone(order.getPhone());
        dto.setStatus(order.getStatus());
        dto.setOrderTime(order.getOrderTime());
        dto.setDeliveryTime(order.getDeliveryTime());

        return ResponseEntity.ok(dto);
    }

    @PostMapping("checkout")
    @ApiMessage("Thanh toán thành công")
    public ResponseEntity<?> create(
            @RequestParam("userId") Long userId,
            @RequestParam("address") String address,
            @RequestParam("phone") String phone,
            @RequestParam("paymentMethod") String paymentMethod,
            @RequestParam("totalPrice") Double totalPrice,
            @RequestParam(value = "voucherId", required = false) Long voucherId,
            @RequestPart("items") List<OrderDetailDTO> items
    ) throws ResourceInvalidException{
        try {
            OrderDTO orderDTO = new OrderDTO();
            orderDTO.setUserId(userId);
            orderDTO.setAddress(address);
            orderDTO.setPhone(phone);
            orderDTO.setPaymentMethod(paymentMethod);
            orderDTO.setTotalPrice(totalPrice);
            orderDTO.setVoucherId(voucherId);
            orderDTO.setItems(items);
            Order order = orderService.create(orderDTO);

            // Không tự bọc RestResponse ở đây - FormatResponse (ResponseBodyAdvice toàn cục) đã tự bọc
            // mọi response thành công, tự tay bọc thêm ở đây sẽ khiến "data" bị lồng 2 lớp phía client.
            return new ResponseEntity<>(order.getId(), HttpStatus.CREATED);
        }catch (ResourceInvalidException e) {
            RestResponse<Object> response = new RestResponse<>();
            response.setStatusCode(HttpStatus.BAD_REQUEST.value());
            response.setError(e.getMessage()); // set lỗi cụ thể vào error
            response.setMessage(e.getMessage()); // fix dòng lỗi
            return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            RestResponse<Object> response = new RestResponse<>();
            response.setStatusCode(HttpStatus.INTERNAL_SERVER_ERROR.value());
            response.setError(e.getMessage());
            response.setMessage("Có lỗi xảy ra trong quá trình thanh toán");
            return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    @GetMapping("orders")
    @ApiMessage("Get orders by user")
    public ResponseEntity<PaginationDTO> getOrderByUser(
            Pageable pageable,
            @RequestParam(value = "status", required = false) Integer status
    ) throws ResourceInvalidException {
        return ResponseEntity.ok(this.orderService.getOrderByCurrentUser(pageable, status));
    }

    @GetMapping("/monthly-orders-revenue")
    @ApiMessage("Get data for monthy revenue chart")
    public ResponseEntity<List<WeeklyRevenue>> getMonthlyRevenue(@RequestParam int month, @RequestParam int year) {
        return ResponseEntity.ok(this.orderService.getMonthlyRevenue(month, year));
    }

    @GetMapping("/admin/summary")
    @ApiMessage("Get ...")
    public ResponseEntity<List<Object>> getOverview(){
        return ResponseEntity.of(Optional.ofNullable(this.orderService.getOverviewStats()));
    }

    // Hàm hỗ trợ kiểm tra chuyển trạng thái hợp lệ
    private boolean isValidStatusTransition(int current, int target) {
        switch (current) {
            case 0: // Pending
                return target == 1 || target == 3;
            case 1: // In Delivery
                return target == 2;
            case 2: // Success
                return target == 4; // Success -> Returned (trả hàng hoàn tiền)
            case 3: // Cancel
            case 4: // Returned
                return false;
            default:
                return false;
        }
    }


}
