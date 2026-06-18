package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.repository.EmployeeActionRepository;
import com.nwpengdep.hrms.repository.EmployeePostingRepository;
import com.nwpengdep.hrms.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EmployeeDeleteService {

    private final EmployeeRepository employeeRepository;
    private final EmployeeActionRepository employeeActionRepository;
    private final EmployeePostingRepository employeePostingRepository;
    private final EmployeePhotoService employeePhotoService;

    @Transactional
    public void deleteEmployeePermanently(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        try {
            employeePhotoService.deletePhotoForEmployee(employee);

            // Delete in order of dependencies (foreign key constraints)
            
            // Delete lifecycle actions first (they reference employee)
            employeeActionRepository.deleteByEmployeeId(employeeId);
            
            // Delete postings (they reference employee)
            employeePostingRepository.deleteByEmployeeId(employeeId);
            
            // Finally delete the employee
            employeeRepository.delete(employee);
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete employee: " + e.getMessage(), e);
        }
    }
}
