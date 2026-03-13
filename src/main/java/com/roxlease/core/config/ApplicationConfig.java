package com.roxlease.core.config;

import com.roxlease.system.model.Permissions;
import com.roxlease.system.model.User;
import com.roxlease.system.repository.PermissionRepository;
import com.roxlease.system.repository.RoleRepository;
import com.roxlease.system.model.Enum.UserStatus;
import com.roxlease.system.repository.UserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.ArrayList;
import java.util.List;

@Configuration
public class ApplicationConfig {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    public ApplicationConfig(UserRepository userRepository, 
                             RoleRepository roleRepository, 
                             PermissionRepository permissionRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
    }

    @Bean
    public UserDetailsService userDetailsService() {
        return username -> {
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new UsernameNotFoundException("Can not find user: " + username));

            List<GrantedAuthority> authorities = new ArrayList<>();

            if (user.getRoleName() != null && !user.getRoleName().isEmpty()) {
                authorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRoleName().toUpperCase()));
                if ("SYSTEM_ADMIN".equalsIgnoreCase(user.getRoleName())) {
                    List<Permissions> allPermissions = permissionRepository.findAll();
                    for (Permissions perm : allPermissions) {
                        if (perm.getCode() != null) {
                            authorities.add(new SimpleGrantedAuthority(perm.getCode()));
                        }
                    }
                } 
                else {
                    roleRepository.findById(user.getRoleName()).ifPresent(role -> {
                        if (role.getPermissionsIds() != null && !role.getPermissionsIds().isEmpty()) {
                            List<Permissions> permissions = permissionRepository.findAllById(role.getPermissionsIds());
                            for (Permissions perm : permissions) {
                                if (perm.getCode() != null) {
                                    authorities.add(new SimpleGrantedAuthority(perm.getCode()));
                                }
                            }
                        }
                    });
                }
            }

            return org.springframework.security.core.userdetails.User
                    .withUsername(user.getUsername())
                    .password(user.getUserPwd())
                    .accountLocked(user.getStatus() != UserStatus.ACTIVE)
                    .authorities(authorities)
                    .build();
        };
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService());
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}