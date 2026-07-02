package com.nwpengdep.hrms.exception;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Pattern DUPLICATE_ENTRY_PATTERN =
            Pattern.compile("Duplicate entry '([^']+)' for key '([^']+)'");

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> handleRuntimeException(
            RuntimeException ex
    ) {
        log.warn("Request rejected: {}", ex.getMessage(), ex);

        String message = ex.getMessage();
        if (message == null || message.isBlank()) {
            message = "Request could not be processed";
        }

        return ResponseEntity
                .badRequest()
                .body(message);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<?> handleMessageNotReadable(
            HttpMessageNotReadableException ex
    ) {
        log.warn("Invalid request body: {}", ex.getMessage());

        String message = "Invalid request data";
        if (ex.getMostSpecificCause() != null
                && ex.getMostSpecificCause().getMessage() != null) {
            message = ex.getMostSpecificCause().getMessage();
        }

        return ResponseEntity
                .badRequest()
                .body(message);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> handleDataIntegrityViolation(
            DataIntegrityViolationException ex
    ) {
        String message = ex.getMostSpecificCause() != null
                ? ex.getMostSpecificCause().getMessage()
                : ex.getMessage();

        String duplicateMessage = resolveDuplicateEntryMessage(message);
        if (duplicateMessage != null) {
            return ResponseEntity.badRequest().body(duplicateMessage);
        }

        if (message != null && message.contains("action_type")) {
            return ResponseEntity
                    .badRequest()
                    .body(
                            "Unable to save lifecycle action. Please contact administrator."
                    );
        }

        if (message != null && message.contains("requirement_type")) {
            return ResponseEntity
                    .badRequest()
                    .body(
                            "Unable to save employee requirement. "
                                    + "Database schema is out of date; restart the backend."
                    );
        }

        return ResponseEntity
                .badRequest()
                .body("Could not save record");
    }

    private String resolveDuplicateEntryMessage(String message) {
        if (message == null || !message.contains("Duplicate entry")) {
            return null;
        }

        Matcher matcher = DUPLICATE_ENTRY_PATTERN.matcher(message);
        if (!matcher.find()) {
            return "A record with the same unique value already exists";
        }

        String duplicateValue = matcher.group(1);
        String constraintKey = matcher.group(2).toLowerCase();

        if (constraintKey.contains("cadre")) {
            return "Cadre already exists for this designation";
        }

        if (constraintKey.contains("employee_no")
                || constraintKey.contains("employeeno")) {
            return "Employee number '" + duplicateValue + "' is already in use";
        }

        if (constraintKey.contains("nic")) {
            return "NIC '" + duplicateValue + "' is already registered to another employee";
        }

        if (constraintKey.contains("employees.")) {
            return "An employee with this identifier already exists";
        }

        return "A record with the same unique value already exists";
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationException(
            MethodArgumentNotValidException ex
    ) {

        Map<String, String> errors = new HashMap<>();

        ex.getBindingResult()
                .getAllErrors()
                .forEach(error -> {

                    String fieldName =
                            ((FieldError) error).getField();

                    String errorMessage =
                            error.getDefaultMessage();

                    errors.put(fieldName, errorMessage);
                });

        return new ResponseEntity<>(
                errors,
                HttpStatus.BAD_REQUEST
        );
    }
}
