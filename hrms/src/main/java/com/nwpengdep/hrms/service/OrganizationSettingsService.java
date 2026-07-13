package com.nwpengdep.hrms.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nwpengdep.hrms.constants.DepartmentConstants;
import com.nwpengdep.hrms.dto.OrganizationSettingsResponse;
import com.nwpengdep.hrms.dto.OrganizationSettingsUpdateRequest;
import com.nwpengdep.hrms.entity.OrganizationSettings;
import com.nwpengdep.hrms.repository.OrganizationSettingsRepository;
import com.nwpengdep.hrms.util.OrganizationSettingsDefaults;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrganizationSettingsService {

    private final OrganizationSettingsRepository settingsRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional(readOnly = true)
    public OrganizationSettingsResponse getSettings() {
        return findSettings()
                .map(this::toResponse)
                .orElseGet(this::emptyResponse);
    }

    @Transactional(readOnly = true)
    public Optional<OrganizationSettings> getEntity() {
        return findSettings();
    }

    public String getPrimaryDepartmentName() {
        return DepartmentConstants.getPrimaryDepartmentName();
    }

    public boolean isPrimaryDepartment(String department) {
        return DepartmentConstants.isPrimaryDepartment(department);
    }

    public List<String> getDistricts() {
        return findSettings()
                .map(settings -> parseDistricts(settings.getDistrictsJson()))
                .orElseGet(List::of);
    }

    public void requireConfiguredDistrict(String district) {
        String normalized = normalizeDistrictLabel(district);
        if (normalized == null) {
            throw new RuntimeException("District is required");
        }
        List<String> districts = getDistricts();
        if (districts.isEmpty()) {
            throw new RuntimeException(
                    "Organization districts are not configured. "
                            + "Save Organization Settings before creating offices or employees."
            );
        }
        boolean allowed = districts.stream()
                .anyMatch(item -> item.equalsIgnoreCase(normalized));
        if (!allowed) {
            throw new RuntimeException("Invalid district: " + district);
        }
    }

    public String normalizeDistrictLabel(String district) {
        if (district == null || district.isBlank()) {
            return null;
        }
        String trimmed = district.trim();
        return getDistricts().stream()
                .filter(item -> item.equalsIgnoreCase(trimmed))
                .findFirst()
                .orElse(trimmed);
    }

    @Transactional
    public OrganizationSettingsResponse updateSettings(
            OrganizationSettingsUpdateRequest request
    ) {
        OrganizationSettings settings = findSettings()
                .orElseGet(this::newSettingsEntity);

        String oldPrimary = settings.getPrimaryDepartmentName() == null
                ? ""
                : settings.getPrimaryDepartmentName();
        List<String> oldDistricts = parseDistricts(settings.getDistrictsJson());

        String newPrimary = requireText(
                request.getPrimaryDepartmentName(),
                "Primary department name"
        );
        List<String> newDistricts = OrganizationSettingsDefaults.normalizeDistricts(
                request.getDistricts()
        );

        boolean primaryChanged = !oldPrimary.isBlank()
                && !oldPrimary.equalsIgnoreCase(newPrimary);
        if (primaryChanged) {
            String mode = request.getDepartmentRenameMode() == null
                    ? ""
                    : request.getDepartmentRenameMode().trim().toUpperCase(Locale.ROOT);
            if (!OrganizationSettingsDefaults.RENAME_MIGRATE.equals(mode)
                    && !OrganizationSettingsDefaults.RENAME_KEEP.equals(mode)) {
                throw new RuntimeException(
                        "departmentRenameMode is required when changing the primary "
                                + "department name (MIGRATE_EXISTING or KEEP_EXISTING)"
                );
            }
            if (OrganizationSettingsDefaults.RENAME_MIGRATE.equals(mode)) {
                migratePrimaryDepartment(oldPrimary, newPrimary);
            }
        }

        applyDistrictChanges(oldDistricts, newDistricts);

        settings.setPrimaryDepartmentName(newPrimary);
        settings.setProvincialCouncilName(requireText(
                request.getProvincialCouncilName(),
                "Provincial council name"
        ));
        settings.setDepartmentShortName(requireText(
                request.getDepartmentShortName(),
                "Department short name"
        ));
        settings.setApplicationName(requireText(
                request.getApplicationName(),
                "Application name"
        ));
        settings.setCouncilLabel(requireText(
                request.getCouncilLabel(),
                "Council label"
        ));
        settings.setDistrictsJson(writeDistricts(newDistricts));

        OrganizationSettings saved = settingsRepository.save(settings);
        DepartmentConstants.setPrimaryDepartmentName(saved.getPrimaryDepartmentName());
        return toResponse(saved);
    }

    public void refreshRuntimeCache() {
        findSettings().ifPresentOrElse(
                settings -> DepartmentConstants.setPrimaryDepartmentName(
                        settings.getPrimaryDepartmentName()
                ),
                () -> DepartmentConstants.setPrimaryDepartmentName("")
        );
    }

    @EventListener(ApplicationReadyEvent.class)
    public void loadRuntimeCacheOnStartup() {
        refreshRuntimeCache();
    }

    private Optional<OrganizationSettings> findSettings() {
        return settingsRepository.findById(OrganizationSettings.SINGLETON_ID);
    }

    private OrganizationSettings newSettingsEntity() {
        return OrganizationSettings.builder()
                .id(OrganizationSettings.SINGLETON_ID)
                .primaryDepartmentName("")
                .provincialCouncilName("")
                .departmentShortName("")
                .applicationName("")
                .councilLabel("")
                .districtsJson("[]")
                .build();
    }

    private OrganizationSettingsResponse emptyResponse() {
        return OrganizationSettingsResponse.builder()
                .primaryDepartmentName("")
                .provincialCouncilName("")
                .departmentShortName("")
                .applicationName("")
                .councilLabel("")
                .districts(List.of())
                .reportHeaderSubtitle("")
                .reportHeaderUppercase("")
                .updatedAt(null)
                .build();
    }

    private void migratePrimaryDepartment(String oldName, String newName) {
        int employees = jdbcTemplate.update(
                """
                        UPDATE employees
                        SET current_department = ?
                        WHERE LOWER(TRIM(current_department)) = LOWER(TRIM(?))
                        """,
                newName,
                oldName
        );
        int actionsDepartment = jdbcTemplate.update(
                """
                        UPDATE employee_actions
                        SET department = ?
                        WHERE LOWER(TRIM(department)) = LOWER(TRIM(?))
                        """,
                newName,
                oldName
        );
        int actionsFrom = jdbcTemplate.update(
                """
                        UPDATE employee_actions
                        SET from_department = ?
                        WHERE LOWER(TRIM(from_department)) = LOWER(TRIM(?))
                        """,
                newName,
                oldName
        );
        int actionsTo = jdbcTemplate.update(
                """
                        UPDATE employee_actions
                        SET to_department = ?
                        WHERE LOWER(TRIM(to_department)) = LOWER(TRIM(?))
                        """,
                newName,
                oldName
        );
        log.info(
                "Migrated primary department '{}' -> '{}': employees={}, "
                        + "action.department={}, from={}, to={}",
                oldName,
                newName,
                employees,
                actionsDepartment,
                actionsFrom,
                actionsTo
        );
    }

    private void applyDistrictChanges(
            List<String> oldDistricts,
            List<String> newDistricts
    ) {
        Set<String> renamedFromLower = new HashSet<>();

        // Same-index edits are treated as renames so offices/employees/actions are migrated.
        // True removals stay blocked when in use.
        int shared = Math.min(oldDistricts.size(), newDistricts.size());
        for (int index = 0; index < shared; index++) {
            String oldLabel = oldDistricts.get(index);
            String newLabel = newDistricts.get(index);
            String oldLower = oldLabel.toLowerCase(Locale.ROOT);
            String newLower = newLabel.toLowerCase(Locale.ROOT);

            if (oldLower.equals(newLower)) {
                if (!Objects.equals(oldLabel, newLabel)) {
                    renameDistrict(oldLabel, newLabel);
                }
                renamedFromLower.add(oldLower);
                continue;
            }

            boolean oldStillInNew = containsDistrictIgnoreCase(newDistricts, oldLabel);
            boolean newAlreadyInOld = containsDistrictIgnoreCase(oldDistricts, newLabel);
            if (!oldStillInNew && !newAlreadyInOld) {
                renameDistrict(oldLabel, newLabel);
                renamedFromLower.add(oldLower);
            }
        }

        for (String oldLabel : oldDistricts) {
            String oldLower = oldLabel.toLowerCase(Locale.ROOT);
            if (renamedFromLower.contains(oldLower)) {
                continue;
            }
            if (containsDistrictIgnoreCase(newDistricts, oldLabel)) {
                continue;
            }
            if (isDistrictInUse(oldLabel)) {
                throw new RuntimeException(
                        "Cannot remove district \"" + oldLabel
                                + "\" while offices or employees still use it. "
                                + "Reassign or rename them first."
                );
            }
        }

        for (String district : newDistricts) {
            rewriteLegacyDistrictCodes(district);
        }
    }

    private boolean containsDistrictIgnoreCase(List<String> districts, String label) {
        return districts.stream()
                .anyMatch(district -> district.equalsIgnoreCase(label));
    }

    private void renameDistrict(String oldLabel, String newLabel) {
        jdbcTemplate.update(
                "UPDATE offices SET district = ? WHERE LOWER(TRIM(district)) = LOWER(TRIM(?))",
                newLabel,
                oldLabel
        );
        jdbcTemplate.update(
                """
                        UPDATE employees
                        SET current_district_of_working = ?
                        WHERE LOWER(TRIM(current_district_of_working)) = LOWER(TRIM(?))
                        """,
                newLabel,
                oldLabel
        );
        if (columnExists("employee_actions", "district")) {
            jdbcTemplate.update(
                    """
                            UPDATE employee_actions
                            SET district = ?
                            WHERE LOWER(TRIM(district)) = LOWER(TRIM(?))
                            """,
                    newLabel,
                    oldLabel
            );
        }
        log.info("Renamed district '{}' -> '{}'", oldLabel, newLabel);
    }

    private boolean isDistrictInUse(String district) {
        Integer offices = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*) FROM offices
                        WHERE LOWER(TRIM(district)) = LOWER(TRIM(?))
                        """,
                Integer.class,
                district
        );
        Integer employees = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*) FROM employees
                        WHERE current_district_of_working IS NOT NULL
                          AND LOWER(TRIM(current_district_of_working)) = LOWER(TRIM(?))
                        """,
                Integer.class,
                district
        );
        int actionCount = 0;
        if (columnExists("employee_actions", "district")) {
            Integer actions = jdbcTemplate.queryForObject(
                    """
                            SELECT COUNT(*) FROM employee_actions
                            WHERE district IS NOT NULL
                              AND LOWER(TRIM(district)) = LOWER(TRIM(?))
                            """,
                    Integer.class,
                    district
            );
            actionCount = actions != null ? actions : 0;
        }
        return (offices != null && offices > 0)
                || (employees != null && employees > 0)
                || actionCount > 0;
    }

    private void rewriteLegacyDistrictCodes(String label) {
        String code = label.toUpperCase(Locale.ROOT).replace(' ', '_');
        jdbcTemplate.update(
                "UPDATE offices SET district = ? WHERE district = ?",
                label,
                code
        );
        jdbcTemplate.update(
                """
                        UPDATE employees
                        SET current_district_of_working = ?
                        WHERE current_district_of_working = ?
                        """,
                label,
                code
        );
        if (columnExists("employee_actions", "district")) {
            jdbcTemplate.update(
                    "UPDATE employee_actions SET district = ? WHERE district = ?",
                    label,
                    code
            );
        }
    }

    private OrganizationSettingsResponse toResponse(OrganizationSettings settings) {
        List<String> districts = parseDistricts(settings.getDistrictsJson());
        return OrganizationSettingsResponse.builder()
                .primaryDepartmentName(nullToEmpty(settings.getPrimaryDepartmentName()))
                .provincialCouncilName(nullToEmpty(settings.getProvincialCouncilName()))
                .departmentShortName(nullToEmpty(settings.getDepartmentShortName()))
                .applicationName(nullToEmpty(settings.getApplicationName()))
                .councilLabel(nullToEmpty(settings.getCouncilLabel()))
                .districts(districts)
                .reportHeaderSubtitle(OrganizationSettingsDefaults.reportHeaderSubtitle(
                        settings.getProvincialCouncilName(),
                        settings.getDepartmentShortName()
                ))
                .reportHeaderUppercase(OrganizationSettingsDefaults.reportHeaderUppercase(
                        settings.getProvincialCouncilName(),
                        settings.getPrimaryDepartmentName()
                ))
                .updatedAt(settings.getUpdatedAt())
                .build();
    }

    private List<String> parseDistricts(String json) {
        if (json == null || json.isBlank()) {
            return new ArrayList<>();
        }
        try {
            List<String> parsed = objectMapper.readValue(
                    json,
                    new TypeReference<List<String>>() {
                    }
            );
            if (parsed == null || parsed.isEmpty()) {
                return new ArrayList<>();
            }
            return OrganizationSettingsDefaults.normalizeDistricts(parsed);
        } catch (RuntimeException | JsonProcessingException exception) {
            log.warn("Failed to parse districts_json, using empty list: {}", exception.getMessage());
            return new ArrayList<>();
        }
    }

    private String writeDistricts(List<String> districts) {
        try {
            return objectMapper.writeValueAsString(districts);
        } catch (JsonProcessingException exception) {
            throw new RuntimeException("Failed to serialize districts", exception);
        }
    }

    private String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new RuntimeException(fieldName + " is required");
        }
        return value.trim();
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private boolean columnExists(String tableName, String columnName) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = ?
                          AND COLUMN_NAME = ?
                        """,
                Integer.class,
                tableName,
                columnName
        );
        return count != null && count > 0;
    }
}
