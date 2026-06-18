-- Add department/office tracking for employees and lifecycle actions

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS current_department VARCHAR(255),
    ADD COLUMN IF NOT EXISTS current_office VARCHAR(255);

ALTER TABLE employee_actions
    ADD COLUMN IF NOT EXISTS department VARCHAR(255),
    ADD COLUMN IF NOT EXISTS office VARCHAR(255),
    ADD COLUMN IF NOT EXISTS from_department VARCHAR(255),
    ADD COLUMN IF NOT EXISTS from_office VARCHAR(255),
    ADD COLUMN IF NOT EXISTS to_department VARCHAR(255),
    ADD COLUMN IF NOT EXISTS to_office VARCHAR(255),
    ADD COLUMN IF NOT EXISTS linked_action_id BIGINT;

-- Backfill existing records
UPDATE employees
SET current_department = 'N.W.P. Engineering Department',
    current_office = COALESCE(NULLIF(TRIM(current_working_place), ''), 'Unknown')
WHERE current_department IS NULL;

UPDATE employee_actions
SET department = 'N.W.P. Engineering Department',
    office = COALESCE(NULLIF(TRIM(transferred_from), ''), NULLIF(TRIM(transferred_to), ''), 'Unknown')
WHERE department IS NULL;

UPDATE employee_actions
SET from_department = transferred_from,
    to_department = transferred_to
WHERE action_type = 'TRANSFER_OUT'
  AND transferred_to IS NOT NULL
  AND to_department IS NULL;

UPDATE employee_actions
SET from_department = transferred_from
WHERE action_type = 'TRANSFER_IN'
  AND transferred_from IS NOT NULL
  AND from_department IS NULL;
