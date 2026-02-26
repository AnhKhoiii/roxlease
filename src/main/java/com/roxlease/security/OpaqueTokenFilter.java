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
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Collections;
import java.util.Date;
import java.util.Optional;

@Component
public class OpaqueTokenFilter extends OncePerRequestFilter {

    private final ActiveSessionRepository sessionRepository;

    public OpaqueTokenFilter(ActiveSessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                    HttpServletResponse response, 
                                    FilterChain filterChain) throws ServletException, IOException {
        
        // 1. Lấy header Authorization từ request
        String authHeader = request.getHeader("Authorization");
        
        // 2. Kiểm tra header có chứa Bearer token không
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7); // Cắt bỏ chuỗi "Bearer " để lấy token thật
            
            // 3. Truy vấn token trong MongoDB
            Optional<ActiveSession> sessionOpt = sessionRepository.findByToken(token);
            
            if (sessionOpt.isPresent()) {
                ActiveSession session = sessionOpt.get();
                
                // 4. Kiểm tra thời gian hết hạn (phòng trường hợp TTL Index của MongoDB chưa kịp quét)
                if (session.getExpiresAt().after(Date.from(Instant.now()))) {
                    
                    // 5. Token hợp lệ: Tạo Authentication object với username
                    // Lưu ý: Nếu hệ thống của bạn có phân quyền (Role), bạn truyền danh sách quyền vào tham số thứ 3 thay vì Collections.emptyList()
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            session.getUsername(), 
                            null, 
                            Collections.emptyList() 
                    );
                    
                    // Lưu trữ thêm thông tin chi tiết của request (như IP, Session ID của servlet)
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    
                    // 6. Set Authentication vào SecurityContext để Spring Security biết user đã đăng nhập
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    
                } else {
                    // 7. Nếu token đã hết hạn nhưng vẫn còn trong DB, chủ động xóa nó đi
                    sessionRepository.deleteByToken(token);
                }
            }
        }
        
        // 8. Chuyển request cho các filter tiếp theo hoặc API Controller xử lý
        filterChain.doFilter(request, response);
    }
}