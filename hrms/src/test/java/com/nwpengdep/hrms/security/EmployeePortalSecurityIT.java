package com.nwpengdep.hrms.security;

import com.nwpengdep.hrms.dto.LoginRequest;
import com.nwpengdep.hrms.entity.*;
import com.nwpengdep.hrms.repository.*;
import com.nwpengdep.hrms.service.EmployeePortalService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import java.time.LocalDate;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class EmployeePortalSecurityIT {
    @Autowired WebApplicationContext context;
    @Autowired EmployeeRepository employees;
    @Autowired EmployeeActionRepository actions;
    @Autowired EmployeePortalService portal;
    @Autowired JwtService jwt;
    @Autowired EntityManager em;
    @Autowired AuditLogRepository auditLogs;
    MockMvc mvc;
    Employee employee;
    Employee other;
    String token;

    @BeforeEach void setup() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        employee = saveEmployee("PORTAL-" + UUID.randomUUID(), "199012345678");
        other = saveEmployee("OTHER-" + UUID.randomUUID(), "198012345678");
        actions.saveAndFlush(EmployeeAction.builder().employee(employee)
                .actionType(EmployeeActionType.NEW_APPOINTMENT).actionDate(LocalDate.of(2020,1,1))
                .remarks("Own history").build());
        actions.saveAndFlush(EmployeeAction.builder().employee(other)
                .actionType(EmployeeActionType.NEW_APPOINTMENT).actionDate(LocalDate.of(2020,1,1))
                .remarks("Other private history").build());
        token = portal.login(credentials(employee.getEmployeeNo(), employee.getNic())).getToken();
    }

    Employee saveEmployee(String number, String nic) {
        return employees.saveAndFlush(Employee.builder().employeeNo(number).nic(nic)
                .fullName("Synthetic employee " + number).grade(Grade.III)
                .employmentType(EmploymentType.PERMANENT).status(EmployeeStatus.ACTIVE).build());
    }
    LoginRequest credentials(String number, String nic) {
        LoginRequest request = new LoginRequest(); request.setUsername(number); request.setPassword(nic); return request;
    }

    @Test void loginAndReadOnlyOwnProfileAndHistory() throws Exception {
        long version = employee.getVersion();
        long employeeCount = employees.count();
        long actionCount = actions.count();
        mvc.perform(post("/api/auth/employee-login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"" + employee.getEmployeeNo() + "\",\"password\":\"199012345678\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("EMPLOYEE"))
                .andExpect(jsonPath("$.permissions").isEmpty());
        mvc.perform(get("/api/employee-portal/profile").header("Authorization", "Bearer " + token)
                .param("id", other.getId().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(employee.getId()))
                .andExpect(header().string("Cache-Control", "no-store"));
        mvc.perform(get("/api/employee-portal/history").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].remarks").value("Own history"))
                .andExpect(jsonPath("$[0].canEdit").value(false))
                .andExpect(jsonPath("$[0].canDelete").value(false));
        em.flush(); em.clear();
        assertEquals(version, employees.findById(employee.getId()).orElseThrow().getVersion());
        assertEquals(employeeCount, employees.count()); assertEquals(actionCount, actions.count());
        assertNull(jwt.extractClaims(token).get("nic"));
        assertEquals("EMPLOYEE", jwt.extractClaims(token).get("identityType"));
        var signIns = auditLogs.findAll().stream().filter(log -> "EmployeePortal".equals(log.getEntityType())).toList();
        assertFalse(signIns.isEmpty());
        signIns.forEach(log -> { assertNull(log.getNewValues()); assertNull(log.getOldValues()); });
    }

    @Test void blocksListsOtherEmployeesReportsStaffAndEveryWriteMethod() throws Exception {
        for (String path : new String[]{"/api/employees", "/api/employees/" + employee.getId(),
                "/api/employees/" + other.getId(), "/api/employees/" + other.getId() + "/actions",
                "/api/employees/" + other.getId() + "/photo", "/api/users", "/api/services",
                "/api/audit-logs", "/api/reports/all-employee-details", "/api/organization-settings",
                "/api/employee-portal/profile/" + other.getId(), "/api/any-future-endpoint"}) {
            mvc.perform(get(path).header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
        }
        for (String method : new String[]{"POST", "PUT", "PATCH", "DELETE"}) {
            for (String path : new String[]{"/api/employee-portal/profile", "/api/employees/" + employee.getId(),
                    "/api/lifecycle-actions/1", "/api/auth/register"}) {
                mvc.perform(request(org.springframework.http.HttpMethod.valueOf(method), path)
                        .header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content("{}"))
                        .andExpect(status().isForbidden());
            }
        }
    }

    @Test void invalidCredentialsHaveSameResponseAndMissingIdentifiersCannotLogin() throws Exception {
        for (String number : new String[]{employee.getEmployeeNo(), "unknown-" + UUID.randomUUID()}) {
            mvc.perform(post("/api/auth/employee-login").contentType(MediaType.APPLICATION_JSON)
                    .content("{\"username\":\"" + number + "\",\"password\":\"wrong\"}"))
                    .andExpect(status().isUnauthorized()).andExpect(content().string("The S/N number or NIC is incorrect."));
        }
        employee.setNic(null); employees.saveAndFlush(employee);
        assertThrows(org.springframework.security.authentication.BadCredentialsException.class,
                () -> portal.login(credentials(employee.getEmployeeNo(), "")));
        mvc.perform(get("/api/employee-portal/profile").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test void nicOrNumberChangeRevokesSessionAndOldNicLetterIsCaseInsensitive() throws Exception {
        employee.setNic("901234567V"); employees.saveAndFlush(employee);
        token = portal.login(credentials(" " + employee.getEmployeeNo() + " ", "901234567v")).getToken();
        mvc.perform(get("/api/employee-portal/profile").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        employee.setEmployeeNo("UPDATED-" + UUID.randomUUID()); employees.saveAndFlush(employee);
        mvc.perform(get("/api/employee-portal/profile").header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
    }

    @Test void staffTokensStaySeparateAndAnonymousCannotReadPortal() throws Exception {
        mvc.perform(get("/api/employee-portal/profile")).andExpect(status().isForbidden());
        mvc.perform(get("/api/employee-portal/profile").header("Authorization", "Bearer invalid")).andExpect(status().isUnauthorized());
        String staffToken = jwt.generateToken("superadmin");
        mvc.perform(get("/api/employee-portal/profile").header("Authorization", "Bearer " + staffToken)).andExpect(status().isForbidden());
        mvc.perform(get("/api/employees").header("Authorization", "Bearer " + staffToken)).andExpect(status().isOk());
        employee.setEmployeeNo("superadmin"); employees.saveAndFlush(employee);
        String collisionToken = portal.login(credentials("superadmin", employee.getNic())).getToken();
        mvc.perform(get("/api/users").header("Authorization", "Bearer " + collisionToken)).andExpect(status().isForbidden());
        mvc.perform(get("/api/employee-portal/profile").header("Authorization", "Bearer " + collisionToken)).andExpect(status().isOk());
    }

    @Test void additionalProfileReadsAreSelfScopedAndReadOnly() throws Exception {
        for (String endpoint : new String[]{"vehicle-permit", "salary-increment"}) {
            mvc.perform(get("/api/employee-portal/" + endpoint).param("id", other.getId().toString())
                    .header("Authorization", "Bearer " + token)).andExpect(status().isOk());
            mvc.perform(post("/api/employee-portal/" + endpoint).header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON).content("{}" )).andExpect(status().isForbidden());
        }
        mvc.perform(get("/api/employee-portal/photo").param("id", other.getId().toString())
                .header("Authorization", "Bearer " + token)).andExpect(status().isNotFound());
        mvc.perform(get("/api/employee-portal/salary-increment").param("serviceAppointmentKey", "another-employee-period")
                .header("Authorization", "Bearer " + token)).andExpect(status().isBadRequest());
    }

    @Test void repeatedAttemptsAreThrottled() throws Exception {
        String number = "GUESS-" + UUID.randomUUID();
        for (int i = 0; i < 10; i++) {
            mvc.perform(post("/api/auth/employee-login").contentType(MediaType.APPLICATION_JSON)
                    .content("{\"username\":\"" + number + "\",\"password\":\"wrong\"}"))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/auth/employee-login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"" + number + "\",\"password\":\"wrong\"}"))
                .andExpect(status().isTooManyRequests()).andExpect(header().string("Retry-After", "900"));
    }
}
