package com.nwpengdep.hrms.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecentEmployeeDto {

    private Long employeeId;

    private String employeeName;

    private String designation;

    private LocalDateTime createdAt;
}
