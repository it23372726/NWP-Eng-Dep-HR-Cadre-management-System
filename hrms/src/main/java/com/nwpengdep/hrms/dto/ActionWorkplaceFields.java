package com.nwpengdep.hrms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActionWorkplaceFields {

    private String department;
    private String office;
    private String fromDepartment;
    private String fromOffice;
    private String toDepartment;
    private String toOffice;
    private String district;
    private String toDistrict;
    private Long linkedActionId;

    public static ActionWorkplaceFields of(String department, String office) {
        return ActionWorkplaceFields.builder()
                .department(department)
                .office(office)
                .build();
    }

    public static ActionWorkplaceFields of(
            String department,
            String office,
            String district
    ) {
        return ActionWorkplaceFields.builder()
                .department(department)
                .office(office)
                .district(district)
                .build();
    }
}
