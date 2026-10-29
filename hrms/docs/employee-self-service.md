# Employee self-service

Employees select **Employee sign in** on the existing sign-in page. Their stored
S/N (`Employee.employeeNo`) is the username and their NIC is the permanent
password, as requested by the product owner. Both must be nonblank. No staff
account provisioning, database migration, or employee-record update is needed.
Existing and newly entered employees qualify automatically, including inactive
employees when both identifiers remain present. Leading zeroes in S/N are
preserved. Whitespace around submitted identifiers is ignored and NIC letter
suffixes are case-insensitive.

## Access boundary

Employee JWTs use a separate identity type and have no staff permissions. They
can read their profile, history, photo, vehicle-permit status, salary-increment status, and their own profile PDF exports through self-scoped portal endpoints,
which derive the employee ID from the authenticated principal. Neither accepts
an employee ID from the browser. All remaining private APIs are denied for these
identities except sign-out. Public branding, health, and sign-in remain public.
The frontend directs employees to `/employees/self` without staff navigation. This reuses the existing EmployeeProfilePage with its overview, benefits, qualifications, and history tabs. Editing, employee actions, and staff navigation are hidden. Existing profile PDF downloads remain available for the signed-in employee only. Backend access checks remain effective if browser state or
URLs are manipulated.

Profile reads bypass the administrative synchronization/save path. Login audit
entries record the outcome but no request body, NIC, password, or issued token.
The portal controller is excluded from generic request/response auditing to
prevent credential capture.

## Session and operational details

Employee sessions last at most one hour (or the configured JWT lifetime if
shorter). A keyed credential fingerprint revokes existing sessions on the next
request after S/N or NIC changes or either identifier is removed. Deleting the
employee also invalidates their session. Sign-out clears the browser's session;
as with existing staff JWTs, it does not maintain a server-side token denylist.

Employee sign-in is limited to 10 attempts per S/N and 100 attempts per direct
source address per 15 minutes. These bounded in-memory limits are local to each
backend process and reset when it restarts. Before scaling to multiple replicas,
use a shared limiter or equivalent ingress protection. The direct address can be
the ingress address; do not trust forwarded client-IP headers without a trusted
proxy configuration.

NIC is an identifier, so knowledge of both identifiers permits login. Attempt
limits cannot prevent that. The product owner explicitly chose permanent NIC
passwords over the proposed first-login/private-password flow. Serve the portal
only over HTTPS in production.

## Verification

`EmployeePortalSecurityIT` uses synthetic employees and H2. It checks login,
credential errors, own-record selection even with an injected ID parameter,
read-only history, denial of staff APIs and write methods, staff/employee username
collisions, identifier-change revocation, rate limits, and unchanged employee and
history records after viewing. It also checks that employee login audit records
contain no request or response body.

Deploy both backend and frontend for the login option to work. This implementation
does not itself deploy to OpenShift or modify production data.
