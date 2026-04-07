package com.truyenhay.backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/upload")
@CrossOrigin(origins = "*")
public class UploadController {

    @Value("${app.upload.dir:uploads/covers}")
    private String uploadDir;

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(Paths.get(uploadDir));
        } catch (IOException e) {
            throw new RuntimeException("Không thể tạo thư mục upload: " + uploadDir, e);
        }
    }

    /**
     * POST /api/upload/cover — Upload ảnh bìa truyện
     * Trả về URL tương đối để lưu vào DB
     */
    @PostMapping("/cover")
    public ResponseEntity<?> uploadCover(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File rỗng!");
        }

        // Kiểm tra loại file
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body("Chỉ chấp nhận file ảnh (jpg, png, webp).");
        }

        try {
            // Tạo tên file unique để tránh trùng
            String ext = getExtension(file.getOriginalFilename());
            String fileName = UUID.randomUUID().toString() + ext;
            Path targetPath = Paths.get(uploadDir).resolve(fileName);

            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            // Trả về URL tương đối dùng để lưu vào DB
            String fileUrl = "/api/upload/covers/" + fileName;
            return ResponseEntity.ok(Map.of("url", fileUrl, "fileName", fileName));

        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Lỗi lưu file: " + e.getMessage());
        }
    }

    /**
     * GET /api/upload/covers/{fileName} — Serve ảnh bìa tĩnh
     */
    @GetMapping("/covers/{fileName}")
    public ResponseEntity<byte[]> serveCover(@PathVariable String fileName) {
        try {
            Path filePath = Paths.get(uploadDir).resolve(fileName);
            if (!Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }

            byte[] data = Files.readAllBytes(filePath);
            String contentType = Files.probeContentType(filePath);
            if (contentType == null) contentType = "image/jpeg";

            return ResponseEntity.ok()
                    .header("Content-Type", contentType)
                    .header("Cache-Control", "public, max-age=86400")
                    .body(data);

        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    private String getExtension(String filename) {
        if (filename == null) return ".jpg";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : ".jpg";
    }
}
