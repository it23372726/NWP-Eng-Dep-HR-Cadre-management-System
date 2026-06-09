package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.dto.ServiceTypeRequest;
import com.nwpengdep.hrms.entity.ServiceType;
import com.nwpengdep.hrms.repository.ServiceTypeRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ServiceTypeService {

    private final ServiceTypeRepository serviceTypeRepository;

    public ServiceType createService(
            ServiceTypeRequest request
    ) {

        ServiceType service = ServiceType.builder()
                .serviceCode(request.getServiceCode())
                .description(request.getDescription())
                .build();

        return serviceTypeRepository.save(service);
    }

    public List<ServiceType> getAllServices() {

        return serviceTypeRepository.findAll();
    }

    public ServiceType getServiceById(Long id) {

        return serviceTypeRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Service not found"));
    }

    public ServiceType updateService(
            Long id,
            ServiceTypeRequest request
    ) {

        ServiceType service = serviceTypeRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Service not found"));

        service.setServiceCode(request.getServiceCode());
        service.setDescription(request.getDescription());

        return serviceTypeRepository.save(service);
    }

    public void deleteService(Long id) {

        serviceTypeRepository.deleteById(id);
    }

    public List<ServiceType> searchServices(String keyword) {

        return serviceTypeRepository
                .findByServiceCodeContainingIgnoreCase(keyword);
    }
}
