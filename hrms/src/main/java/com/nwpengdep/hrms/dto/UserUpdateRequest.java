package com.nwpengdep.hrms.dto;

import com.nwpengdep.hrms.entity.UserRole;
import lombok.Data;

@Data
public class UserUpdateRequest {

    private UserRole role;
    private Boolean active;
}
