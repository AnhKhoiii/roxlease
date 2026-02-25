package com.roxlease.config;

import com.roxlease.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@RequiredArgsConstructor
public class ApplicationConfig {

    private final UserRepository userRepository;

    //1. UserDetailsService: Dạy Spring cách tìm User trong Database của bạn
    @Bean
    public UserDetailsService userDetailsService() {
        return username -> {
            // Lấy User từ MongoDB
            com.roxlease.model.User user = userRepository.findById(username)
                    .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy user: " + username));
            
            // Chuyển đổi model User của bạn thành UserDetails
            return User.builder()
                    .username(user.getUsername())
                    .password(user.getUserPwd()) // Mật khẩu (đã mã hóa trong DB)
                    .roles(user.getRoleName())   // Phân quyền (VD: "ADMIN", "USER")
                    .accountLocked(user.isAccountLocked()) // Chặn đăng nhập nếu tài khoản bị khóa
                    .disabled(!user.isActive())            // Chặn đăng nhập nếu tài khoản Inactive
                    .build();
        };
    }

    /*
     * 2. AuthenticationProvider
     * Nó sẽ kết hợp UserDetailsService (để tìm user) và PasswordEncoder (để check pass)
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(userDetailsService());
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    /*
     * 3. AuthenticationManager:
     * Chúng ta sẽ gọi cái này ra ở AuthController để kiểm tra tài khoản mật khẩu
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    // 4. PasswordEncoder
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}