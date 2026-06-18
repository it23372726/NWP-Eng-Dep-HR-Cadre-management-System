package com.nwpengdep.hrms.repository;

import com.nwpengdep.hrms.entity.District;
import com.nwpengdep.hrms.entity.Office;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OfficeRepository extends JpaRepository<Office, Long> {

    List<Office> findByDistrictOrderByNameAsc(District district);

    List<Office> findAllByOrderByDistrictAscNameAsc();

    Optional<Office> findByNameIgnoreCaseAndDistrict(String name, District district);

    Optional<Office> findFirstByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndDistrict(String name, District district);

    boolean existsByNameIgnoreCaseAndDistrictAndIdNot(
            String name,
            District district,
            Long id
    );
}
