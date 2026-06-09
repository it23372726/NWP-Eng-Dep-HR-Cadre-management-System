package com.nwpengdep.hrms.service;

import com.nwpengdep.hrms.entity.*;
import com.nwpengdep.hrms.repository.EmployeePostingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeePostingService {

    private final EmployeePostingRepository postingRepository;

    public List<EmployeePosting> getCurrentPostings() {
        return postingRepository.findByCurrentPostingTrue()
                .stream()
                .filter(posting ->
                        posting.getEmployee().getStatus() == EmployeeStatus.ACTIVE
                )
                .toList();
    }
}
