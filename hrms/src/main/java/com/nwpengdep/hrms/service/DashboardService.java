package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.dto.*;
import com.nwpengdep.hrms.entity.*;
import com.nwpengdep.hrms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final EmployeeRepository employeeRepository;
    private final DesignationRepository designationRepository;
    private final EmployeePostingService employeePostingService;
    private final CadrePositionRepository cadrePositionRepository;
    private final ServiceLevelRepository serviceLevelRepository;
    private final EmployeeActionRepository employeeActionRepository;

    public DashboardStatsResponse getDashboardStats() {
        return DashboardStatsResponse.builder()
                .totalEmployees(employeeRepository.countByStatus(EmployeeStatus.ACTIVE))
                .totalDesignations(designationRepository.count())
                .currentPostings(employeePostingService.getCurrentPostings().size())
                .build();
    }

    public DashboardSummaryDto getDashboardSummary() {
        List<Employee> activeEmployees = employeeRepository.findByStatus(EmployeeStatus.ACTIVE);
        long totalEmployees = activeEmployees.size();
        long approvedCadre = cadrePositionRepository.findAll()
                .stream()
                .mapToLong(cp -> cp.getApprovedCount() != null
                        ? cp.getApprovedCount().longValue()
                        : 0L)
                .sum();

        // Count retirement watch list
        long retirementWatch = getRetirementWatchList().size();
        LocalDate recentlyQualifiedCutoff = LocalDate.now().minusDays(30);

        return DashboardSummaryDto.builder()
                .activeEmployees((int) totalEmployees)
                .approvedCadre((int) approvedCadre)
                .retirementWatch((int) retirementWatch)
                .probationEmployees(Math.toIntExact(activeEmployees.stream()
                        .filter(employee -> employee.getPermanentStatus() == null
                                || employee.getPermanentStatus() == PermanentStatus.PROBATION)
                        .count()))
                .qualifiedForPermanentEmployees(Math.toIntExact(activeEmployees.stream()
                        .filter(employee -> employee.getPermanentStatus()
                                == PermanentStatus.QUALIFIED_FOR_PERMANENT)
                        .count()))
                .permanentEmployees(Math.toIntExact(activeEmployees.stream()
                        .filter(employee -> employee.getPermanentStatus()
                                == PermanentStatus.PERMANENT)
                        .count()))
                .eligibleForPermanent(Math.toIntExact(activeEmployees.stream()
                        .filter(employee -> employee.getCareerProgression() != null)
                        .filter(employee -> Boolean.TRUE.equals(
                                employee.getCareerProgression()
                                        .getQualifiedForPermanent()))
                        .count()))
                .eligibleForGrade2(Math.toIntExact(activeEmployees.stream()
                        .filter(employee -> employee.getCareerProgression() != null)
                        .filter(employee -> Boolean.TRUE.equals(
                                employee.getCareerProgression()
                                        .getQualifiedForGrade2()))
                        .count()))
                .eligibleForGrade1(Math.toIntExact(activeEmployees.stream()
                        .filter(employee -> employee.getCareerProgression() != null)
                        .filter(employee -> Boolean.TRUE.equals(
                                employee.getCareerProgression()
                                        .getQualifiedForGrade1()))
                        .count()))
                .recentlyQualified(Math.toIntExact(activeEmployees.stream()
                        .filter(employee -> employee.getCareerProgression() != null)
                        .filter(employee -> {
                            EmployeeCareerProgression progression =
                                    employee.getCareerProgression();
                            return recentlyQualified(
                                    progression.getPermanentQualificationDate(),
                                    recentlyQualifiedCutoff
                            ) || recentlyQualified(
                                    progression.getGrade2EligibilityDate(),
                                    recentlyQualifiedCutoff
                            ) || recentlyQualified(
                                    progression.getGrade1EligibilityDate(),
                                    recentlyQualifiedCutoff
                            );
                        })
                        .count()))
                .build();
    }

    private boolean recentlyQualified(
            LocalDate qualificationDate,
            LocalDate cutoff
    ) {
        return qualificationDate != null
                && !qualificationDate.isBefore(cutoff)
                && !qualificationDate.isAfter(LocalDate.now());
    }

    public List<EmployeeDistributionDto> getServiceLevelDistribution() {
        List<ServiceLevel> serviceLevels = serviceLevelRepository.findAll();
        return serviceLevels.stream()
                .map(sl -> EmployeeDistributionDto.builder()
                        .category(sl.getLevelName())
                        .count(serviceLevelRepository.countEmployeesByServiceLevelId(sl.getId(), EmployeeStatus.ACTIVE))
                        .build())
                .filter(dto -> dto.getCount() > 0)
                .collect(Collectors.toList());
    }

    public List<EmployeeDistributionDto> getServiceDistribution() {
        List<Employee> activeEmployees = employeeRepository.findByStatus(EmployeeStatus.ACTIVE);
        return activeEmployees.stream()
                .filter(e -> e.getDesignation() != null && e.getDesignation().getService() != null)
                .collect(Collectors.groupingBy(
                        e -> {
                            String code = e.getDesignation().getService().getServiceCode();
                            return code != null && !code.isEmpty() ? code : e.getDesignation().getService().getDescription();
                        },
                        Collectors.counting()
                ))
                .entrySet()
                .stream()
                .map(entry -> EmployeeDistributionDto.builder()
                        .category(entry.getKey())
                        .count(entry.getValue())
                        .build())
                .sorted(Comparator.comparingLong(EmployeeDistributionDto::getCount).reversed())
                .collect(Collectors.toList());
    }

    public List<CadreStatusDto> getCadreStatus() {
        List<Employee> activeEmployees = employeeRepository.findByStatus(EmployeeStatus.ACTIVE);
        return cadrePositionRepository.findAll()
                .stream()
                .map(cadre -> {
                    long approved = cadre.getApprovedCount() != null
                            ? cadre.getApprovedCount().longValue()
                            : 0L;
                    long existing = cadre.getDesignation() != null 
                            ? activeEmployees.stream()
                            .filter(e -> e.getDesignation() != null && 
                                    e.getDesignation().getId().equals(cadre.getDesignation().getId()))
                            .count()
                            : 0;
                    long vacancy = Math.max(0, approved - existing);
                    String vacancyStatus = vacancy == 0 ? "green" : vacancy <= 2 ? "orange" : "red";
                    return CadreStatusDto.builder()
                            .designation(cadre.getDesignation() != null ? 
                                    cadre.getDesignation().getDesignationName() : "Unknown")
                            .approved(approved)
                            .existing(existing)
                            .vacancy(vacancy)
                            .vacancyStatus(vacancyStatus)
                            .build();
                })
                .filter(dto -> dto.getApproved() > 0)
                .sorted(Comparator.comparingLong(CadreStatusDto::getVacancy).reversed())
                .collect(Collectors.toList());
    }

    public List<DistrictDistributionDto> getDistrictDistribution() {
        List<Employee> activeEmployees = employeeRepository.findByStatus(EmployeeStatus.ACTIVE);
        return Arrays.stream(District.values())
                .map(district -> {
                    long count = activeEmployees.stream()
                            .filter(e -> district.equals(e.getCurrentDistrictOfWorking()))
                            .count();
                    return DistrictDistributionDto.builder()
                            .district(district.getLabel())
                            .employeeCount(count)
                            .build();
                })
                .filter(dto -> dto.getEmployeeCount() > 0)
                .sorted(Comparator.comparingLong(DistrictDistributionDto::getEmployeeCount).reversed())
                .collect(Collectors.toList());
    }

    public List<EmployeeMovementDto> getRecentEmployeeMovements() {
        return employeeActionRepository.findAll()
                .stream()
                .filter(a -> a.getDeleted() == null || !a.getDeleted())
                .sorted(Comparator.comparing(EmployeeAction::getActionDate).reversed()
                        .thenComparing(Comparator.comparing(EmployeeAction::getCreatedAt).reversed()))
                .limit(10)
                .map(action -> EmployeeMovementDto.builder()
                        .id(action.getId())
                        .employeeId(action.getEmployee() != null
                                ? action.getEmployee().getId()
                                : null)
                        .employeeName(action.getEmployee() != null ? 
                                action.getEmployee().getFullName() : "Unknown")
                        .actionType(action.getActionType().name())
                        .actionDate(action.getActionDate())
                        .description(action.getReason() != null ? action.getReason() : action.getActionType().name())
                        .oldDesignation(action.getOldDesignation() != null ? 
                                action.getOldDesignation().getDesignationName() : "-")
                        .newDesignation(action.getNewDesignation() != null ? 
                                action.getNewDesignation().getDesignationName() : "-")
                        .build())
                .collect(Collectors.toList());
    }

    public List<RetirementWatchDto> getRetirementWatchList() {
        List<Employee> retiringEmployees = employeeRepository.findRetiringSoon(EmployeeStatus.ACTIVE);
        return retiringEmployees.stream()
                .map(employee -> {
                    LocalDate dob = employee.getDateOfBirth();
                    if (dob == null) return null;
                    LocalDate retirementDate = dob.plusYears(60);
                    long monthsRemaining = java.time.temporal.ChronoUnit.MONTHS.between(
                            LocalDate.now(), retirementDate);
                    return RetirementWatchDto.builder()
                            .employeeId(employee.getId())
                            .employeeName(employee.getFullName())
                            .designation(employee.getDesignation() != null ? 
                                    employee.getDesignation().getDesignationName() : "Unknown")
                            .dateOfBirth(dob)
                            .retirementDate(retirementDate)
                            .remainingMonths((int) monthsRemaining)
                            .build();
                })
                .filter(Objects::nonNull)
                .sorted(Comparator.comparingInt(RetirementWatchDto::getRemainingMonths))
                .limit(10)
                .collect(Collectors.toList());
    }

    public List<BirthdayDto> getBirthdaysThisMonth() {
        int currentMonth = LocalDate.now().getMonthValue();
        return employeeRepository.findBirthdaysInMonth(EmployeeStatus.ACTIVE, currentMonth)
                .stream()
                .map(employee -> BirthdayDto.builder()
                        .employeeId(employee.getId())
                        .employeeName(employee.getFullName())
                        .dateOfBirth(employee.getDateOfBirth())
                        .build())
                .collect(Collectors.toList());
    }

    public List<RecentEmployeeDto> getRecentlyAddedEmployees() {
        return employeeRepository.findRecentEmployees("ACTIVE", 10)
                .stream()
                .map(employee -> RecentEmployeeDto.builder()
                        .employeeId(employee.getId())
                        .employeeName(employee.getFullName())
                        .designation(employee.getDesignation() != null ? 
                                employee.getDesignation().getDesignationName() : "Unknown")
                        .createdAt(LocalDateTime.now())
                        .build())
                .collect(Collectors.toList());
    }

    public List<DashboardAlertDto> getDashboardAlerts() {
        List<DashboardAlertDto> alerts = new ArrayList<>();
        List<CadreStatusDto> cadreStatuses = getCadreStatus();
        long totalVacancies = cadreStatuses.stream()
                .mapToLong(CadreStatusDto::getVacancy).sum();
        if (totalVacancies > 0) {
            alerts.add(DashboardAlertDto.builder()
                    .type("VACANCY")
                    .message("Total vacancies across cadres")
                    .severity(totalVacancies > 5 ? "error" : "warning")
                    .count(totalVacancies)
                    .build());
        }
        List<RetirementWatchDto> retiringEmployees = getRetirementWatchList();
        long retiringIn6Months = retiringEmployees.stream()
                .filter(r -> r.getRemainingMonths() <= 6).count();
        if (retiringIn6Months > 0) {
            alerts.add(DashboardAlertDto.builder()
                    .type("RETIREMENT")
                    .message("Employees retiring within 6 months")
                    .severity("info")
                    .count(retiringIn6Months)
                    .build());
        }
        List<Employee> activeEmployees = employeeRepository.findByStatus(EmployeeStatus.ACTIVE);
        long missingContact = activeEmployees.stream()
                .filter(e -> e.getContactNo() == null || e.getContactNo().isEmpty()).count();
        long missingDistrict = activeEmployees.stream()
                .filter(e -> e.getCurrentDistrictOfWorking() == null).count();
        long missingServiceLevel = activeEmployees.stream()
                .filter(e -> e.getServiceLevel() == null).count();
        if (missingContact > 0) {
            alerts.add(DashboardAlertDto.builder()
                    .type("DATA_QUALITY")
                    .message("Missing contact information")
                    .severity("warning")
                    .count(missingContact)
                    .build());
        }
        if (missingDistrict > 0) {
            alerts.add(DashboardAlertDto.builder()
                    .type("DATA_QUALITY")
                    .message("Missing district information")
                    .severity("warning")
                    .count(missingDistrict)
                    .build());
        }
        if (missingServiceLevel > 0) {
            alerts.add(DashboardAlertDto.builder()
                    .type("DATA_QUALITY")
                    .message("Missing service level")
                    .severity("warning")
                    .count(missingServiceLevel)
                    .build());
        }
        return alerts;
    }

    public ComprehensiveDashboardDto getComprehensiveDashboard() {
        return ComprehensiveDashboardDto.builder()
                .summary(getDashboardSummary())
                .serviceLevelDistribution(getServiceLevelDistribution())
                .serviceDistribution(getServiceDistribution())
                .cadreStatus(getCadreStatus())
                .districtDistribution(getDistrictDistribution())
                .recentMovements(getRecentEmployeeMovements())
                .retirementWatchList(getRetirementWatchList())
                .birthdaysThisMonth(getBirthdaysThisMonth())
                .recentlyAddedEmployees(getRecentlyAddedEmployees())
                .alerts(getDashboardAlerts())
                .build();
    }

    public int getNewAppointmentsThisYear() {
        LocalDate startOfYear = LocalDate.of(LocalDate.now().getYear(), 1, 1);
        LocalDate endOfYear = LocalDate.of(LocalDate.now().getYear(), 12, 31);
        return Math.toIntExact(employeeActionRepository.findAll()
                .stream()
                .filter(a -> a.getDeleted() == null || !a.getDeleted())
                .filter(a -> a.getActionType() == EmployeeActionType.NEW_APPOINTMENT)
                .filter(a -> !a.getActionDate().isBefore(startOfYear) && !a.getActionDate().isAfter(endOfYear))
                .count());
    }

    public int getPromotionsThisYear() {
        LocalDate startOfYear = LocalDate.of(LocalDate.now().getYear(), 1, 1);
        LocalDate endOfYear = LocalDate.of(LocalDate.now().getYear(), 12, 31);
        return Math.toIntExact(employeeActionRepository.findAll()
                .stream()
                .filter(a -> a.getDeleted() == null || !a.getDeleted())
                .filter(a -> a.getActionType() == EmployeeActionType.PROMOTION)
                .filter(a -> !a.getActionDate().isBefore(startOfYear) && !a.getActionDate().isAfter(endOfYear))
                .count());
    }
}
