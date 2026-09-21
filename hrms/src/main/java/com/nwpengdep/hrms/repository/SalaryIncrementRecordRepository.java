package com.nwpengdep.hrms.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.nwpengdep.hrms.entity.SalaryIncrementRecord;
import com.nwpengdep.hrms.entity.SalaryIncrementRecordStatus;

public interface SalaryIncrementRecordRepository
        extends JpaRepository<SalaryIncrementRecord, Long> {

    List<SalaryIncrementRecord> findByEmployeeIdAndRecordStatusOrderByDueYearAscIdAsc(
            Long employeeId,
            SalaryIncrementRecordStatus recordStatus
    );

    List<SalaryIncrementRecord> findByEmployeeIdOrderByRecordedAtDescIdDesc(
            Long employeeId
    );

    List<SalaryIncrementRecord> findByEmployeeIdAndOperationIdAndRecordStatus(
            Long employeeId,
            UUID operationId,
            SalaryIncrementRecordStatus recordStatus
    );

    List<SalaryIncrementRecord> findByEmployeeIdInAndRecordStatus(
            Collection<Long> employeeIds,
            SalaryIncrementRecordStatus recordStatus
    );

    boolean existsByEmployeeIdAndDueYearAndRecordStatus(
            Long employeeId,
            Integer dueYear,
            SalaryIncrementRecordStatus recordStatus
    );

    boolean existsByLegacyImportKey(String legacyImportKey);

    Optional<SalaryIncrementRecord> findByLegacyImportKey(String legacyImportKey);

    @Modifying
    @Query("DELETE FROM SalaryIncrementRecord r WHERE r.employee.id = :employeeId")
    void deleteByEmployeeId(@Param("employeeId") Long employeeId);
}
