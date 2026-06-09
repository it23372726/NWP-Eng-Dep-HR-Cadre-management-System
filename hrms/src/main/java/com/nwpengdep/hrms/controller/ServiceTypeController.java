package com.nwpengdep.hrms.controller;

import com.nwpengdep.hrms.dto.ServiceTypeRequest;
import com.nwpengdep.hrms.entity.ServiceType;
import com.nwpengdep.hrms.service.ServiceTypeService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/services")
@RequiredArgsConstructor
public class ServiceTypeController {

    private final ServiceTypeService serviceTypeService;

    @PostMapping
    public ServiceType createService(
            @Valid @RequestBody ServiceTypeRequest request
    ) {

        return serviceTypeService.createService(request);
    }

    @GetMapping
    public List<ServiceType> getAllServices() {

        return serviceTypeService.getAllServices();
    }

    @GetMapping("/{id}")
    public ServiceType getServiceById(
            @PathVariable Long id
    ) {

        return serviceTypeService.getServiceById(id);
    }

    @PutMapping("/{id}")
    public ServiceType updateService(
            @PathVariable Long id,
            @Valid @RequestBody ServiceTypeRequest request
    ) {

        return serviceTypeService.updateService(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteService(@PathVariable Long id) {

        serviceTypeService.deleteService(id);
    }

    @GetMapping("/search")
    public List<ServiceType> searchServices(
            @RequestParam String keyword
    ) {

        return serviceTypeService.searchServices(keyword);
    }
}
