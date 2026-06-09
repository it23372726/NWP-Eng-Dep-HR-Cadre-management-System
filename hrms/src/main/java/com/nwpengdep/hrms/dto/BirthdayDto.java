package com.nwpengdep.hrms.dto;

import lombok.*;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BirthdayDto {

    private Long employeeId;

    private String employeeName;

    private LocalDate dateOfBirth;
}
