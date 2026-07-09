package com.nwpengdep.hrms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RolePermissionMatrixResponse {

    private List<String> permissions;
    private List<RolePermissionRowResponse> roles;
}
