# HRMS MySQL persistence and backup runbook

## Production architecture

The production application connects to `mysql-service`. Its selector is
`app=hrms-mysql-v2`, which targets the `hrms-mysql` StatefulSet. The database
pod mounts the `hrms-mysql-data` PVC at `/var/lib/mysql`.

The StatefulSet and backup CronJob use the immutable internal reference
`hrms-mysql@sha256:62fb722c78b24245ddff1796a0fcee4a49cc5b87e0aaaf20c92d1da9e0a2497b`.
The `hrms-mysql:8.0.46` ImageStream imports that exact Linux/amd64 digest from
`mirror.gcr.io` with `Local` reference policy, avoiding direct Docker Hub pulls
from workloads.

Database and backend credentials are held in these OpenShift Secrets:

- `hrms-mysql-credentials`
- `hrms-backend-secrets`

Never add the Secret values to this repository, command output, logs, or a
support ticket.

Daily logical backups are created by the `hrms-mysql-backup` CronJob at 02:30
Asia/Colombo. Backup files and their SHA-256 checksum files are stored on the
`hrms-mysql-backups` PVC. `concurrencyPolicy: Forbid` prevents overlapping
backup Jobs.

## Routine checks

Use the production namespace explicitly:

```sh
namespace=north-western-province-council-production-2

oc get statefulset hrms-mysql -n "$namespace"
oc get pod hrms-mysql-0 -n "$namespace"
oc get pvc hrms-mysql-data hrms-mysql-backups -n "$namespace"
oc get service mysql-service -n "$namespace" -o jsonpath='{.spec.selector}{"\n"}'
oc get endpoints mysql-service -n "$namespace"
oc get cronjob hrms-mysql-backup -n "$namespace"
oc get jobs -n "$namespace" -l app.kubernetes.io/component=scheduled-backup
oc get imagestreamtag hrms-mysql:8.0.46 -n "$namespace"
```

A completed Job is not enough evidence by itself. Review its logs for the
successful dump/checksum message, then verify the matching SHA-256 file and
gzip stream from a separate read-only verification Job.

## Emergency rollback caution

The original standalone `mysql-db` pod is intentionally retained only for a
short rollback window. It stopped receiving application writes when the
service selector changed. After any new production write reaches the
StatefulSet, switching back without first reconciling data can lose that write.

If an emergency requires rollback, first stop backend writes and capture a
backup of the current PVC-backed database. Only after deciding how to preserve
post-cutover writes should an operator point `mysql-service` back to
`app=mysql` and restart the backend. Do not delete either database before the
incident is resolved and both copies are backed up.

## Required follow-up work

1. Copy encrypted backups to storage outside this OpenShift cluster and test a
   complete restore. The current backup PVC protects against pod and data-PVC
   loss, but not cluster, storage-system, or site loss.
2. Agree on retention and recovery objectives before enabling automatic backup
   deletion. Monitor the 5 GiB backup PVC in the meantime.
3. Replace root-based backup access with a dedicated least-privilege backup
   account.
4. After the rollback window, rotate database, JWT, and bootstrap credentials;
   remove the original standalone database pod; and remove old workload
   revisions that contain literal environment values.
5. Correct the idempotent startup migrations before the next backend release.
   `CadrePositionSchemaMigration` attempts to drop a valid designation index
   that a foreign key requires, and `TrainingAppointmentSchemaMigration` uses
   a MySQL self-referencing update that fails with error 1093. The application
   starts and serves traffic, but these migrations currently log warnings and
   skip their intended cleanup.
6. Add startup, readiness, and liveness probes to the backend, and assess
   multi-replica application operation. A single MySQL StatefulSet with an RWO
   PVC is durable storage, not database high availability.
7. For stronger registry independence, copy the imported layers fully into an
   organization-controlled registry instead of relying indefinitely on
   pull-through from a public mirror.

## 2026-09-02 migration acceptance evidence

- The final source and target schema fingerprints matched.
- Exact row counts matched for every one of 27 application tables.
- Native `CHECK TABLE` validation succeeded on all source and target tables.
- The application database user authenticated to the restored target.
- The backend established its Hikari connection pool after cutover.
- The backend health route and frontend route returned HTTP 200.
- The new database pod, backend pod, and retained rollback pod were Ready with
  zero restarts.
- A manual scheduled-backup run completed, and a separate Job verified its
  SHA-256 checksum and gzip integrity.
- A forced internal-image pull on worker-3 ran MySQL 8.0.46 with the exact
  production digest, even though that node had previously been rate-limited by
  Docker Hub.
- The StatefulSet pod was recreated with a different pod UID and endpoint,
  reused the same `hrms-mysql-data` PVC, retained all 27 tables, produced an
  identical pre/post exact-row-count fingerprint, and passed `CHECK TABLE`
  after restart.
