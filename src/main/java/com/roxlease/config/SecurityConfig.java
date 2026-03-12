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
            .csrf(csrf -> csrf.disable()) 
            .cors(cors -> cors.configure(http)) 
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)) 
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/login", "/api/auth/register", "/error", "/api/auth/forgot-password", "/api/auth/reset-password").permitAll() 
                .anyRequest().authenticated() 
            )
            .addFilterBefore(opaqueTokenFilter, UsernamePasswordAuthenticationFilter.class);
            
        return http.build();
    }
}