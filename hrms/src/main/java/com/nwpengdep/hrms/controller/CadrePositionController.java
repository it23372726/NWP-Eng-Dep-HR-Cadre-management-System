package com.nwpengdep.hrms.controller;

import com.nwpengdep.hrms.dto.*;

import com.nwpengdep.hrms.entity.CadrePosition;

import com.nwpengdep.hrms.service.CadrePositionService;
import com.nwpengdep.hrms.service.report.VacancyReportExportService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/cadres")
@RequiredArgsConstructor
public class CadrePositionController {

    private final CadrePositionService
            cadreService;
    private final VacancyReportExportService
            vacancyReportExportService;

    @PostMapping
    public CadrePosition createCadre(
            @RequestBody
            CadrePositionRequest request
    ) {

        return cadreService
                .createCadre(request);
    }

    @PutMapping("/order")
    public void reorderCadres(
            @Valid @RequestBody CadrePositionReorderRequest request
    ) {
        cadreService.reorderCadres(request.getOrderedCadreIds());
    }

    @PutMapping("/{id}")
    public CadrePosition updateCadre(
            @PathVariable Long id,
            @RequestBody
            CadrePositionRequest request
    ) {

        return cadreService.updateCadre(
                id,
                request
        );
    }

    @GetMapping
    public List<CadrePosition>
    getAllCadres() {

        return cadreService
                .getAllCadres();
    }

    @DeleteMapping("/{id}")
    public void deleteCadre(
            @PathVariable Long id
    ) {

        cadreService.deleteCadre(id);
    }

    @GetMapping("/vacancies")
    public List<VacancyReportResponse>
    getVacancyReport() {

        return cadreService
                .getVacancyReport();
    }

    @GetMapping("/vacancies/export/excel")
    public ResponseEntity<byte[]> exportVacancyExcel() {
        byte[] data = vacancyReportExportService.exportExcel();

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=vacancy-excess-report.xlsx"
                )
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                ))
                .body(data);
    }

    @GetMapping("/vacancies/export/pdf")
    public ResponseEntity<byte[]> exportVacancyPdf() {
        byte[] data = vacancyReportExportService.exportPdf();

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=vacancy-excess-report.pdf"
                )
                .contentType(MediaType.APPLICATION_PDF)
                .body(data);
    }
}