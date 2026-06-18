package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class EmployeePhotoService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            MediaType.IMAGE_JPEG_VALUE,
            MediaType.IMAGE_PNG_VALUE
    );

    private final EmployeeRepository employeeRepository;

    @Value("${hrms.uploads.employee-photos-dir:./uploads/employee-photos}")
    private String photosDir;

    @Value("${hrms.uploads.employee-photo-max-size-bytes:5242880}")
    private long maxSizeBytes;

    @PostConstruct
    public void initUploadDirectory() throws IOException {
        Files.createDirectories(Paths.get(photosDir));
    }

    @Transactional
    public Employee uploadPhoto(Long employeeId, MultipartFile file) {
        validateFile(file);

        Employee employee = getEmployee(employeeId);
        String extension = resolveExtension(file);
        deletePhotoFile(employee.getProfilePhotoPath());

        String fileName = employeeId + "." + extension;
        Path targetPath = Paths.get(photosDir, fileName);

        try {
            Files.write(targetPath, file.getBytes());
        } catch (IOException e) {
            throw new RuntimeException("Failed to save employee photo", e);
        }

        employee.setProfilePhotoPath(fileName);
        return employeeRepository.save(employee);
    }

    public Optional<PhotoResource> getPhotoResource(Long employeeId) {
        Employee employee = getEmployee(employeeId);

        if (employee.getProfilePhotoPath() == null
                || employee.getProfilePhotoPath().isBlank()) {
            return Optional.empty();
        }

        Path photoPath = Paths.get(photosDir, employee.getProfilePhotoPath());
        if (!Files.exists(photoPath)) {
            return Optional.empty();
        }

        String contentType = employee.getProfilePhotoPath().toLowerCase(Locale.ROOT)
                .endsWith(".png")
                ? MediaType.IMAGE_PNG_VALUE
                : MediaType.IMAGE_JPEG_VALUE;

        return Optional.of(new PhotoResource(new FileSystemResource(photoPath), contentType));
    }

    @Transactional
    public Employee deletePhoto(Long employeeId) {
        Employee employee = getEmployee(employeeId);
        deletePhotoFile(employee.getProfilePhotoPath());
        employee.setProfilePhotoPath(null);
        return employeeRepository.save(employee);
    }

    public void deletePhotoForEmployee(Employee employee) {
        deletePhotoFile(employee.getProfilePhotoPath());
    }

    private Employee getEmployee(Long employeeId) {
        return employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Photo file is required");
        }

        if (file.getSize() > maxSizeBytes) {
            throw new IllegalArgumentException(
                    "Photo must be smaller than " + (maxSizeBytes / (1024 * 1024)) + " MB"
            );
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Only JPEG and PNG photos are allowed");
        }
    }

    private String resolveExtension(MultipartFile file) {
        String contentType = file.getContentType();
        if (MediaType.IMAGE_PNG_VALUE.equals(contentType)) {
            return "png";
        }
        return "jpg";
    }

    private void deletePhotoFile(String profilePhotoPath) {
        if (profilePhotoPath == null || profilePhotoPath.isBlank()) {
            return;
        }

        try {
            Files.deleteIfExists(Paths.get(photosDir, profilePhotoPath));
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete employee photo", e);
        }
    }

    public record PhotoResource(Resource resource, String contentType) {}
}
