ALTER TABLE employees
    ADD COLUMN private_vehicle_used_for_gov_work TINYINT(1) NULL,
    ADD COLUMN private_vehicle_description VARCHAR(512) NULL,
    ADD COLUMN private_vehicle_permission_date DATE NULL;
