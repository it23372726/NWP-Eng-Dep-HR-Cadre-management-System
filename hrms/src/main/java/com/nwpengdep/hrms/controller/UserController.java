package com.nwpengdep.hrms.controller;

import com.nwpengdep.hrms.dto.UserCreateRequest;
import com.nwpengdep.hrms.dto.UserPasswordResetRequest;
import com.nwpengdep.hrms.dto.UserResponse;
import com.nwpengdep.hrms.dto.UserUpdateRequest;
import com.nwpengdep.hrms.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('SUPER_ADMIN')")
public class UserController {

    private final UserService userService;

    @GetMapping
    public List<UserResponse> listUsers() {
        return userService.listUsers();
    }

    @GetMapping("/{id}")
    public UserResponse getUser(@PathVariable Long id) {
        return userService.getUser(id);
    }

    @PostMapping
    public UserResponse createUser(@Valid @RequestBody UserCreateRequest request) {
        return userService.createUser(request);
    }

    @PutMapping("/{id}")
    public UserResponse updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UserUpdateRequest request
    ) {
        return userService.updateUser(id, request);
    }

    @PutMapping("/{id}/password")
    public UserResponse resetPassword(
            @PathVariable Long id,
            @Valid @RequestBody UserPasswordResetRequest request
    ) {
        return userService.resetPassword(id, request);
    }
}
