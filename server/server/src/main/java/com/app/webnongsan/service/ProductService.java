package com.app.webnongsan.service;

import com.app.webnongsan.domain.Category;
import com.app.webnongsan.domain.Product;
import com.app.webnongsan.domain.ProductImage;
import com.app.webnongsan.domain.response.PaginationDTO;
import com.app.webnongsan.domain.response.product.ProductImportResultDTO;
import com.app.webnongsan.domain.response.product.ResProductDTO;
import com.app.webnongsan.domain.response.product.SearchProductDTO;
import com.app.webnongsan.repository.CategoryRepository;
import com.app.webnongsan.repository.ProductRepository;
import com.app.webnongsan.util.PaginationHelper;
import com.app.webnongsan.util.exception.ResourceInvalidException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.*;
import lombok.AllArgsConstructor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class ProductService {
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final EntityManager entityManager;
    private final RestTemplate restTemplate;
//    private final String FASTAPI_URL_SIMILAR_ID = "http://127.0.0.1:8000/similar/%d";
    private final PaginationHelper paginationHelper;
    private final PlatformTransactionManager transactionManager;

    private static final String[] IMPORT_HEADERS = {
            "SKU (để trống nếu tạo mới)", "Tên sản phẩm*", "Phân loại*", "Giá bán*",
            "Giá gốc (khuyến mãi, để trống nếu không có)", "Số lượng*", "Đơn vị", "Mô tả", "Đang bán (TRUE/FALSE)"
    };

    public boolean checkValidCategoryId(long categoryId) {
        return this.categoryRepository.existsById(categoryId);
    }

    // true nếu sku trống (không bắt buộc) hoặc chưa có sản phẩm nào khác đang dùng
    public boolean isSkuAvailable(String sku, Long excludeProductId) {
        if (sku == null || sku.isBlank()) return true;
        return this.productRepository.findBySku(sku)
                .map(existing -> excludeProductId != null && existing.getId() == excludeProductId)
                .orElse(true);
    }

    public Product create(Product p) {
        return this.productRepository.save(p);
    }

    public boolean checkValidProductId(long id) {
        return this.productRepository.existsById(id);
    }

    public Product get(long id) {
        return this.productRepository.findById(id).orElse(null);
    }

    @Transactional
    public int bulkUpdateActive(List<Long> ids, boolean active) {
        List<Product> products = this.productRepository.findAllById(ids);
        products.forEach(p -> p.setActive(active));
        this.productRepository.saveAll(products);
        return products.size();
    }

    @Transactional
    public Product addImage(long productId, String imageUrl) {
        Product product = this.findById(productId);
        if (product == null) return null;
        List<ProductImage> images = product.getImages();
        if (images == null) {
            images = new ArrayList<>();
            product.setImages(images);
        }
        ProductImage image = new ProductImage();
        image.setImageUrl(imageUrl);
        image.setDisplayOrder(images.size());
        image.setProduct(product);
        images.add(image);
        return this.productRepository.save(product);
    }

    @Transactional
    public boolean removeImage(long productId, long imageId) {
        Product product = this.findById(productId);
        if (product == null || product.getImages() == null) return false;
        boolean removed = product.getImages().removeIf(img -> img.getId() == imageId);
        if (removed) {
            this.productRepository.save(product);
        }
        return removed;
    }

    public PaginationDTO getAll(Specification<Product> spec, Pageable pageable) {
        Page<Product> productPage = this.productRepository.findAll(spec, pageable);
        PaginationDTO p = new PaginationDTO();
        PaginationDTO.Meta meta = new PaginationDTO.Meta();
        meta.setPage(pageable.getPageNumber() + 1);
        meta.setPageSize(pageable.getPageSize());
        meta.setPages(productPage.getTotalPages());
        meta.setTotal(productPage.getTotalElements());
        p.setMeta(meta);
        List<ResProductDTO> listProducts = productPage.getContent().stream().map(this::convertToProductDTO).toList();
        p.setResult(listProducts);
        return p;
    }

    public ResProductDTO convertToProductDTO(Product p) {
        ResProductDTO res = new ResProductDTO();
        res.setId(p.getId());
        res.setProduct_name(p.getProductName());
        res.setSku(p.getSku());
        res.setCategory(p.getCategory().getName());
        res.setPrice(p.getPrice());
        res.setOriginalPrice(p.getOriginalPrice());
        res.setActive(p.getActive());
        res.setSold(p.getSold());
        res.setQuantity(p.getQuantity());
        res.setImageUrl(p.getImageUrl());
        res.setUnit(p.getUnit());
        res.setDescription(p.getDescription());
        res.setRating(p.getRating());
        return res;
    }

    public Product findById(long id) {
        return this.productRepository.findById(id).orElse(null);
    }

    public Product update(Product p) {
        Product curr = this.findById(p.getId());
        if (curr != null) {
            curr.setProductName(p.getProductName());
            curr.setSku(p.getSku());
            curr.setPrice(p.getPrice());
            curr.setOriginalPrice(p.getOriginalPrice());
            curr.setImageUrl(p.getImageUrl());
            curr.setDescription(p.getDescription());
            curr.setQuantity(p.getQuantity());
            curr.setUnit(p.getUnit());
            curr.setCategory(p.getCategory());
            // active không đổi qua update thường — chỉ đổi qua bulk-active, tránh client cũ không gửi field này wipe về null
            if (p.getActive() != null) {
                curr.setActive(p.getActive());
            }
        }
        assert curr != null;
        return this.productRepository.save(curr);
    }

    public double getMaxPrice(String category, String productName) throws ResourceInvalidException {
        if (category != null && !category.isEmpty() && !this.categoryRepository.existsByName(category)) {
            throw new ResourceInvalidException("Category không tồn tại");
        }
        return this.productRepository.getMaxPriceByCategoryAndProductName(category, productName);
    }

    public PaginationDTO search(Specification<Product> spec, Pageable pageable) {
        Page<SearchProductDTO> productPage = this.searchProduct(spec, pageable);
        return this.paginationHelper.buildPaginationDTO(productPage);
    }

    public Page<SearchProductDTO> searchProduct(Specification<Product> specification, Pageable pageable) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<SearchProductDTO> query = cb.createQuery(SearchProductDTO.class);
        Root<Product> productRoot = query.from(Product.class);
        Join<Product, Category> categoryJoin = productRoot.join("category");
        Predicate predicate = specification.toPredicate(productRoot, query, cb);
        if (predicate != null) {
            query.where(predicate);
        }

        query.select(cb.construct(SearchProductDTO.class,
                productRoot.get("id"),
                productRoot.get("productName"),
                productRoot.get("price"),
                productRoot.get("imageUrl"),
                categoryJoin.get("name")
        ));

        List<SearchProductDTO> resultList = entityManager.createQuery(query)
                .setFirstResult((int) pageable.getOffset())
                .setMaxResults(pageable.getPageSize())
                .getResultList();

        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<Product> countRoot = countQuery.from(Product.class);
        countQuery.select(cb.count(countRoot));

        Predicate countPredicate = specification.toPredicate(countRoot, countQuery, cb);
        if (countPredicate != null) {
            countQuery.where(countPredicate);
        }

        Long totalCount = entityManager.createQuery(countQuery).getSingleResult();

        return new PageImpl<>(resultList, pageable, totalCount);
    }

