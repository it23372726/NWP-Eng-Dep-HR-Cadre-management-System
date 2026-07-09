package com.nwpengdep.hrms.controller;

import com.nwpengdep.hrms.dto.EmployeeActionResponse;
import com.nwpengdep.hrms.dto.EmployeeActionUpdateRequest;
import com.nwpengdep.hrms.entity.EmployeeAction;
import com.nwpengdep.hrms.service.EmployeeActionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/lifecycle-actions")
@RequiredArgsConstructor
public class EmployeeActionController {

    private final EmployeeActionService employeeActionService;

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('EMPLOYEE_EDIT')")
    public EmployeeActionResponse updateEmployeeAction(
            @PathVariable Long id,
            @Valid @RequestBody EmployeeActionUpdateRequest request
    ) {
        EmployeeAction action = employeeActionService.updateEmployeeAction(id, request);
        return employeeActionService.getEmployeeActionHistory(action.getEmployee().getId())
                .stream()
                .filter(a -> a.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Action not found after update"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('EMPLOYEE_EDIT')")
    public void deleteEmployeeAction(@PathVariable Long id) {
        employeeActionService.deleteEmployeeAction(id);
    }
}
