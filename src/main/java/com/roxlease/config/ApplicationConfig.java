package com.roxlease.config;

import com.roxlease.repository.UserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class ApplicationConfig {

    private final UserRepository userRepository;

    public ApplicationConfig(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // 1. Chỉ cho Spring Security biết cách tìm User trong MongoDB
    @Bean
    public UserDetailsService userDetailsService() {
        return username -> {
            // Tìm user từ Document MongoDB của chúng ta
            com.roxlease.model.User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy người dùng"));
            
            // Map sang đối tượng UserDetails của Spring Security
            return org.springframework.security.core.userdetails.User
                    .withUsername(user.getUsername())
                    .password(user.getUserPwd())
                    .accountLocked(user.isLocked()) // Chặn đăng nhập ngay ở tầng Filter nếu bị khóa (Exception 4b)
                    .roles("USER") // Ở đồ án thực tế, bạn có thể get list roles từ DB vào đây
                    .build();
        };
    }

    // 2. Cấu hình Provider kết nối UserDetailsService và PasswordEncoder
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService());
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    // 3. Quản lý xác thực (Dùng khi bạn muốn Spring Security tự động verify thay vì code tay ở Service)
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    // 4. Bean mã hóa mật khẩu (Nếu đặt ở đây thì hãy xóa Bean này bên file SecurityConfig đi nhé)
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}