//    public List<Long> fetchSimilarProductIds(Long productId) {
//        String url = String.format(FASTAPI_URL_SIMILAR_ID, productId);
//        Map<String, Object> response = restTemplate.getForObject(url, Map.class);
//
//        return Optional.ofNullable((List<Integer>) response.get("data"))
//                .orElse(Collections.emptyList())
//                .stream()
//                .map(Integer::longValue)
//                .collect(Collectors.toList());
//    }


//    public List<SearchProductDTO> getSimilarProducts(Long productId) {
//        List<Long> ids = fetchSimilarProductIds(productId);
//        List<SearchProductDTO> res = productRepository.findByIdInList(ids);
//
//        // Sắp xếp danh sách `res` theo thứ tự trong `ids`
//        return ids.stream()
//                .map(id -> res.stream().filter(dto -> dto.getId() == id).findFirst().orElse(null))
//                .filter(Objects::nonNull)
//                .collect(Collectors.toList());
//    }

    private void writeImportHeaderRow(Sheet sheet) {
        Row header = sheet.createRow(0);
        for (int i = 0; i < IMPORT_HEADERS.length; i++) {
            header.createCell(i).setCellValue(IMPORT_HEADERS[i]);
        }
    }

    public byte[] generateImportTemplate() throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Products");
            writeImportHeaderRow(sheet);
            Row example = sheet.createRow(1);
            example.createCell(0).setCellValue("SP001");
            example.createCell(1).setCellValue("Táo Envy Mỹ");
            example.createCell(2).setCellValue("Trái cây");
            example.createCell(3).setCellValue(45000);
            example.createCell(4).setCellValue(55000);
            example.createCell(5).setCellValue(100);
            example.createCell(6).setCellValue("Kg");
            example.createCell(7).setCellValue("Táo nhập khẩu từ Mỹ");
            example.createCell(8).setCellValue(true);
            for (int i = 0; i < IMPORT_HEADERS.length; i++) sheet.autoSizeColumn(i);
            workbook.write(out);
            return out.toByteArray();
        }
    }

    public byte[] exportToExcel() throws IOException {
        List<Product> products = this.productRepository.findAll();
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Products");
            writeImportHeaderRow(sheet);
            int rowIdx = 1;
            for (Product p : products) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(p.getSku() == null ? "" : p.getSku());
                row.createCell(1).setCellValue(p.getProductName());
                row.createCell(2).setCellValue(p.getCategory() != null ? p.getCategory().getName() : "");
                row.createCell(3).setCellValue(p.getPrice());
                if (p.getOriginalPrice() != null) {
                    row.createCell(4).setCellValue(p.getOriginalPrice());
                }
                row.createCell(5).setCellValue(p.getQuantity());
                row.createCell(6).setCellValue(p.getUnit() == null ? "" : p.getUnit());
                row.createCell(7).setCellValue(p.getDescription() == null ? "" : p.getDescription());
                row.createCell(8).setCellValue(Boolean.TRUE.equals(p.getActive()));
            }
            for (int i = 0; i < IMPORT_HEADERS.length; i++) sheet.autoSizeColumn(i);
            workbook.write(out);
            return out.toByteArray();
        }
    }

    public ProductImportResultDTO importFromExcel(MultipartFile file) throws IOException {
        List<ProductImportResultDTO.RowError> errors = new ArrayList<>();
        int successCount = 0;
        TransactionTemplate transactionTemplate = new TransactionTemplate(this.transactionManager);
        DataFormatter dataFormatter = new DataFormatter();

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            int lastRowNum = sheet.getLastRowNum();
            for (int i = 1; i <= lastRowNum; i++) {
                Row row = sheet.getRow(i);
                if (row == null || isRowEmpty(row, dataFormatter)) continue;
                int excelRowNumber = i + 1; // số dòng hiển thị cho người dùng (Excel bắt đầu từ 1, có header)
                try {
                    transactionTemplate.executeWithoutResult(status -> {
                        try {
                            importRow(row, dataFormatter);
                        } catch (RuntimeException e) {
                            status.setRollbackOnly();
                            throw e;
                        }
                    });
                    successCount++;
                } catch (RuntimeException e) {
                    errors.add(new ProductImportResultDTO.RowError(excelRowNumber, e.getMessage()));
                }
            }
        }

        ProductImportResultDTO result = new ProductImportResultDTO();
        result.setSuccessCount(successCount);
        result.setErrors(errors);
        result.setTotalRows(successCount + errors.size());
        return result;
    }

    private boolean isRowEmpty(Row row, DataFormatter dataFormatter) {
        for (int i = 0; i < IMPORT_HEADERS.length; i++) {
            Cell cell = row.getCell(i);
            if (cell != null && !dataFormatter.formatCellValue(cell).trim().isEmpty()) return false;
        }
        return true;
    }

    private void importRow(Row row, DataFormatter dataFormatter) {
        String sku = getCellString(row, 0, dataFormatter);
        String productName = getCellString(row, 1, dataFormatter);
        String categoryName = getCellString(row, 2, dataFormatter);
        Double price = getCellDouble(row, 3, dataFormatter);
        Double originalPrice = getCellDouble(row, 4, dataFormatter);
        Integer quantity = getCellInt(row, 5, dataFormatter);
        String unit = getCellString(row, 6, dataFormatter);
        String description = getCellString(row, 7, dataFormatter);
        String activeRaw = getCellString(row, 8, dataFormatter);

        if (productName == null) {
            throw new IllegalArgumentException("Tên sản phẩm không được để trống");
        }
        if (price == null || price < 0) {
            throw new IllegalArgumentException("Giá bán không hợp lệ");
        }
        if (quantity == null || quantity < 0) {
            throw new IllegalArgumentException("Số lượng không hợp lệ");
        }
        if (categoryName == null) {
            throw new IllegalArgumentException("Phân loại không được để trống");
        }
        if (originalPrice != null && originalPrice <= price) {
            throw new IllegalArgumentException("Giá gốc phải lớn hơn giá bán");
        }
        Category category = this.categoryRepository.findByName(categoryName)
                .orElseThrow(() -> new IllegalArgumentException("Phân loại '" + categoryName + "' không tồn tại"));

        Product product = null;
        if (sku != null) {
            product = this.productRepository.findBySku(sku).orElse(null);
        }
        if (product == null) {
            if (sku != null && !this.isSkuAvailable(sku, null)) {
                throw new IllegalArgumentException("SKU '" + sku + "' đã được dùng cho sản phẩm khác");
            }
            product = new Product();
            product.setSku(sku);
        }

        product.setProductName(productName);
        product.setCategory(category);
        product.setPrice(price);
        product.setOriginalPrice(originalPrice);
        product.setQuantity(quantity);
        product.setUnit(unit);
        product.setDescription(description);
        product.setActive(activeRaw == null || !(activeRaw.equalsIgnoreCase("false") || activeRaw.equals("0")));

        this.productRepository.save(product);
    }

    private String getCellString(Row row, int idx, DataFormatter dataFormatter) {
        Cell cell = row.getCell(idx);
        if (cell == null) return null;
        String value = dataFormatter.formatCellValue(cell).trim();
        return value.isEmpty() ? null : value;
    }

    private Double getCellDouble(Row row, int idx, DataFormatter dataFormatter) {
        String value = getCellString(row, idx, dataFormatter);
        if (value == null) return null;
        try {
            return Double.parseDouble(value.replace(",", "").trim());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Giá trị số không hợp lệ ở cột " + (idx + 1) + ": " + value);
        }
    }

    private Integer getCellInt(Row row, int idx, DataFormatter dataFormatter) {
        Double value = getCellDouble(row, idx, dataFormatter);
        return value == null ? null : value.intValue();
    }
}
