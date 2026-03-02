package com.roxlease.config;

import com.roxlease.model.Permissions;
import com.roxlease.model.Role;
import com.roxlease.model.User;
import com.roxlease.repository.PermissionRepository;
import com.roxlease.repository.RoleRepository;
import com.roxlease.repository.UserRepository;
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
                    .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy người dùng"));

            List<GrantedAuthority> authorities = new ArrayList<>();

            if (user.getRoleName() != null && !user.getRoleName().isEmpty()) {
                authorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRoleName().toUpperCase()));
                if ("SYSTEM_ADMIN".equalsIgnoreCase(user.getRoleName())) {
                    // Nếu là System Admin: Tự động gom TẤT CẢ quyền trong bảng Permissions cấp cho người này
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

            // Trả về UserDetails cho Spring Security
            return org.springframework.security.core.userdetails.User
                    .withUsername(user.getUsername())
                    .password(user.getUserPwd())
                    // Chặn đăng nhập nếu Status không phải ACTIVE (Giả sử bạn dùng Enum UserStatus)
                    .accountLocked(user.getStatus() != com.roxlease.model.Enum.UserStatus.ACTIVE) 
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