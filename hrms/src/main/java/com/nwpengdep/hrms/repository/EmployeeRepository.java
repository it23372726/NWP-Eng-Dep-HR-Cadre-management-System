package com.nwpengdep.hrms.repository;

import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.PermanentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface EmployeeRepository
        extends JpaRepository<Employee, Long> {

    List<Employee> findByFullNameContainingIgnoreCase(String fullName);

    List<Employee> findByStatus(EmployeeStatus status);

    List<Employee> findByFullNameContainingIgnoreCaseAndStatus(
            String fullName,
            EmployeeStatus status
    );

    long countByStatus(EmployeeStatus status);

    long countByStatusAndPermanentStatus(
            EmployeeStatus status,
            PermanentStatus permanentStatus
    );

    long countByDesignationId(Long designationId);

    List<Employee> findByDesignationId(Long designationId);

    List<Employee> findByDesignation_ServiceId(Long serviceId);

    Optional<Employee> findByEmployeeNo(String employeeNo);

    boolean existsByNic(String nic);

    @Query("SELECT COUNT(e) > 0 FROM Employee e WHERE UPPER(e.nic) = UPPER(:nic)")
    boolean existsByNicIgnoreCase(@Param("nic") String nic);

    boolean existsByEmployeeNo(String employeeNo);

    boolean existsByNicAndIdNot(String nic, Long id);

    boolean existsByEmployeeNoAndIdNot(String employeeNo, Long id);

    long countByDesignationIdAndStatus(
            Long designationId,
            EmployeeStatus status
    );

    long countByDesignationIdAndStatusAndCurrentDepartment(
            Long designationId,
            EmployeeStatus status,
            String currentDepartment
    );

    @Query("""
            SELECT COUNT(e)
            FROM Employee e
            WHERE e.designation.id = :designationId
              AND e.status = :status
              AND e.currentDepartment = :currentDepartment
            """)
    long countCadreEligibleByDesignationIdAndStatusAndCurrentDepartment(
            @Param("designationId") Long designationId,
            @Param("status") EmployeeStatus status,
            @Param("currentDepartment") String currentDepartment
    );

    @Query("""
            SELECT e
            FROM Employee e
            LEFT JOIN FETCH e.designation
            LEFT JOIN FETCH e.serviceLevel
            """)
    List<Employee> findAllWithDesignation();

    @Query("""
            SELECT e
            FROM Employee e
            LEFT JOIN FETCH e.designation d
            LEFT JOIN FETCH d.service
            LEFT JOIN FETCH d.serviceLevel
            LEFT JOIN FETCH e.serviceLevel
            """)
    List<Employee> findAllForEmployeeDetailsReport();

    @Query(value = """
            SELECT e.*
            FROM employees e
            WHERE e.status = :status
            ORDER BY e.id DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<Employee> findRecentEmployees(
            @Param("status") String status,
            @Param("limit") int limit
    );

    @Query("""
            SELECT e
            FROM Employee e
            WHERE e.status = :status
              AND e.dateOfBirth IS NOT NULL
              AND e.dateOfBirth >= :minDateOfBirth
              AND e.dateOfBirth <= :maxDateOfBirth
            ORDER BY e.dateOfBirth DESC
            """)
    List<Employee> findRetiringSoon(
            @Param("status") EmployeeStatus status,
            @Param("minDateOfBirth") LocalDate minDateOfBirth,
            @Param("maxDateOfBirth") LocalDate maxDateOfBirth
    );

    @Query("""
            SELECT e
            FROM Employee e
            WHERE e.status = :status
              AND e.dateOfBirth IS NOT NULL
              AND MONTH(e.dateOfBirth) = :month
            ORDER BY DAY(e.dateOfBirth) ASC
            """)
    List<Employee> findBirthdaysInMonth(
            @Param("status") EmployeeStatus status,
            @Param("month") int month
    );

    long countByCurrentOfficeIgnoreCaseAndStatus(
            String currentOffice,
            EmployeeStatus status
    );

    @Query("""
            SELECT e
            FROM Employee e
            WHERE e.status = com.nwpengdep.hrms.entity.EmployeeStatus.ACTIVE
              AND e.employmentType = com.nwpengdep.hrms.entity.EmploymentType.PERMANENT
              AND NOT EXISTS (
                  SELECT 1
                  FROM EmployeeAction a
                  WHERE a.employee.id = e.id
                    AND (a.deleted IS NULL OR a.deleted = false)
              )
            ORDER BY e.employeeNo ASC
            """)
    List<Employee> findSystemPendingEmployees();

    @Query("""
            SELECT e
            FROM Employee e
            JOIN FETCH e.designation
            JOIN e.serviceLevel sl
            WHERE e.status = :status
              AND e.employmentType IS NULL
              AND LOWER(sl.levelName) = 'training'
              AND NOT EXISTS (
                  SELECT 1
                  FROM EmployeeAction a
                  WHERE a.employee.id = e.id
                    AND a.actionType = com.nwpengdep.hrms.entity.EmployeeActionType.NEW_APPOINTMENT
                    AND a.trainingAppointment = true
                    AND (a.deleted IS NULL OR a.deleted = false)
              )
            """)
    List<Employee> findActiveTrainingEmployeesWithoutNewAppointment(
            @Param("status") EmployeeStatus status
    );
}
