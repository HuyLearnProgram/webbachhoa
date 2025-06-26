package com.app.webnongsan.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLEncoder;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Service
public class FileService {
    @Value("${upload-file.base-uri}")
    private String basePath;  // Không dùng từ URI nữa

    public void createDirectory(String folder) throws URISyntaxException {
        URI uri = new URI(folder);
        Path path = Paths.get(uri);
        File tmpDir = new File(path.toString());
        if (!tmpDir.isDirectory()) {
            try {
                Files.createDirectory(tmpDir.toPath());
                System.out.println(">>> CREATE NEW DIRECTORY SUCCESSFUL, PATH = " + tmpDir.toPath());
            } catch (IOException e) {
                e.printStackTrace();
            }   
        } else {
            System.out.println(">>> SKIP MAKING DIRECTORY, ALREADY EXISTS");
        }
    }

    public String store(MultipartFile file, String folder) throws IOException {
        String originalFileName = file.getOriginalFilename();
        String finalName = System.currentTimeMillis() + "-" + originalFileName;
        String encodedFileName = URLEncoder.encode(finalName, "UTF-8").replace("+", "%20");

        // Tạo đường dẫn thực tế
        Path folderPath = Paths.get(basePath, folder);
        Files.createDirectories(folderPath); // Tạo folder nếu chưa có

        Path filePath = folderPath.resolve(encodedFileName);

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, filePath, StandardCopyOption.REPLACE_EXISTING);
        }

        return finalName;
    }

//    public long getFileLength (String fileName, String folder) throws URISyntaxException {
//        URI uri = new URI (baseURI + folder + "/" + fileName);
//        Path path = Paths.get(uri);
//        File tmpDir = new File(path.toString());
//        // file không tồn tại, hoặc file là 1 director => return 0
//        if (!tmpDir.exists() || tmpDir.isDirectory())
//            return 0;
//        return tmpDir.length();
//    }
//
//    public InputStreamResource getResource(String fileName, String folder)
//            throws URISyntaxException, FileNotFoundException {
//        URI uri = new URI(baseURI + folder + "/" + fileName);
//        Path path = Paths.get(uri);
//
//        File file = new File(path.toString());
//        return new InputStreamResource(new FileInputStream(file));
//    }

}
