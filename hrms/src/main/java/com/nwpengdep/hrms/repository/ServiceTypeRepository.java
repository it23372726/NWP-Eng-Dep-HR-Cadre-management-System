package com.nwpengdep.hrms.repository;

import com.nwpengdep.hrms.entity.ServiceType;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ServiceTypeRepository
        extends JpaRepository<ServiceType, Long> {

    List<ServiceType> findByServiceCodeContainingIgnoreCase(
            String keyword
    );

    Optional<ServiceType> findByServiceCodeIgnoreCase(String serviceCode);

    boolean existsByServiceCodeIgnoreCase(String serviceCode);
}