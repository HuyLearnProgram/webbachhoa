package com.app.webnongsan.service;
import com.app.webnongsan.domain.CartId;
import com.app.webnongsan.domain.OrderDetailId;
import com.app.webnongsan.domain.Product;
import com.app.webnongsan.repository.OrderDetailRepository;
import com.app.webnongsan.domain.OrderDetail;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.domain.response.order.OrderDetailDTO;
import com.app.webnongsan.repository.OrderRepository;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
@AllArgsConstructor
public class OrderDetailService {
    private final OrderRepository orderRepository;
    private final OrderDetailRepository orderDetailRepository;
    public boolean checkValidOrderDetailId(Long orderId, Long productId) {
        return this.orderDetailRepository.existsById(new OrderDetailId(orderId, productId));
    }
    public OrderDetail get(long orderId){
        return this.orderDetailRepository.findById(orderId).orElse(null);
    }
    public List <OrderDetail> getAllFromOrder(long orderId){
        return  this.orderDetailRepository.findAllById(Collections.singleton(orderId));
    }

//    public List<OrderDetail> getOrderDetailById(long orderId){
//        return this.orderDetailRepository.findByOrderId(orderId);
//    }

    public PaginationDTO getOrderDetailById (Pageable pageable,long orderId){
        Page<OrderDetail> orderDetailsPage = this.orderDetailRepository.findByOrderId(orderId, pageable);


        PaginationDTO p = new PaginationDTO();
        PaginationDTO.Meta meta = new PaginationDTO.Meta();

        meta.setPage(pageable.getPageNumber() + 1);
        meta.setPageSize(pageable.getPageSize());
        meta.setPages(orderDetailsPage.getTotalPages());
        meta.setTotal(orderDetailsPage.getTotalElements());

        p.setMeta(meta);

        List<OrderDetailDTO> listOrderDetail = orderDetailsPage.getContent().stream().map(this::convertToOrderDetailDTO).toList();
        p.setResult(listOrderDetail);
        return p;
    }
    public OrderDetailDTO convertToOrderDetailDTO(OrderDetail orderDetail) {
        OrderDetailDTO res = new OrderDetailDTO();
        res.setOrderId(orderDetail.getOrder().getId());
        res.setQuantity(orderDetail.getQuantity());
        res.setProductName(orderDetail.getProduct().getProductName());
        res.setUnit_price(orderDetail.getProduct().getPrice());
        res.setImageUrl(orderDetail.getProduct().getImageUrl());
        return res;
    }
}
