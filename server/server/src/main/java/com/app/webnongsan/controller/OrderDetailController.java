package com.app.webnongsan.controller;

import com.app.webnongsan.domain.OrderDetail;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.service.OrderDetailService;
import com.app.webnongsan.service.OrderService;
import com.app.webnongsan.util.annotation.ApiMessage;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import com.turkraft.springfilter.boot.Filter;
import lombok.AllArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.data.domain.Pageable;
@RestController
@RequestMapping("api/v2")
@AllArgsConstructor
public class OrderDetailController {
    private final OrderDetailService orderDetailService;
    private final OrderService orderService;

    @GetMapping("OrderDetails/{orderId}")
    @ApiMessage("Get all Order Details by Order ID")
    public ResponseEntity<PaginationDTO> getAllOrderDetailsByOrderId(@PathVariable("orderId") long orderId, Pageable pageable) {
        PaginationDTO paginationDTO = this.orderDetailService.getOrderDetailById(pageable, orderId);
        return ResponseEntity.ok(paginationDTO);
    }
}
