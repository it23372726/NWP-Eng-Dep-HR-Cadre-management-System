package com.nwpengdep.hrms.controller;

import com.nwpengdep.hrms.dto.RegisterRequest;
import com.nwpengdep.hrms.entity.User;
import com.nwpengdep.hrms.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import com.nwpengdep.hrms.dto.AuthResponse;
import com.nwpengdep.hrms.dto.LoginRequest;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public User register(@RequestBody RegisterRequest request) {
        return authService.register(request);
    }
    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest request) {
        return authService.login(request);
    }
}