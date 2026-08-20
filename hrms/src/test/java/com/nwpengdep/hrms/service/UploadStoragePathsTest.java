package com.nwpengdep.hrms.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class UploadStoragePathsTest {

    @TempDir
    Path tempDir;

    @Test
    void resolvesFileInsideDirectory() {
        Path resolved = UploadStoragePaths.resolveInsideDirectory(
                tempDir.toString(),
                "12.jpg"
        );
        assertTrue(resolved.startsWith(tempDir.toAbsolutePath().normalize()));
        assertTrue(resolved.endsWith("12.jpg"));
    }

    @Test
    void rejectsPathOutsideDirectory() {
        assertThrows(IllegalArgumentException.class, () ->
                UploadStoragePaths.resolveInsideDirectory(tempDir.toString(), "../secret.jpg")
        );
    }
}
