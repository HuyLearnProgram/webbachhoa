package com.app.webnongsan.util;

import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.domain.response.order.OrderDetailDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PaginationHelper {
    // Helper sử dụng Specification
    public <T> PaginationDTO fetchAllEntities(Specification<T> spec, Pageable pageable, JpaSpecificationExecutor<T> repository) {
        Page<T> page = repository.findAll(spec, pageable);
        return buildPaginationDTO(page);
    }

    // Helper không sử dụng Specification
    public <T> PaginationDTO fetchAllEntities(Pageable pageable, JpaRepository<T, ?> repository) {
        Page<T> page = repository.findAll(pageable);
        return buildPaginationDTO(page);
    }

    // Helper sử dụng Page tùy chỉnh
    public <T> PaginationDTO fetchAllEntities(Page<T> page) {
        return buildPaginationDTO(page);
    }

    //build PaginationDTO từ Page
    public <T> PaginationDTO buildPaginationDTO(Page<T> page) {
        PaginationDTO rs = new PaginationDTO();
        PaginationDTO.Meta meta = new PaginationDTO.Meta();

        meta.setPage(page.getNumber() + 1);
        meta.setPageSize(page.getSize());
        meta.setPages(page.getTotalPages());
        meta.setTotal(page.getTotalElements());

        rs.setMeta(meta);
        rs.setResult(page.getContent());
        return rs;
    }

    public PaginationDTO buildPaginationFromList(List<?> content, long total, Pageable pageable) {
        PaginationDTO pagination = new PaginationDTO();
        PaginationDTO.Meta meta = new PaginationDTO.Meta();

        meta.setPage(pageable.getPageNumber() + 1);
        meta.setPageSize(pageable.getPageSize());
        meta.setPages((int) Math.ceil((double) total / pageable.getPageSize()));
        meta.setTotal(total);

        pagination.setMeta(meta);
        pagination.setResult(content);

        return pagination;
    }
}
