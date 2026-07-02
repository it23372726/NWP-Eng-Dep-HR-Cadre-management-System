package com.nwpengdep.hrms.audit;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Component
public class AuditDiffUtil {

    private static final Set<String> REDACTED_FIELDS = Set.of(
            "password",
            "newPassword",
            "profilePhotoPath",
            "profilePhoto",
            "photo",
            "photoData",
            "file"
    );

    private final ObjectMapper objectMapper = createObjectMapper();

    private static ObjectMapper createObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mapper.disable(SerializationFeature.FAIL_ON_EMPTY_BEANS);
        return mapper;
    }

    public Map<String, Object> toMap(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof Map<?, ?> map) {
            Map<String, Object> result = new LinkedHashMap<>();
            map.forEach((key, entryValue) ->
                    result.put(String.valueOf(key), redactIfNeeded(String.valueOf(key), entryValue))
            );
            return result;
        }

        Map<String, Object> mapped = objectMapper.convertValue(
                value,
                new TypeReference<LinkedHashMap<String, Object>>() {
                }
        );
        return redactMap(mapped);
    }

    public List<String> diffFields(
            Map<String, Object> oldValues,
            Map<String, Object> newValues
    ) {
        if (oldValues == null || newValues == null) {
            return List.of();
        }

        List<String> changed = new ArrayList<>();
        for (Map.Entry<String, Object> entry : newValues.entrySet()) {
            String key = entry.getKey();
            Object oldValue = oldValues.get(key);
            Object newValue = entry.getValue();
            if (!valuesEqual(oldValue, newValue)) {
                changed.add(key);
            }
        }
        return changed;
    }

    public String computeContentHash(
            Map<String, Object> oldValues,
            Map<String, Object> newValues
    ) {
        try {
            String payload = objectMapper.writeValueAsString(
                    Map.of(
                            "old", oldValues == null ? Map.of() : oldValues,
                            "new", newValues == null ? Map.of() : newValues
                    )
            );
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder();
            for (byte value : hash) {
                builder.append(String.format("%02x", value));
            }
            return builder.toString();
        } catch (Exception e) {
            log.warn("Failed to compute audit content hash: {}", e.getMessage());
            return null;
        }
    }

    private Map<String, Object> redactMap(Map<String, Object> values) {
        Map<String, Object> redacted = new LinkedHashMap<>();
        values.forEach((key, value) -> redacted.put(key, redactIfNeeded(key, value)));
        return redacted;
    }

    private Object redactIfNeeded(String key, Object value) {
        if (key != null && REDACTED_FIELDS.contains(key)) {
            return value == null ? null : "[REDACTED]";
        }
        return value;
    }

    private boolean valuesEqual(Object oldValue, Object newValue) {
        if (oldValue == null && newValue == null) {
            return true;
        }
        if (oldValue == null || newValue == null) {
            return false;
        }
        return oldValue.equals(newValue);
    }
}
