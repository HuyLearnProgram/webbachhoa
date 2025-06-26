package com.app.webnongsan.controller;

import com.app.webnongsan.domain.Product;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.domain.response.product.ResProductDTO;
import com.app.webnongsan.domain.response.product.SearchProductDTO;
import com.app.webnongsan.service.ProductService;
import com.app.webnongsan.util.annotation.ApiMessage;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import com.turkraft.springfilter.boot.Filter;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.repository.query.Param;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/v2")
@AllArgsConstructor
public class ProductController {
    private final ProductService productService;

    @PostMapping("products")
    @ApiMessage("Create product")
    public ResponseEntity<Product> create(@Valid @RequestBody Product p) throws ResourceInvalidException {
        if (!this.productService.checkValidCategoryId(p.getCategory().getId())){
            throw new ResourceInvalidException("Category không tồn tại");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(this.productService.create(p));
    }

    @GetMapping("products/{id}")
    @ApiMessage("Get product")
    public ResponseEntity<Product> get(@PathVariable("id") long id) throws ResourceInvalidException {
        if (!this.productService.checkValidProductId(id)){
            throw new ResourceInvalidException("Product id = " + id + " không tồn tại");
        }
        return ResponseEntity.ok(this.productService.get(id));
    }

    @DeleteMapping("products/{id}")
    @ApiMessage("Delete product")
    public ResponseEntity<Void> delete(@PathVariable("id") long id) throws ResourceInvalidException {
        if (!this.productService.checkValidProductId(id)){
            throw new ResourceInvalidException("Product id = " + id + " không tồn tại");
        }
        this.productService.delete(id);
        return ResponseEntity.ok(null);
    }

    @GetMapping("products")
    @ApiMessage("Get all products")
    public ResponseEntity<PaginationDTO> getAll(@Filter Specification<Product> spec, Pageable pageable){
        return ResponseEntity.ok(this.productService.getAll(spec, pageable));
    }

    @PutMapping("products")
    @ApiMessage("Update product")
    public ResponseEntity<Product> update(@Valid @RequestBody Product p) throws ResourceInvalidException {
        boolean check = this.productService.checkValidProductId(p.getId());
        if (!check){
            throw new ResourceInvalidException("Product id = " + p.getId() + " không tồn tại");
        }
        return ResponseEntity.ok(this.productService.update(p));
    }

    @GetMapping("products/max-price")
    @ApiMessage("Get max price")
    public ResponseEntity<Double> getMaxPrice(
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "productName", required = false) String productName) throws ResourceInvalidException {
        return ResponseEntity.ok(this.productService.getMaxPrice(category, productName));
    }

    @GetMapping("products/search")
    @ApiMessage("Search products")
    public ResponseEntity<PaginationDTO> search(@Filter Specification<Product> spec, Pageable pageable) {
        return ResponseEntity.ok(this.productService.search(spec, pageable));
    }
    @PutMapping("products/quantity/{id}")
    @ApiMessage("Update quantity product")
    public ResponseEntity<Product> updateQuantity(@PathVariable("id") long id, @RequestParam("quantity") int quantity) throws ResourceInvalidException {
        boolean check = this.productService.checkValidProductId(id);
        if (!check){
            throw new ResourceInvalidException("Product id = " + id + " không tồn tại");
        }
        Product p = this.productService.get(id);
        if(quantity > p.getQuantity()){
            throw new ResourceInvalidException("Product id = " + p.getId() + " không đủ số lượng tồn kho");
        }
        p.setQuantity(p.getQuantity() - quantity);
        p.setSold(p.getSold()+quantity);
        return ResponseEntity.ok(this.productService.update(p));
    }

//    @GetMapping("products/similar/{productId}")
//    public ResponseEntity<List<SearchProductDTO>> getSimilarProducts(@PathVariable Long productId) {
//        return ResponseEntity.ok(productService.getSimilarProducts(productId));
//    }
}
