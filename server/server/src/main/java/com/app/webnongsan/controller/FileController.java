package com.app.webnongsan.controller;

import com.app.webnongsan.domain.response.file.ResUploadFileDTO;
import com.app.webnongsan.service.CloudinaryService;
import com.app.webnongsan.service.FileService;
import com.app.webnongsan.util.annotation.ApiMessage;
import com.app.webnongsan.util.exception.StorageException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URISyntaxException;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
@RestController
@RequestMapping("api/v2")
public class FileController {
    @Value("${upload-file.base-uri}")
    private String baseURI;

    private final FileService fileService;
    private final CloudinaryService cloudinaryService;

    public FileController(FileService fileService, CloudinaryService cloudinaryService) {
        this.fileService = fileService;
        this.cloudinaryService = cloudinaryService;
    }

    @PostMapping("files")
    @ApiMessage("Upload single file")
    public ResponseEntity<ResUploadFileDTO> upload(@RequestParam(name = "file", required = false) MultipartFile file,
                                                   @RequestParam("folder") String folder ) throws URISyntaxException, IOException, StorageException {
        //Validate empty file
        if (file == null || file.isEmpty()){
            throw new StorageException("File is empty. Please choose a file");
        }

        //Validate extension file
        String fileName = file.getOriginalFilename();
        List<String> allowedExtensions = Arrays.asList("jpg", "jpeg", "png");
        boolean isValid = allowedExtensions.stream().anyMatch(item -> {
            assert fileName != null;
            return fileName.toLowerCase().endsWith(item);
        });
        if (!isValid){
            throw new StorageException("File not allowed! Please use file " + allowedExtensions.toString());
        }
        //create folder if not exist
        this.fileService.createDirectory(baseURI + folder);
        //save file
        String uploadFile = cloudinaryService.uploadFile(file, folder);
        ResUploadFileDTO rs = new ResUploadFileDTO(uploadFile, Instant.now());
        return ResponseEntity.ok(rs);
    }
}
