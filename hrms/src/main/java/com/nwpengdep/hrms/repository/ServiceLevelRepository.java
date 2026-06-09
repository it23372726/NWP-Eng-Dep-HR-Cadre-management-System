package com.nwpengdep.hrms.repository;

import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.entity.EmployeeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ServiceLevelRepository
        extends JpaRepository<ServiceLevel, Long> {

    Optional<ServiceLevel> findByLevelNameIgnoreCase(String levelName);

    boolean existsByLevelNameIgnoreCase(String levelName);

    boolean existsByLevelNameIgnoreCaseAndIdNot(
            String levelName,
            Long id
    );

    @Query("SELECT COUNT(e) FROM Employee e WHERE e.serviceLevel.id = :serviceLevelId AND e.status = :status")
    long countEmployeesByServiceLevelId(
            @Param("serviceLevelId") Long serviceLevelId,
            @Param("status") EmployeeStatus status
    );
}
