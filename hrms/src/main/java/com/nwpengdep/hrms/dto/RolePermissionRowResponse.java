package com.nwpengdep.hrms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RolePermissionRowResponse {

    private String role;
    private Map<String, Boolean> permissions;
}
