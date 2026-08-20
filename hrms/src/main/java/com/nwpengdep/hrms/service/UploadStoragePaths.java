package com.nwpengdep.hrms.service;

import java.nio.file.Path;
import java.nio.file.Paths;

final class UploadStoragePaths {

    private UploadStoragePaths() {
    }

    static Path resolveInsideDirectory(String directory, String fileName) {
        if (fileName == null || fileName.isBlank()) {
            throw new IllegalArgumentException("Upload file name is required");
        }

        Path baseDir = Paths.get(directory).toAbsolutePath().normalize();
        Path filePath = baseDir.resolve(fileName).normalize();
        if (!filePath.startsWith(baseDir)) {
            throw new IllegalArgumentException("Upload path is outside the storage directory");
        }
        return filePath;
    }
}
