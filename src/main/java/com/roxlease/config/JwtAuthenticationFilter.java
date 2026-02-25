package com.roxlease.config;

import com.roxlease.utils.JwtUtils;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie; 
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String jwt = null;
        String username = null;

        // 1. Tìm Token trong Header
        final String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            jwt = authHeader.substring(7); // Cắt bỏ chữ "Bearer "
        } 
        // 2. Tìm Token trong Cookie
        else if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("jwt_token".equals(cookie.getName())) { // Tên này phải khớp với ở AuthController
                    jwt = cookie.getValue();
                    break;
                }
            }
        }

        // 3. Nếu tìm cả 2 không có Token -> Cho đi tiếp (Coi như khách không vé)
        if (jwt == null) {
            filterChain.doFilter(request, response);
            return;
        }

        // 4. Giải mã Token để lấy Username
        try {
            username = jwtUtils.extractUsername(jwt);
        } catch (Exception e) {
            // Token bị sửa đổi, sai định dạng hoặc hết hạn -> Cho đi tiếp (Coi như khách không vé)
            filterChain.doFilter(request, response);
            return;
        }

        // 5. Nếu có username và chưa được cấp quyền trong Context hiện tại
        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            
            // Lôi thông tin user từ Database lên
            UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);

            // Kiểm tra xem Token có thực sự thuộc về người này không và còn hạn không
            if (jwtUtils.isTokenValid(jwt, userDetails)) {
                
                // Mọi thứ hoàn hảo -> Tạo thẻ thông hành (Authentication)
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                    );
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                
                // Đóng dấu "Đã đăng nhập" vào Context của Spring Security
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }
        
        // Mở cổng cho request đi tiếp vào Controller
        filterChain.doFilter(request, response);
    }
}