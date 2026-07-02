package com.nwpengdep.hrms.repository;

import com.nwpengdep.hrms.entity.Designation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface DesignationRepository
        extends JpaRepository<Designation, Long> {

    List<Designation>
    findByDesignationNameContainingIgnoreCase(
            String keyword
    );

    List<Designation> findByServiceId(Long serviceId);

    boolean existsByDesignationNameIgnoreCaseAndServiceIdAndServiceLevelId(
            String designationName,
            Long serviceId,
            Long serviceLevelId
    );

    Optional<Designation>
    findByDesignationNameIgnoreCaseAndService_ServiceCodeIgnoreCaseAndServiceLevel_LevelNameIgnoreCase(
            String designationName,
            String serviceCode,
            String serviceLevel
    );

    @Query("SELECT COUNT(d) FROM Designation d WHERE d.serviceLevel.id = :serviceLevelId")
    long countByServiceLevelId(Long serviceLevelId);
}