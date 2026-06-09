package com.nwpengdep.hrms.repository;

import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import com.nwpengdep.hrms.entity.PermanentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

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

    long countByDesignationIdAndStatus(
            Long designationId,
            EmployeeStatus status
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
            LEFT JOIN FETCH e.serviceLevel
            ORDER BY e.fullName ASC
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
              AND YEAR(CURRENT_DATE) - YEAR(e.dateOfBirth) >= 58
            ORDER BY e.dateOfBirth DESC
            """)
    List<Employee> findRetiringSoon(
            @Param("status") EmployeeStatus status
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
}
