package com.nwpengdep.hrms.repository;

import com.nwpengdep.hrms.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface AuditLogRepository
        extends JpaRepository<AuditLog, Long>, JpaSpecificationExecutor<AuditLog> {

    @Modifying
    @Query("DELETE FROM AuditLog a WHERE a.occurredAt < :cutoff")
    int deleteOlderThan(@Param("cutoff") LocalDateTime cutoff);
}
