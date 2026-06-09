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

    @Transactional
    @Modifying
    void deleteByEmployeeId(Long employeeId);
}
