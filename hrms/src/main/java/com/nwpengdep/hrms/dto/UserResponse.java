package com.nwpengdep.hrms.dto;

import com.nwpengdep.hrms.entity.UserRole;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserResponse {

    private Long id;
    private String username;
    private UserRole role;
    private boolean active;
}
