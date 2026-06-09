package com.nwpengdep.hrms.repository;

import com.nwpengdep.hrms.entity.Designation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface DesignationRepository
        extends JpaRepository<Designation, Long> {

    List<Designation>
    findByDesignationNameContainingIgnoreCase(
            String keyword
    );

    @Query("SELECT COUNT(d) FROM Designation d WHERE d.serviceLevel.id = :serviceLevelId")
    long countByServiceLevelId(Long serviceLevelId);
}