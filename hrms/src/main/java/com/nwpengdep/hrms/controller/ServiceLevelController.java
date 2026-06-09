package com.nwpengdep.hrms.controller;

import com.nwpengdep.hrms.dto.ServiceLevelRequest;
import com.nwpengdep.hrms.entity.ServiceLevel;
import com.nwpengdep.hrms.service.ServiceLevelService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/service-levels")
@RequiredArgsConstructor
public class ServiceLevelController {

    private final ServiceLevelService serviceLevelService;

    @PostMapping
    public ServiceLevel create(@Valid @RequestBody ServiceLevelRequest request) {
        return serviceLevelService.create(request);
    }

    @GetMapping
    public List<ServiceLevel> getAll() {
        return serviceLevelService.getAll();
    }

    @GetMapping("/{id}")
    public ServiceLevel getById(@PathVariable Long id) {
        return serviceLevelService.getById(id);
    }

    @PutMapping("/{id}")
    public ServiceLevel update(
            @PathVariable Long id,
            @Valid @RequestBody ServiceLevelRequest request
    ) {
        return serviceLevelService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        serviceLevelService.delete(id);
    }
}
