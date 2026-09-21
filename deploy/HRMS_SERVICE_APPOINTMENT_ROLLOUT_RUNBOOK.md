# Appointment to Another Service rollout runbook

This runbook covers releasing the "Appointment to Another Service" lifecycle
action. The feature is shipped behind `hrms.service-appointments.enabled`, which
defaults to `false`. Deploying the build does **not** enable the feature.

Do not perform any step here against production before the staging rehearsal in
section 3 has completed successfully.

## 1. What the release changes in the database

All schema changes are additive. Nothing is dropped except one superseded unique
index, and only after its replacement exists.

New tables:

- `employee_service_appointments`
- `service_appointment_requirements`

New columns:

- `employees.version` (`BIGINT DEFAULT 0 NOT NULL`, optimistic locking)
- `employees.original_first_appointment_date`
- `employees.current_service_appointment_key`
- `employees.first_increment_due_date`
- `employee_actions.service_appointment_key`, `service_id`, `service_level_id`,
  `appointment_basis`, `appointment_letter_reference`, `increment_date`,
  `first_increment_due_date`
- `salary_increment_records.service_appointment_key`
- `salary_increment_records.active_scope_year` (MySQL/MariaDB generated column)

New enum value: `employee_actions.action_type` gains `SERVICE_APPOINTMENT`.

Index change on `salary_increment_records`: `uk_sir_active_scope_year`
(`employee_id`, `active_scope_year`) is added, then the old `uk_sir_active_year`
is dropped. The new key allows one active increment per appointment period per
due year instead of one per employee per due year, so an employee who changes
service mid-year can hold an increment in each period.

Tables and columns are created by `spring.jpa.hibernate.ddl-auto=update`. The
enum value and the salary index are applied by
`EmployeeActionSchemaMigration` (`@Order(200)`) and
`SalaryIncrementSchemaMigration` (`@Order(300)`), both on `ApplicationReadyEvent`.
`ServiceAppointmentSchemaReadiness` runs last and, when the feature is enabled,
fails startup if any required table, column, enum value, index, or employee
version value is missing. Startup is deliberately blocked rather than allowed to
write data a partially migrated schema cannot represent.

## 2. Verified backup and restore rehearsal

Do this first. Everything after it depends on a restore you have actually
proven, not a backup you merely possess.

1. Take a fresh logical backup and record its SHA-256 checksum. Use the
   procedure in `deploy/openshift/HRMS_MYSQL_PERSISTENCE_RUNBOOK.md`.
2. Restore that backup into a scratch database that is not production and not
   staging.
3. Confirm the restore is usable, not merely complete:

```sql
SELECT COUNT(*) FROM employees;
SELECT COUNT(*) FROM employee_actions;
SELECT COUNT(*) FROM salary_increment_records;
SELECT COUNT(*) FROM employee_actions WHERE deleted IS NULL OR deleted = FALSE;
```

4. Record the four counts. They are the comparison baseline for section 5.
5. Do not continue if the restore fails or the counts do not match the source.

## 3. Staging test against the production MySQL version

Native MySQL migration behaviour is **not** yet verified. The automated suite
runs on H2, which does not exercise MySQL generated columns, `ALTER TABLE
... MODIFY COLUMN action_type ENUM(...)`, or index replacement. Local MySQL
verification was attempted and abandoned when `mysqld` crashed during
initialisation, so this section is a hard prerequisite and not a formality.

1. Restore the production backup from section 2 into staging.
2. Confirm the staging server version matches production:

```sql
SELECT VERSION();
```

3. Deploy the new build to staging with the feature **disabled**.
4. Confirm the migrations applied:

```sql
SELECT COLUMN_TYPE FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employee_actions'
   AND COLUMN_NAME = 'action_type';

SELECT INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME, NON_UNIQUE
  FROM information_schema.STATISTICS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'salary_increment_records'
   AND INDEX_NAME IN ('uk_sir_active_scope_year', 'uk_sir_active_year');

SELECT COLUMN_NAME, GENERATION_EXPRESSION, EXTRA
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'salary_increment_records'
   AND COLUMN_NAME = 'active_scope_year';

SELECT COUNT(*) FROM employees WHERE version IS NULL;
```

Required results: the enum contains `'SERVICE_APPOINTMENT'`;
`uk_sir_active_scope_year` exists with two columns and `NON_UNIQUE = 0`;
`uk_sir_active_year` returns no rows; `active_scope_year` is `STORED GENERATED`;
no employee has a `NULL` version.

5. Confirm the replacement unique key did not reject existing data. The
   migration adds the key on a populated table, so a pre-existing duplicate
   would surface here:

```sql
SELECT employee_id, active_scope_year, COUNT(*)
  FROM salary_increment_records
 WHERE active_scope_year IS NOT NULL
 GROUP BY employee_id, active_scope_year
HAVING COUNT(*) > 1;
```

This must return no rows. If `ALTER TABLE ... ADD UNIQUE KEY` failed instead,
startup logs will show it and the readiness check will block enabling the
feature.

6. Run the section 5 regression checks on staging before touching production.
7. Only after all of the above, enable the feature on staging and rehearse the
   full business workflow end to end, including a cross-service appointment, a
   revision, a full-history edit, and an increment recorded against a previous
   appointment period.

## 4. Production deployment with the feature disabled

1. Announce a change window. Lifecycle edits should not be in progress.
2. Take a pre-migration backup and verify its checksum.
3. Deploy the new build with `hrms.service-appointments.enabled=false`
   (or simply unset; `false` is the default).
4. Watch startup logs for `EmployeeActionSchemaMigration`,
   `SalaryIncrementSchemaMigration`, and any warning about the unique key.
5. Re-run every query in section 3 step 4 and step 5 against production.

