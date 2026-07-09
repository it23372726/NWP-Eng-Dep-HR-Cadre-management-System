package com.nwpengdep.hrms.controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.nwpengdep.hrms.dto.DismissalRequest;
import com.nwpengdep.hrms.dto.EmployeeActionResponse;
import com.nwpengdep.hrms.dto.EmployeeRequest;
import com.nwpengdep.hrms.dto.EmployeeUpdateRequest;
import com.nwpengdep.hrms.dto.LifecycleActionRequest;
import com.nwpengdep.hrms.dto.MakePermanentRequest;
import com.nwpengdep.hrms.dto.NewAppointmentRequest;
import com.nwpengdep.hrms.dto.TrainingAppointmentRequest;
import com.nwpengdep.hrms.dto.OfficeChangeRequest;
import com.nwpengdep.hrms.dto.PromotionRequest;
import com.nwpengdep.hrms.dto.SalaryIncrementRecordRequest;
import com.nwpengdep.hrms.dto.SalaryIncrementStatusDto;
import com.nwpengdep.hrms.dto.TransferOutRequest;
import com.nwpengdep.hrms.dto.VacationOfPostRequest;
import com.nwpengdep.hrms.dto.VehiclePermitCollectionRequest;
import com.nwpengdep.hrms.dto.VehiclePermitStatusDto;
import com.nwpengdep.hrms.entity.Employee;
import com.nwpengdep.hrms.service.EmployeeActionService;
import com.nwpengdep.hrms.service.EmployeeDeleteService;
import com.nwpengdep.hrms.service.EmployeeLifecycleService;
import com.nwpengdep.hrms.service.EmployeePhotoService;
import com.nwpengdep.hrms.service.EmployeeService;
import com.nwpengdep.hrms.service.SalaryIncrementService;
import com.nwpengdep.hrms.service.VehiclePermitService;
import com.nwpengdep.hrms.service.report.EmployeeDependentDetailsReportExportService;
import com.nwpengdep.hrms.service.report.EmployeeSummaryReportExportService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private static final String EMPLOYEE_READ =
            "hasAuthority('EMPLOYEE_VIEW') or hasAuthority('EMPLOYEE_EDIT')";
    private static final String EMPLOYEE_WRITE = "hasAuthority('EMPLOYEE_EDIT')";

    private final EmployeeService employeeService;
    private final EmployeeLifecycleService employeeLifecycleService;
    private final EmployeeActionService employeeActionService;
    private final EmployeeDeleteService employeeDeleteService;
    private final EmployeePhotoService employeePhotoService;
    private final VehiclePermitService vehiclePermitService;
    private final SalaryIncrementService salaryIncrementService;
    private final EmployeeSummaryReportExportService employeeSummaryReportExportService;
    private final EmployeeDependentDetailsReportExportService employeeDependentDetailsReportExportService;

    @PostMapping
    @PreAuthorize(EMPLOYEE_WRITE)
    public Employee createEmployee(
            @Valid @RequestBody EmployeeRequest request
    ) {
        return employeeService.createEmployee(request);
    }

    @GetMapping
    @PreAuthorize(EMPLOYEE_READ)
    public List<Employee> getActiveEmployees(
            @RequestParam(required = false, defaultValue = "NWP") String departmentScope
    ) {
        return employeeService.getActiveEmployeesByScope(departmentScope);
    }

    @GetMapping("/active")
    @PreAuthorize(EMPLOYEE_READ)
    public List<Employee> getActiveEmployeesAlias(
            @RequestParam(required = false, defaultValue = "NWP") String departmentScope
    ) {
        return employeeService.getActiveEmployeesByScope(departmentScope);
    }

    @GetMapping("/inactive")
    @PreAuthorize(EMPLOYEE_READ)
    public List<Employee> getInactiveEmployees() {
        return employeeService.getInactiveEmployees();
    }

    @GetMapping("/{id}")
    @PreAuthorize(EMPLOYEE_READ)
    public Employee getEmployeeById(@PathVariable Long id) {
        return employeeService.getEmployeeById(id);
    }

    @GetMapping("/{id}/actions")
    @PreAuthorize(EMPLOYEE_READ)
    public List<EmployeeActionResponse> getEmployeeActions(
            @PathVariable Long id
    ) {
        employeeService.requireEmployeeExists(id);
        return employeeActionService.getEmployeeActionHistory(id);
    }

    @GetMapping("/{id}/export/summary-pdf")
    @PreAuthorize(EMPLOYEE_READ)
    public ResponseEntity<byte[]> exportSummaryPdf(@PathVariable Long id) {
        employeeService.requireEmployeeExists(id);
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

    @GetMapping("/{id}/export/dependent-details-pdf")
    @PreAuthorize(EMPLOYEE_READ)
    public ResponseEntity<byte[]> exportDependentDetailsPdf(@PathVariable Long id) {
        employeeService.requireEmployeeExists(id);
        byte[] data = employeeDependentDetailsReportExportService.exportPdf(id);

        String filename = "employee-dependent-details-" + id + ".pdf";

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\""
                )
                .contentType(MediaType.APPLICATION_PDF)
                .body(data);
    }

    @PutMapping("/{id}")
    @PreAuthorize(EMPLOYEE_WRITE)
    public Employee updateEmployee(
            @PathVariable Long id,
            @Valid @RequestBody EmployeeUpdateRequest request
    ) {
        return employeeService.updateEmployee(id, request);
    }

    @PostMapping("/{id}/photo")
    @PreAuthorize(EMPLOYEE_WRITE)
    public Employee uploadEmployeePhoto(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file
    ) {
        return employeePhotoService.uploadPhoto(id, file);
    }

    @GetMapping("/{id}/photo")
    @PreAuthorize(EMPLOYEE_READ)
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
    @PreAuthorize(EMPLOYEE_WRITE)
    public Employee deleteEmployeePhoto(@PathVariable Long id) {
        return employeePhotoService.deletePhoto(id);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(EMPLOYEE_WRITE)
    public void deleteEmployee(@PathVariable Long id) {
        employeeService.deleteEmployee(id);
    }

    @DeleteMapping("/{id}/permanent")
    @PreAuthorize(EMPLOYEE_WRITE)
    public void deleteEmployeePermanently(@PathVariable Long id) {
        employeeDeleteService.deleteEmployeePermanently(id);
    }

    @GetMapping("/search")
    @PreAuthorize(EMPLOYEE_READ)
    public List<Employee> searchActiveEmployees(
            @RequestParam String keyword
    ) {
        return employeeService.searchActiveEmployees(keyword);
    }

    @GetMapping("/inactive/search")
    @PreAuthorize(EMPLOYEE_READ)
    public List<Employee> searchInactiveEmployees(
            @RequestParam String keyword
    ) {
        return employeeService.searchInactiveEmployees(keyword);
    }

    @PostMapping("/{id}/transfer-out")
    @PreAuthorize(EMPLOYEE_WRITE)
    public Employee transferOut(
            @PathVariable Long id,
            @Valid @RequestBody TransferOutRequest request
    ) {
        return employeeLifecycleService.transferOut(id, request);
    }

    @PostMapping("/{id}/office-change")
    @PreAuthorize(EMPLOYEE_WRITE)
    public Employee officeChange(
            @PathVariable Long id,
            @Valid @RequestBody OfficeChangeRequest request
    ) {
        return employeeLifecycleService.officeChange(id, request);
    }

    @PostMapping("/{id}/new-appointment")
    @PreAuthorize(EMPLOYEE_WRITE)
    public Employee appointNewEmployee(
            @PathVariable Long id,
            @Valid @RequestBody NewAppointmentRequest request
    ) {
        return employeeLifecycleService.appointNewEmployee(id, request);
    }

    @PostMapping("/{id}/training-appointment")
    @PreAuthorize(EMPLOYEE_WRITE)
    public Employee graduateTrainingToPermanent(
            @PathVariable Long id,
            @Valid @RequestBody TrainingAppointmentRequest request
    ) {
        return employeeLifecycleService.graduateTrainingToPermanent(id, request);
    }

    @PostMapping("/{id}/revert-training-appointment")
    @PreAuthorize(EMPLOYEE_WRITE)
    public Employee revertTrainingGraduation(@PathVariable Long id) {
        return employeeLifecycleService.revertTrainingGraduation(id);
    }

    @PostMapping("/{id}/promote")
    @PreAuthorize(EMPLOYEE_WRITE)
    public Employee promoteEmployee(
            @PathVariable Long id,
            @Valid @RequestBody PromotionRequest request
    ) {
        return employeeLifecycleService.promoteEmployee(id, request);
    }

    @PostMapping("/{id}/retire")
    @PreAuthorize(EMPLOYEE_WRITE)
    public Employee retireEmployee(
            @PathVariable Long id,
            @Valid @RequestBody LifecycleActionRequest request
    ) {
        return employeeLifecycleService.retireEmployee(id, request);
    }

    @PostMapping("/{id}/death")
    @PreAuthorize(EMPLOYEE_WRITE)
    public Employee markDeath(
            @PathVariable Long id,
            @Valid @RequestBody LifecycleActionRequest request
    ) {
        return employeeLifecycleService.markDeath(id, request);
    }

    @PostMapping("/{id}/dismiss")
    @PreAuthorize(EMPLOYEE_WRITE)
    public Employee dismissEmployee(
            @PathVariable Long id,
            @Valid @RequestBody DismissalRequest request
    ) {
        return employeeLifecycleService.dismissEmployee(id, request);
    }

    @PostMapping("/{id}/vacation-of-post")
    @PreAuthorize(EMPLOYEE_WRITE)
    public Employee vacatePostEmployee(
            @PathVariable Long id,
            @Valid @RequestBody VacationOfPostRequest request
    ) {
        return employeeLifecycleService.vacatePostEmployee(id, request);
    }

    @PostMapping("/{id}/make-permanent")
    @PreAuthorize(EMPLOYEE_WRITE)
    public Employee makePermanent(
            @PathVariable Long id,
            @Valid @RequestBody MakePermanentRequest request
    ) {
        return employeeLifecycleService.makePermanent(id, request);
    }

    @GetMapping("/{id}/vehicle-permit")
    @PreAuthorize(EMPLOYEE_READ)
    public VehiclePermitStatusDto getVehiclePermitStatus(@PathVariable Long id) {
        return vehiclePermitService.getStatus(id);
    }

    @PostMapping("/{id}/vehicle-permit")
    @PreAuthorize(EMPLOYEE_WRITE)
    public VehiclePermitStatusDto recordVehiclePermitCollection(
            @PathVariable Long id,
            @Valid @RequestBody VehiclePermitCollectionRequest request
    ) {
        return vehiclePermitService.recordCollection(id, request);
    }

    @PutMapping("/{id}/vehicle-permit")
    @PreAuthorize(EMPLOYEE_WRITE)
    public VehiclePermitStatusDto updateVehiclePermitCollection(
            @PathVariable Long id,
            @Valid @RequestBody VehiclePermitCollectionRequest request
    ) {
        return vehiclePermitService.updateCollection(id, request);
    }

    @DeleteMapping("/{id}/vehicle-permit")
    @PreAuthorize(EMPLOYEE_WRITE)
    public VehiclePermitStatusDto undoVehiclePermitCollection(@PathVariable Long id) {
        return vehiclePermitService.undoCollection(id);
    }

    @GetMapping("/{id}/salary-increment")
    @PreAuthorize(EMPLOYEE_READ)
    public SalaryIncrementStatusDto getSalaryIncrementStatus(@PathVariable Long id) {
        return salaryIncrementService.getStatus(id);
    }

    @PostMapping("/{id}/salary-increment")
    @PreAuthorize(EMPLOYEE_WRITE)
    public SalaryIncrementStatusDto recordSalaryIncrement(
            @PathVariable Long id,
            @Valid @RequestBody SalaryIncrementRecordRequest request
    ) {
        return salaryIncrementService.recordIncrement(id, request);
    }

    @PutMapping("/{id}/salary-increment")
    @PreAuthorize(EMPLOYEE_WRITE)
    public SalaryIncrementStatusDto updateSalaryIncrement(
            @PathVariable Long id,
            @Valid @RequestBody SalaryIncrementRecordRequest request
    ) {
        return salaryIncrementService.updateIncrement(id, request);
    }

    @DeleteMapping("/{id}/salary-increment")
    @PreAuthorize(EMPLOYEE_WRITE)
    public SalaryIncrementStatusDto undoSalaryIncrement(@PathVariable Long id) {
        return salaryIncrementService.undoIncrement(id);
    }

    @GetMapping("/paginated")
    @PreAuthorize(EMPLOYEE_READ)
    public Page<Employee> getEmployeesPaginated(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return employeeService.getEmployeesPaginated(page, size);
    }
}
