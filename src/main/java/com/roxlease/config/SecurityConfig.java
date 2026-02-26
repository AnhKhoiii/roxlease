package com.roxlease.config;

import com.roxlease.security.OpaqueTokenFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final OpaqueTokenFilter opaqueTokenFilter;

    public SecurityConfig(OpaqueTokenFilter opaqueTokenFilter) {
        this.opaqueTokenFilter = opaqueTokenFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // Tắt CSRF vì chúng ta dùng Token
            .cors(cors -> cors.configure(http)) // Cấu hình CORS cho ReactJS gọi sang
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)) // Không dùng Session của Servlet
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/login").permitAll() // Cho phép gọi API đăng nhập không cần token
                .anyRequest().authenticated() // Tất cả các API khác đều bắt buộc phải có token hợp lệ
            )
            // Thêm Filter của chúng ta vào TRƯỚC bước xác thực mặc định của Spring Security
            .addFilterBefore(opaqueTokenFilter, UsernamePasswordAuthenticationFilter.class);
            
        return http.build();
    }
}