package com.nwpengdep.hrms.util;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class OrganizationSettingsDefaultsTest {

    @Test
    void applicationTitleUsesDepartmentNameAndHrms() {
        assertEquals("HRMS", OrganizationSettingsDefaults.applicationTitle(""));
        assertEquals("HRMS", OrganizationSettingsDefaults.applicationTitle(null));
        assertEquals(
                "NWP Engineering Department HRMS",
                OrganizationSettingsDefaults.applicationTitle("NWP Engineering Department")
        );
        assertEquals(
                "NWP Engineering Department HRMS",
                OrganizationSettingsDefaults.applicationTitle("NWP Engineering Department HRMS")
        );
    }
}
