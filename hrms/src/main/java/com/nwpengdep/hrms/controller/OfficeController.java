package com.nwpengdep.hrms.controller;

import com.nwpengdep.hrms.dto.OfficeRequest;
import com.nwpengdep.hrms.entity.District;
import com.nwpengdep.hrms.entity.Office;
import com.nwpengdep.hrms.service.OfficeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/offices")
@RequiredArgsConstructor
public class OfficeController {

    private final OfficeService officeService;

    @PostMapping
    public Office create(@Valid @RequestBody OfficeRequest request) {
        return officeService.create(request);
    }

    @GetMapping
    public List<Office> getAll(@RequestParam(required = false) District district) {
        return officeService.getAll(district);
    }

    @GetMapping("/{id}")
    public Office getById(@PathVariable Long id) {
        return officeService.getById(id);
    }

    @PutMapping("/{id}")
    public Office update(
            @PathVariable Long id,
            @Valid @RequestBody OfficeRequest request
    ) {
        return officeService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        officeService.delete(id);
    }
}
