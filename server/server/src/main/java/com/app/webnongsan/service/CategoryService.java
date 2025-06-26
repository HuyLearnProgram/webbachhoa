package com.app.webnongsan.service;

import com.app.webnongsan.domain.Category;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.repository.CategoryRepository;
import com.app.webnongsan.repository.ProductRepository;
import com.app.webnongsan.util.PaginationHelper;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import lombok.AllArgsConstructor;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;


@Service
@AllArgsConstructor
public class CategoryService {
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final PaginationHelper paginationHelper;

    public boolean isCategoryExisted(String name){
        return this.categoryRepository.existsByName(name);
    }
    public Category create(Category category){
        return this.categoryRepository.save(category);
    }

    public boolean isCategoryNameUnique(Long id, String name) {
        return !categoryRepository.existsByNameAndNotId(name, id);
    }

    public Category findById(long id){
        return this.categoryRepository.findById(id).orElse(null);
    }
    public Category update(Category category){
        Category curr = this.findById(category.getId());
        if (curr != null){
            curr.setName(category.getName());
            curr.setImageUrl(category.getImageUrl());
        }
        assert curr != null;
        return categoryRepository.save(curr);
    }

    public void delete(long id) throws ResourceInvalidException {
        if (productRepository.existsByCategoryId(id)) {
            throw new ResourceInvalidException("Không thể xóa vì category có sản phẩm liên quan.");
        }
        categoryRepository.deleteById(id);
    }

    public PaginationDTO fetchAllCategories(Specification<Category> specification, Pageable pageable) {
        return paginationHelper.fetchAllEntities(specification, pageable, categoryRepository);
    }
}
