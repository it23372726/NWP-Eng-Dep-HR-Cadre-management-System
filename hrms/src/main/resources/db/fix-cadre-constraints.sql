-- Manual migration helpers (app also runs CadrePositionSchemaMigration on startup)
-- Cadre: one row per designation (service comes from designation)
ALTER TABLE cadre_positions DROP INDEX uk_cadre_designation_service;
ALTER TABLE cadre_positions DROP COLUMN service_id;
ALTER TABLE cadre_positions
    ADD CONSTRAINT uk_cadre_designation UNIQUE (designation_id);

-- Employee: service is derived from designation
ALTER TABLE employees DROP COLUMN service_id;

-- Seed service levels if missing
INSERT IGNORE INTO service_levels (level_name) VALUES
    ('Senior'),
    ('Tertiary'),
    ('Secondary'),
    ('Primary');
