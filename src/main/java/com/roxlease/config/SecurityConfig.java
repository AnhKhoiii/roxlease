package com.roxlease.config;

import com.roxlease.config.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final AuthenticationProvider authenticationProvider; // Nơi cung cấp logic kiểm tra pass

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // 1. Cấu hình CORS để ReactJS gọi được API mà không bị lỗi
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            
            // 2. Tắt CSRF
            .csrf(AbstractHttpConfigurer::disable)
            
            // 3. Phân quyền các đường dẫn (Endpoints)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/login", "/api/auth/register").permitAll() // Ai cũng vào được login/register
                .requestMatchers("/api/auth/logout").authenticated() 
                .anyRequest().authenticated() // Mọi API khác ĐỀU PHẢI CÓ TOKEN
            )
            
            // 4. Cấu hình Session thành STATELESS
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            
            // 5. Thêm Provider và nhét cái Filter của chúng ta vào trước Filter mặc định của Spring
            .authenticationProvider(authenticationProvider)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // CẤU HÌNH CORS CHO REACTJS
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // Khai báo domain của Frontend được phép gọi API (VD: React chạy ở port 3000 hoặc Vite 5173)
        configuration.setAllowedOrigins(List.of("http://localhost:3000", "http://localhost:5173")); 
        
        // Cho phép các method HTTP nào
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        
        // Cho phép gửi lên những Header nào
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept"));
        
        // Cho phép trình duyệt đọc những Header nào từ Server trả về
        configuration.setExposedHeaders(List.of("Authorization"));
        
        // Cho phép gửi Cookie/Credentials nếu có
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // Áp dụng cấu hình này cho toàn bộ API
        source.registerCorsConfiguration("/**", configuration); 
        return source;
    }
}