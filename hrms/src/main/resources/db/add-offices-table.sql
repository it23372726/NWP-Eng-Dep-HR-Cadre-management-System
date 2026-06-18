-- Office registry and action district tracking

CREATE TABLE IF NOT EXISTS offices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    district VARCHAR(50) NOT NULL,
    UNIQUE KEY uk_office_name_district (name, district)
);

ALTER TABLE employee_actions
    ADD COLUMN IF NOT EXISTS district VARCHAR(50) NULL;
