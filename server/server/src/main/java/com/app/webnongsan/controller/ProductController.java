package com.app.webnongsan.controller;

import com.app.webnongsan.domain.Product;
import com.app.webnongsan.domain.request.BulkActiveRequestDTO;
import com.app.webnongsan.domain.request.AddImageRequestDTO;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.domain.response.product.ProductImportResultDTO;
import com.app.webnongsan.domain.response.product.ResProductDTO;
import com.app.webnongsan.domain.response.product.SearchProductDTO;
import com.app.webnongsan.service.ProductService;
import com.app.webnongsan.util.annotation.ApiMessage;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import com.turkraft.springfilter.boot.Filter;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.repository.query.Param;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("api/v2")
@AllArgsConstructor
public class ProductController {
    private final ProductService productService;

    @PostMapping("products")
    @ApiMessage("Create product")
    public ResponseEntity<Product> create(@Valid @RequestBody Product p) throws ResourceInvalidException {
        if (p.getCategory() == null || !this.productService.checkValidCategoryId(p.getCategory().getId())){
            throw new ResourceInvalidException("Category không tồn tại");
        }
        this.validatePromotion(p);
        this.productService.preparePromotionForCreate(p);
        if (!this.productService.isSkuAvailable(p.getSku(), null)) {
            throw new ResourceInvalidException("SKU '" + p.getSku() + "' đã được dùng cho sản phẩm khác");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(this.productService.create(p));
    }

    private void validatePromotion(Product p) throws ResourceInvalidException {
        String error = this.productService.validatePromotion(p);
        if (error != null) {
            throw new ResourceInvalidException(error);
        }
    }

    @GetMapping("products/{id}")
    @ApiMessage("Get product")
    public ResponseEntity<Product> get(@PathVariable("id") long id) throws ResourceInvalidException {
        if (!this.productService.checkValidProductId(id)){
            throw new ResourceInvalidException("Product id = " + id + " không tồn tại");
        }
        return ResponseEntity.ok(this.productService.get(id));
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
        this.validatePromotion(p);
        if (!this.productService.isSkuAvailable(p.getSku(), p.getId())) {
            throw new ResourceInvalidException("SKU '" + p.getSku() + "' đã được dùng cho sản phẩm khác");
        }
        return ResponseEntity.ok(this.productService.update(p));
    }

    @PutMapping("products/bulk-active")
    @ApiMessage("Bulk update product active status")
    public ResponseEntity<Integer> bulkUpdateActive(@Valid @RequestBody BulkActiveRequestDTO request) {
        return ResponseEntity.ok(this.productService.bulkUpdateActive(request.getIds(), request.getActive()));
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

    @PostMapping("products/{id}/images")
    @ApiMessage("Add product gallery image")
    public ResponseEntity<Product> addImage(@PathVariable("id") long id, @RequestBody AddImageRequestDTO body) throws ResourceInvalidException {
        if (!this.productService.checkValidProductId(id)) {
            throw new ResourceInvalidException("Product id = " + id + " không tồn tại");
        }
        return ResponseEntity.ok(this.productService.addImage(id, body.getImageUrl()));
    }

    @DeleteMapping("products/{id}/images/{imageId}")
    @ApiMessage("Remove product gallery image")
    public ResponseEntity<Void> removeImage(@PathVariable("id") long id, @PathVariable("imageId") long imageId) throws ResourceInvalidException {
        if (!this.productService.checkValidProductId(id)) {
            throw new ResourceInvalidException("Product id = " + id + " không tồn tại");
        }
        this.productService.removeImage(id, imageId);
        return ResponseEntity.ok(null);
    }

    private static final MediaType XLSX_MEDIA_TYPE = MediaType.parseMediaType(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    @GetMapping("products/export")
    public ResponseEntity<ByteArrayResource> exportProducts() throws IOException {
        byte[] data = this.productService.exportToExcel();
        return ResponseEntity.ok()
                .contentType(XLSX_MEDIA_TYPE)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"products.xlsx\"")
                .contentLength(data.length)
                .body(new ByteArrayResource(data));
    }

    @GetMapping("products/import-template")
    public ResponseEntity<ByteArrayResource> importTemplate() throws IOException {
        byte[] data = this.productService.generateImportTemplate();
        return ResponseEntity.ok()
                .contentType(XLSX_MEDIA_TYPE)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"product_import_template.xlsx\"")
                .contentLength(data.length)
                .body(new ByteArrayResource(data));
    }

    @PostMapping("products/import")
    @ApiMessage("Import products from Excel")
    public ResponseEntity<ProductImportResultDTO> importProducts(@RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(this.productService.importFromExcel(file));
    }
}
