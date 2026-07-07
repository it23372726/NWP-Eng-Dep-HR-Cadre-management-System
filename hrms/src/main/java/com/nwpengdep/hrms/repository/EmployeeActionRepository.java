package com.nwpengdep.hrms.repository;

import com.nwpengdep.hrms.entity.EmployeeAction;
import com.nwpengdep.hrms.entity.EmployeeActionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.jpa.repository.Modifying;

public interface EmployeeActionRepository
        extends JpaRepository<EmployeeAction, Long> {

    List<EmployeeAction> findByEmployeeIdOrderByActionDateDescCreatedAtDesc(
            Long employeeId
    );

    @Query("""
            SELECT a
            FROM EmployeeAction a
            WHERE a.employee.id = :employeeId
              AND (a.deleted IS NULL OR a.deleted = false)
            ORDER BY a.actionDate ASC, a.id ASC
            """)
    List<EmployeeAction> findActiveActionsByEmployeeIdOrderByActionDateAsc(
            @Param("employeeId") Long employeeId
    );

    @Query("""
            SELECT a
            FROM EmployeeAction a
            LEFT JOIN FETCH a.newDesignation nd
            LEFT JOIN FETCH nd.serviceLevel
            WHERE a.employee.id = :employeeId
              AND (a.deleted IS NULL OR a.deleted = false)
              AND a.actionType IN :actionTypes
            ORDER BY a.actionDate ASC, a.id ASC
            """)
    List<EmployeeAction> findCareerActionsByEmployeeIdOrderByActionDateAsc(
            @Param("employeeId") Long employeeId,
            @Param("actionTypes") List<EmployeeActionType> actionTypes
    );

    @Query("""
            SELECT a
            FROM EmployeeAction a
            JOIN FETCH a.employee e
            LEFT JOIN FETCH a.oldDesignation
            LEFT JOIN FETCH a.newDesignation
            WHERE a.actionDate <= :endDate
              AND (a.deleted IS NULL OR a.deleted = false)
            ORDER BY e.id, a.actionDate, a.id
            """)
    List<EmployeeAction> findAllUpToDateOrdered(
            @Param("endDate") LocalDate endDate
    );

    @Query("""
            SELECT a
            FROM EmployeeAction a
            JOIN FETCH a.employee e
            LEFT JOIN FETCH e.designation
            LEFT JOIN FETCH a.oldDesignation
            LEFT JOIN FETCH a.newDesignation
            WHERE a.actionDate BETWEEN :from AND :to
              AND (a.deleted IS NULL OR a.deleted = false)
            ORDER BY a.actionDate ASC, e.fullName ASC, a.id ASC
            """)
    List<EmployeeAction> findActionsBetweenDates(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    @Query("""
            SELECT a.newDesignation.id, COUNT(a)
            FROM EmployeeAction a
            WHERE a.actionType = :actionType
              AND a.newDesignation IS NOT NULL
              AND a.actionDate BETWEEN :from AND :to
              AND (a.deleted IS NULL OR a.deleted = false)
            GROUP BY a.newDesignation.id
            """)
    List<Object[]> countGroupedByNewDesignation(
            @Param("actionType") EmployeeActionType actionType,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    @Query("""
            SELECT a.oldDesignation.id, COUNT(a)
            FROM EmployeeAction a
            WHERE a.actionType = :actionType
              AND a.oldDesignation IS NOT NULL
              AND a.actionDate BETWEEN :from AND :to
              AND (a.deleted IS NULL OR a.deleted = false)
            GROUP BY a.oldDesignation.id
            """)
    List<Object[]> countGroupedByOldDesignation(
            @Param("actionType") EmployeeActionType actionType,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    @Query("""
            SELECT a.newDesignation.id, COUNT(a)
            FROM EmployeeAction a
            WHERE a.actionType = :actionType
              AND a.newDesignation IS NOT NULL
              AND a.department = :department
              AND a.actionDate BETWEEN :from AND :to
              AND (a.deleted IS NULL OR a.deleted = false)
            GROUP BY a.newDesignation.id
            """)
    List<Object[]> countGroupedByNewDesignationAndDepartment(
            @Param("actionType") EmployeeActionType actionType,
            @Param("department") String department,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    @Query("""
            SELECT a.newDesignation.id, COUNT(a)
            FROM EmployeeAction a
            WHERE a.actionType = :actionType
              AND a.newDesignation IS NOT NULL
              AND a.department = :department
              AND a.actionDate BETWEEN :from AND :to
              AND (a.deleted IS NULL OR a.deleted = false)
              AND (
                  a.trainingAppointment IS NULL
                  OR a.trainingAppointment = false
                  OR NOT EXISTS (
                      SELECT 1
                      FROM EmployeeAction g
                      WHERE g.employee.id = a.employee.id
                        AND g.trainingGraduation = true
                        AND (g.deleted IS NULL OR g.deleted = false)
                  )
              )
            GROUP BY a.newDesignation.id
            """)
    List<Object[]> countCadreNewAppointmentsByDesignationAndDepartment(
            @Param("actionType") EmployeeActionType actionType,
            @Param("department") String department,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    @Query("""
            SELECT a.oldDesignation.id, COUNT(a)
            FROM EmployeeAction a
            WHERE a.actionType = :actionType
              AND a.oldDesignation IS NOT NULL
              AND a.fromDepartment = :department
              AND a.actionDate BETWEEN :from AND :to
              AND (a.deleted IS NULL OR a.deleted = false)
            GROUP BY a.oldDesignation.id
            """)
    List<Object[]> countGroupedByOldDesignationAndFromDepartment(
            @Param("actionType") EmployeeActionType actionType,
            @Param("department") String department,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    @Query("""
            SELECT a.oldDesignation.id, COUNT(a)
            FROM EmployeeAction a
            WHERE a.actionType = :actionType
              AND a.oldDesignation IS NOT NULL
              AND a.department = :department
              AND a.actionDate BETWEEN :from AND :to
              AND (a.deleted IS NULL OR a.deleted = false)
            GROUP BY a.oldDesignation.id
            """)
    List<Object[]> countGroupedByOldDesignationAndDepartment(
            @Param("actionType") EmployeeActionType actionType,
            @Param("department") String department,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    @Query("""
            SELECT a.oldDesignation.id, COUNT(a)
            FROM EmployeeAction a
            WHERE a.actionType = :actionType
              AND a.oldDesignation IS NOT NULL
              AND (
                    a.department = :department
                    OR a.fromDepartment = :department
              )
              AND a.actionDate BETWEEN :from AND :to
              AND (a.deleted IS NULL OR a.deleted = false)
            GROUP BY a.oldDesignation.id
            """)
    List<Object[]> countPromotionOutByDepartment(
            @Param("actionType") EmployeeActionType actionType,
            @Param("department") String department,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    @Query("""
            SELECT a.newDesignation.id, COUNT(a)
            FROM EmployeeAction a
            WHERE a.actionType = :actionType
              AND a.newDesignation IS NOT NULL
              AND a.department = :department
              AND a.actionDate BETWEEN :from AND :to
              AND (a.deleted IS NULL OR a.deleted = false)
            GROUP BY a.newDesignation.id
            """)
    List<Object[]> countPromotionInByDepartment(
            @Param("actionType") EmployeeActionType actionType,
            @Param("department") String department,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    @Query("""
            SELECT COUNT(a)
            FROM EmployeeAction a
            WHERE a.actionType = :actionType
              AND a.newDesignation.id = :designationId
              AND a.actionDate BETWEEN :from AND :to
              AND (a.deleted IS NULL OR a.deleted = false)
            """)
    long countByActionTypeAndNewDesignation(
            @Param("actionType") EmployeeActionType actionType,
            @Param("designationId") Long designationId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    @Query("""
            SELECT COUNT(a)
            FROM EmployeeAction a
            WHERE a.actionType = :actionType
              AND a.oldDesignation.id = :designationId
              AND a.actionDate BETWEEN :from AND :to
              AND (a.deleted IS NULL OR a.deleted = false)
            """)
    long countByActionTypeAndOldDesignation(
            @Param("actionType") EmployeeActionType actionType,
            @Param("designationId") Long designationId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    @Query("""
            SELECT a
            FROM EmployeeAction a
            JOIN FETCH a.employee e
            LEFT JOIN FETCH a.oldDesignation
            LEFT JOIN FETCH a.newDesignation
            WHERE (a.deleted IS NULL OR a.deleted = false)
            ORDER BY a.actionDate DESC, a.createdAt DESC
            """)
    List<EmployeeAction> findRecentActions(
            org.springframework.data.domain.Pageable pageable
    );

    @Transactional
    @Modifying
    void deleteByEmployeeId(Long employeeId);

    @Query("""
            SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END
            FROM EmployeeAction a
            WHERE a.employee.id = :employeeId
              AND (a.deleted IS NULL OR a.deleted = false)
            """)
    boolean existsActiveActionsByEmployeeId(@Param("employeeId") Long employeeId);
}
