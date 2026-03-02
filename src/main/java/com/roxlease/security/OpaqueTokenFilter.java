package com.roxlease.security;

import com.roxlease.model.ActiveSession;
import com.roxlease.repository.ActiveSessionRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.io.IOException;
import java.time.Instant;
import java.util.Collections;
import java.util.Date;
import java.util.Optional;

@Component
public class OpaqueTokenFilter extends OncePerRequestFilter {

    private final ActiveSessionRepository sessionRepository;
    private final UserDetailsService userDetailsService; // Inject thêm cái này

    public OpaqueTokenFilter(ActiveSessionRepository sessionRepository, UserDetailsService userDetailsService) {
        this.sessionRepository = sessionRepository;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) 
            throws ServletException, IOException {
        
        String authHeader = request.getHeader("Authorization");
        
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            Optional<ActiveSession> sessionOpt = sessionRepository.findByToken(token);
            
            if (sessionOpt.isPresent()) {
                ActiveSession session = sessionOpt.get();
                
                if (session.getExpiresAt().after(Date.from(Instant.now()))) {
                    
                    UserDetails userDetails = userDetailsService.loadUserByUsername(session.getUsername());
                    
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            userDetails.getUsername(), 
                            null, 
                            userDetails.getAuthorities()    
                    );
                    
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    
                } else {
                    sessionRepository.deleteByToken(token);
                }
            }
        }
        filterChain.doFilter(request, response);
    }
}