package com.nwpengdep.hrms.dto;

import com.nwpengdep.hrms.entity.UserRole;
import lombok.Data;

@Data
public class RegisterRequest {
    private String username;
    private String password;
    private UserRole role;
}