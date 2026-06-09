package com.nwpengdep.hrms.repository;

import com.nwpengdep.hrms.entity.CadrePosition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CadrePositionRepository
        extends JpaRepository<CadrePosition, Long> {

    Optional<CadrePosition> findByDesignationId(Long designationId);

    boolean existsByDesignationId(Long designationId);

    boolean existsByDesignationIdAndIdNot(
            Long designationId,
            Long id
    );
}
