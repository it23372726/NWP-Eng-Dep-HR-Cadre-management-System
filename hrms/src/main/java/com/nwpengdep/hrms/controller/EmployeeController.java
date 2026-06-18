package com.nwpengdep.hrms.controller;

import com.nwpengdep.hrms.dto.*;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.service.EmployeeActionService;
import com.nwpengdep.hrms.service.EmployeeDeleteService;
import com.nwpengdep.hrms.service.EmployeeLifecycleService;
import com.nwpengdep.hrms.service.EmployeePhotoService;
import com.nwpengdep.hrms.service.EmployeeService;
import com.nwpengdep.hrms.service.VehiclePermitService;
import com.nwpengdep.hrms.service.report.EmployeeSummaryReportExportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;
    private final EmployeeLifecycleService employeeLifecycleService;
    private final EmployeeActionService employeeActionService;
    private final EmployeeDeleteService employeeDeleteService;
    private final EmployeePhotoService employeePhotoService;
    private final VehiclePermitService vehiclePermitService;
    private final EmployeeSummaryReportExportService employeeSummaryReportExportService;

    @PostMapping
    public Employee createEmployee(
            @Valid @RequestBody EmployeeRequest request
    ) {
        return employeeService.createEmployee(request);
    }

    @GetMapping
    public List<Employee> getActiveEmployees(
            @RequestParam(required = false, defaultValue = "NWP") String departmentScope
    ) {
        return employeeService.getActiveEmployeesByScope(departmentScope);
    }

    @GetMapping("/active")
    public List<Employee> getActiveEmployeesAlias(
            @RequestParam(required = false, defaultValue = "NWP") String departmentScope
    ) {
        return employeeService.getActiveEmployeesByScope(departmentScope);
    }

    @GetMapping("/inactive")
    public List<Employee> getInactiveEmployees() {
        return employeeService.getInactiveEmployees();
    }

    @GetMapping("/{id}")
    public Employee getEmployeeById(@PathVariable Long id) {
        return employeeService.getEmployeeById(id);
    }

    @GetMapping("/{id}/actions")
    public List<EmployeeActionResponse> getEmployeeActions(
            @PathVariable Long id
    ) {
        employeeService.getEmployeeById(id);
        return employeeActionService.getEmployeeActionHistory(id);
    }

    @GetMapping("/{id}/export/summary-pdf")
    public ResponseEntity<byte[]> exportSummaryPdf(@PathVariable Long id) {
        employeeService.getEmployeeById(id);
        byte[] data = employeeSummaryReportExportService.exportPdf(id);

        String filename = "employee-summary-" + id + ".pdf";

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\""
                )
                .contentType(MediaType.APPLICATION_PDF)
                .body(data);
    }

    @PutMapping("/{id}")
    public Employee updateEmployee(
            @PathVariable Long id,
            @Valid @RequestBody EmployeeUpdateRequest request
    ) {
        return employeeService.updateEmployee(id, request);
    }

    @PostMapping("/{id}/photo")
    public Employee uploadEmployeePhoto(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file
    ) {
        return employeePhotoService.uploadPhoto(id, file);
    }

    @GetMapping("/{id}/photo")
    public ResponseEntity<org.springframework.core.io.Resource> getEmployeePhoto(
            @PathVariable Long id
    ) {
        return employeePhotoService.getPhotoResource(id)
                .map(photo -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(photo.contentType()))
                        .header(
                                HttpHeaders.CONTENT_DISPOSITION,
                                "inline; filename=\"employee-" + id + "-photo\""
                        )
                        .body(photo.resource()))
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}/photo")
    public Employee deleteEmployeePhoto(@PathVariable Long id) {
        return employeePhotoService.deletePhoto(id);
    }

    @DeleteMapping("/{id}")
    public void deleteEmployee(@PathVariable Long id) {
        employeeService.deleteEmployee(id);
    }

    @DeleteMapping("/{id}/permanent")
    public void deleteEmployeePermanently(@PathVariable Long id) {
        employeeDeleteService.deleteEmployeePermanently(id);
    }

    @GetMapping("/search")
    public List<Employee> searchActiveEmployees(
            @RequestParam String keyword
    ) {
        return employeeService.searchActiveEmployees(keyword);
    }

    @GetMapping("/inactive/search")
    public List<Employee> searchInactiveEmployees(
            @RequestParam String keyword
    ) {
        return employeeService.searchInactiveEmployees(keyword);
    }

    @PostMapping("/{id}/transfer-out")
    public Employee transferOut(
            @PathVariable Long id,
            @Valid @RequestBody TransferOutRequest request
    ) {
        return employeeLifecycleService.transferOut(id, request);
    }

    @PostMapping("/{id}/office-change")
    public Employee officeChange(
            @PathVariable Long id,
            @Valid @RequestBody OfficeChangeRequest request
    ) {
        return employeeLifecycleService.officeChange(id, request);
    }

    @PostMapping("/{id}/new-appointment")
    public Employee appointNewEmployee(
            @PathVariable Long id,
            @Valid @RequestBody NewAppointmentRequest request
    ) {
        return employeeLifecycleService.appointNewEmployee(id, request);
    }

    @PostMapping("/{id}/promote")
    public Employee promoteEmployee(
            @PathVariable Long id,
            @Valid @RequestBody PromotionRequest request
    ) {
        return employeeLifecycleService.promoteEmployee(id, request);
    }

    @PostMapping("/{id}/retire")
    public Employee retireEmployee(
            @PathVariable Long id,
            @Valid @RequestBody LifecycleActionRequest request
    ) {
        return employeeLifecycleService.retireEmployee(id, request);
    }

    @PostMapping("/{id}/death")
    public Employee markDeath(
            @PathVariable Long id,
            @Valid @RequestBody LifecycleActionRequest request
    ) {
        return employeeLifecycleService.markDeath(id, request);
    }

    @PostMapping("/{id}/dismiss")
    public Employee dismissEmployee(
            @PathVariable Long id,
            @Valid @RequestBody DismissalRequest request
    ) {
        return employeeLifecycleService.dismissEmployee(id, request);
    }

    @PostMapping("/{id}/make-permanent")
    public Employee makePermanent(
            @PathVariable Long id,
            @Valid @RequestBody MakePermanentRequest request
    ) {
        return employeeLifecycleService.makePermanent(id, request);
    }

    @GetMapping("/{id}/vehicle-permit")
    public VehiclePermitStatusDto getVehiclePermitStatus(@PathVariable Long id) {
        return vehiclePermitService.getStatus(id);
    }

    @PostMapping("/{id}/vehicle-permit")
    public VehiclePermitStatusDto recordVehiclePermitCollection(
            @PathVariable Long id,
            @Valid @RequestBody VehiclePermitCollectionRequest request
    ) {
        return vehiclePermitService.recordCollection(id, request);
    }

    @GetMapping("/paginated")
    public Page<Employee> getEmployeesPaginated(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return employeeService.getEmployeesPaginated(page, size);
    }
}