If the enum or index migration did not complete, stop. Leave the feature
disabled, keep the current binary running, and resolve the schema before
continuing. The application remains fully functional with the feature disabled.

## 5. Existing-employee regression checks and data integrity counts

Compare against the baseline recorded in section 2.

```sql
SELECT COUNT(*) FROM employees;
SELECT COUNT(*) FROM employee_actions;
SELECT COUNT(*) FROM salary_increment_records;
SELECT COUNT(*) FROM employee_actions WHERE deleted IS NULL OR deleted = FALSE;

-- No employee should be period-managed before the feature is used.
SELECT COUNT(*) FROM employees WHERE current_service_appointment_key IS NOT NULL;
SELECT COUNT(*) FROM employee_service_appointments;
SELECT COUNT(*) FROM employee_actions WHERE action_type = 'SERVICE_APPOINTMENT';
SELECT COUNT(*) FROM salary_increment_records WHERE service_appointment_key IS NOT NULL;
```

The first four counts must be unchanged. The last four must all be zero
immediately after deployment.

Then verify the application against real existing records, with the feature
still disabled:

- Open several employee profiles across different services and grades.
  "Date of First Appointment" must still be labelled that way, and no
  "Original Career Appointment" field should appear.
- Record, edit, and undo a salary increment for an employee who has never
  changed service.
- Edit a lifecycle action and delete a latest lifecycle action.
- Save a full career-history revision for an employee who has never changed
  service. This path still hard-deletes and rebuilds actions, as before.
- Run the Cadre report, the All Employee Details report and its export, the
  Changes report, and the Employee Summary PDF. The Cadre export gains two
  columns, "Service Appointment OUT" and "Service Appointment IN", both zero
  until the feature is used. The All Employee Details export gains
  "Original Career Appointment".
- Confirm the dashboard appointment counters are unchanged.

## 6. Enabling the feature

Only after section 5 passes.

1. Set `hrms.service-appointments.enabled=true` and restart.
2. Confirm startup succeeded. `ServiceAppointmentSchemaReadiness` throws and
   prevents startup if the schema is incomplete; a failure here means the
   feature must go back to disabled.
3. Confirm `GET /api/employees/lifecycle-capabilities` returns
   `{"serviceAppointmentsEnabled": true}`.
4. Record one real appointment with HR present, using the appointment letter.
   Verify on the profile: the new service and designation, Grade III, probation
   status, "First Appointment in Current Service" equal to the appointment date,
   "Original Career Appointment" equal to the employee's original career entry,
   the previous period's confirmation and requirement results preserved under
   "Service appointments", and the new increment schedule from the letter.
5. Re-run the Cadre report for the current period and confirm the OUT and IN
   counts reflect that single appointment.

## 7. Rollback limits

Read this before rolling back.

**Turning the feature off is safe. Reverting the binary after appointments have
been recorded is not.**

- Setting `hrms.service-appointments.enabled=false` keeps all recorded history
  readable and revisable. Existing appointment history continues to rebuild
  employee state correctly, individual actions stay editable, and previous
  increment periods stay selectable. Only creating a *new* service appointment
  is refused, whether through the profile action or through full-history
  editing, including for an employee who already has appointment periods.
- Do **not** deploy a binary that does not recognise `SERVICE_APPOINTMENT`
  once such an action exists in `employee_actions`. The old build cannot map the
  enum value and cannot reconstruct the employee from its own history. Employees
  with a service appointment would be misread, and a lifecycle recalculation on
  the old build would corrupt their current state.
- Before any binary rollback, confirm that nothing has been written:

```sql
SELECT COUNT(*) FROM employee_actions WHERE action_type = 'SERVICE_APPOINTMENT';
SELECT COUNT(*) FROM employee_service_appointments;
```

  Both must be zero. If either is non-zero, the only safe rollback is a restore
  from the pre-migration backup, which loses everything recorded since, or
  staying on the new binary with the feature disabled. Prefer the latter.
- The schema changes themselves are backward compatible with the previous
  binary, so leaving the added tables and columns in place is harmless. Do not
  drop them as part of a rollback; `uk_sir_active_year` would have to be
  recreated and it can conflict with increments already recorded in more than
  one appointment period during the same year.

## 8. Operational rule: active salary increments gate lifecycle edits

HR should be told about this before the feature is enabled, because it changes
the order in which corrections have to be made.

An **active** (recorded) salary increment blocks two kinds of lifecycle change:

1. Setting an appointment's effective date such that increments already recorded
   in the *previous* period would fall on or after that date. Those increments
   belong to the new appointment, not the old one.
2. Changing or removing an existing appointment's effective date, designation,
   or increment schedule while increments are recorded against it.

Both refusals name the affected due years and state the correction, for example:

> Salary increments for 2024, 2025 are recorded in the previous appointment but
> fall on or after 2024-01-01, so they belong to the new appointment instead.
> Undo them in that appointment's salary history, save this appointment, then
> record them again on the new increment schedule. Undoing keeps the original
> entries as audit records.

The correction order is: undo the affected increments in the Benefits tab
(newest first), save the appointment, then re-record the increments against the
correct period.

A **reversed** increment does not block anything. Undoing an increment means the
payment was withdrawn, so it no longer asserts that the employee was paid inside
that period. The reversed row is never deleted — it stays in the ledger with its
`REVERSED` status, who reversed it, and when — so the audit trail survives while
the lifecycle correction remains possible.

This distinction matters. Counting reversed records as blockers, as an earlier
revision of this feature did, left no correction path at all: the refusal asked
for a salary-history correction, but the only available correction (undo) did not
clear it. Do not reintroduce that behaviour.

An imported legacy increment with no due date also blocks, because it cannot be
placed on either side of the boundary. Give that record a due date first.
