package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.entity.OrganizationSettings;
import com.nwpengdep.hrms.repository.OrganizationSettingsRepository;
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
public class OrganizationLogoService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            MediaType.IMAGE_JPEG_VALUE,
            MediaType.IMAGE_PNG_VALUE
    );

    private final OrganizationSettingsRepository settingsRepository;

    @Value("${hrms.uploads.organization-logo-dir:./uploads/organization-logo}")
    private String logoDir;

    @Value("${hrms.uploads.organization-logo-max-size-bytes:5242880}")
    private long maxSizeBytes;

    @PostConstruct
    public void initUploadDirectory() throws IOException {
        Files.createDirectories(Paths.get(logoDir));
    }

    @Transactional
    public OrganizationSettings uploadLogo(MultipartFile file) {
        validateFile(file);

        OrganizationSettings settings = findOrCreateSettings();
        String extension = resolveExtension(file);
        deleteLogoFile(settings.getLogoPath());

        String fileName = "logo." + extension;
        Path targetPath = UploadStoragePaths.resolveInsideDirectory(logoDir, fileName);

        try {
            Files.createDirectories(targetPath.getParent());
            Files.write(targetPath, file.getBytes());
        } catch (IOException e) {
            throw new RuntimeException("Failed to save organization logo", e);
        }

        settings.setLogoPath(fileName);
        return settingsRepository.save(settings);
    }

    public Optional<LogoResource> getLogoResource() {
        Optional<OrganizationSettings> settings = settingsRepository.findById(
                OrganizationSettings.SINGLETON_ID
        );
        if (settings.isEmpty()) {
            return Optional.empty();
        }

        String logoPath = settings.get().getLogoPath();
        if (logoPath == null || logoPath.isBlank()) {
            return Optional.empty();
        }

        Path filePath;
        try {
            filePath = UploadStoragePaths.resolveInsideDirectory(logoDir, logoPath);
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
        if (!Files.exists(filePath)) {
            return Optional.empty();
        }

        String contentType = logoPath.toLowerCase(Locale.ROOT).endsWith(".png")
                ? MediaType.IMAGE_PNG_VALUE
                : MediaType.IMAGE_JPEG_VALUE;

        return Optional.of(new LogoResource(new FileSystemResource(filePath), contentType));
    }

    @Transactional
    public OrganizationSettings deleteLogo() {
        OrganizationSettings settings = findOrCreateSettings();
        deleteLogoFile(settings.getLogoPath());
        settings.setLogoPath(null);
        return settingsRepository.save(settings);
    }

    private OrganizationSettings findOrCreateSettings() {
        return settingsRepository.findById(OrganizationSettings.SINGLETON_ID)
                .orElseGet(() -> settingsRepository.save(
                        OrganizationSettings.builder()
                                .id(OrganizationSettings.SINGLETON_ID)
                                .primaryDepartmentName("")
                                .provincialCouncilName("")
                                .departmentShortName("")
                                .applicationName("HRMS")
                                .councilLabel("")
                                .districtsJson("[]")
                                .build()
                ));
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Logo file is required");
        }

        if (file.getSize() > maxSizeBytes) {
            throw new IllegalArgumentException(
                    "Logo must be smaller than " + (maxSizeBytes / (1024 * 1024)) + " MB"
            );
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Only JPEG and PNG logos are allowed");
        }
    }

    private String resolveExtension(MultipartFile file) {
        if (MediaType.IMAGE_PNG_VALUE.equals(file.getContentType())) {
            return "png";
        }
        return "jpg";
    }

    private void deleteLogoFile(String logoPath) {
        if (logoPath == null || logoPath.isBlank()) {
            return;
        }

        try {
            Files.deleteIfExists(UploadStoragePaths.resolveInsideDirectory(logoDir, logoPath));
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete organization logo", e);
        }
    }

    public record LogoResource(Resource resource, String contentType) {}
}
