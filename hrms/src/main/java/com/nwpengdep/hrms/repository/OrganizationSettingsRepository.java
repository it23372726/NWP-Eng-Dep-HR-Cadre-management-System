package com.nwpengdep.hrms.repository;

import com.nwpengdep.hrms.entity.OrganizationSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationSettingsRepository
        extends JpaRepository<OrganizationSettings, Long> {
}
