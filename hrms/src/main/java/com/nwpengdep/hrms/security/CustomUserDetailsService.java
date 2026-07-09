package com.nwpengdep.hrms.security;

import com.nwpengdep.hrms.entity.User;
import com.nwpengdep.hrms.entity.UserRole;
import com.nwpengdep.hrms.repository.UserRepository;
import com.nwpengdep.hrms.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PermissionService permissionService;

    @Override
    public UserDetails loadUserByUsername(String username)
            throws UsernameNotFoundException {

        User user = userRepository.findByUsername(username)
                .orElseThrow(() ->
                        new UsernameNotFoundException("User not found"));

        List<SimpleGrantedAuthority> authorities = new ArrayList<>();

        if (user.getRole() == UserRole.SUPER_ADMIN) {
            authorities.add(new SimpleGrantedAuthority(UserRole.SUPER_ADMIN.name()));
        }

        permissionService.getPermissionsForUser(user).forEach(permission ->
                authorities.add(new SimpleGrantedAuthority(permission.name()))
        );

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPassword(),
                user.isActive(),
                true,
                true,
                true,
                authorities
        );
    }
}
