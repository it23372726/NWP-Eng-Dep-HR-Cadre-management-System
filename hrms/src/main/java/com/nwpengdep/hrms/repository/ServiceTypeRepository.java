package com.nwpengdep.hrms.repository;

import com.nwpengdep.hrms.entity.ServiceType;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ServiceTypeRepository
        extends JpaRepository<ServiceType, Long> {

    List<ServiceType> findByServiceCodeContainingIgnoreCase(
            String keyword
    );
}