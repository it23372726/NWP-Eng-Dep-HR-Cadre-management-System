package com.nwpengdep.hrms.repository;

import com.nwpengdep.hrms.entity.Office;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OfficeRepository extends JpaRepository<Office, Long> {

    List<Office> findByDistrictIgnoreCaseOrderByNameAsc(String district);

    List<Office> findAllByOrderByDistrictAscNameAsc();

    Optional<Office> findByNameIgnoreCaseAndDistrictIgnoreCase(String name, String district);

    Optional<Office> findFirstByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndDistrictIgnoreCase(String name, String district);

    boolean existsByNameIgnoreCaseAndDistrictIgnoreCaseAndIdNot(
            String name,
            String district,
            Long id
    );

    long countByDistrictIgnoreCase(String district);
}
