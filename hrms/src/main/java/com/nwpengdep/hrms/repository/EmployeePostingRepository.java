package com.nwpengdep.hrms.repository;

import com.nwpengdep.hrms.entity.EmployeePosting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface EmployeePostingRepository
        extends JpaRepository<EmployeePosting, Long> {

    List<EmployeePosting> findByCurrentPostingTrue();

    List<EmployeePosting> findByEmployeeId(Long employeeId);

    EmployeePosting findByEmployeeIdAndCurrentPostingTrue(Long employeeId);

    void deleteByEmployeeId(Long employeeId);

    @Query("""
            SELECT COUNT(p)
            FROM EmployeePosting p
            WHERE p.designation.id = :designationId
              AND p.startDate BETWEEN :from AND :to
            """)
    long countTransferInByDesignation(
            @Param("designationId") Long designationId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    @Query("""
            SELECT COUNT(p)
            FROM EmployeePosting p
            WHERE p.designation.id = :designationId
              AND p.endDate IS NOT NULL
              AND p.endDate BETWEEN :from AND :to
            """)
    long countTransferOutByDesignation(
            @Param("designationId") Long designationId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );
}
