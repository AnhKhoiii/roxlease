package com.roxlease.controller;

import com.roxlease.dto.AuthResponse;
import com.roxlease.dto.ChangePasswordRequest;
import com.roxlease.dto.LoginRequest;
import com.roxlease.dto.RegisterRequest;
import com.roxlease.model.ActiveSession;
import com.roxlease.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.List;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        // 1. Lấy thông tin từ SecurityContext (đã được nạp từ token)
        String username = authentication.getName();
        
        // 2. Giả sử bạn lấy list quyền từ Authorities của Spring Security
        List<String> permissions = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        // 3. Tạo Map trả về đúng cấu trúc React đang chờ
        Map<String, Object> response = new HashMap<>();
        response.put("username", username);
        response.put("fullName", "Minh Le Thi Ngoc");
        response.put("permissions", List.of("VIEW_DASHBOARD", "VIEW_SPACE", "VIEW_LEASE","VIEW_COST", "VIEW_SERVICE_DESK", "MANAGE_SYSTEM")); 

        return ResponseEntity.ok(response);
    }

    // --- REGISTER ---
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest registerRequest) {
        try {
            authService.register(registerRequest);
            return ResponseEntity.ok(Collections.singletonMap("message", "Đăng ký tài khoản thành công! Bây giờ bạn có thể đăng nhập."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    // --- LOGIN ---
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest, HttpServletRequest request) {
        try {
            // Lấy IP và thông tin thiết bị từ request
            String ipAddress = request.getRemoteAddr();
            String device = request.getHeader("User-Agent");
            
            ActiveSession session = authService.login(
                    loginRequest.getUsername(), 
                    loginRequest.getPassword(), 
                    ipAddress, 
                    device, 
                    loginRequest.isRememberMe()
            );
            
            return ResponseEntity.ok((Object) new AuthResponse(session.getToken(), session.getUsername(), "USER"));
            
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    // --- LOGOUT ---
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            authService.logout(token);
        }
        return ResponseEntity.ok(Collections.singletonMap("message", "Đăng xuất thành công"));
    }

    // --- CHANGE PASSWORD ---
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest changeRequest, Authentication authentication) {
        try {
            // Lấy username của người dùng đang đăng nhập từ SecurityContext
            String username = authentication.getName();
            
            authService.changePassword(username, changeRequest.getCurrentPassword(), changeRequest.getNewPassword());
            
            return ResponseEntity.ok(Collections.singletonMap("message", "Đổi mật khẩu thành công. Các phiên đăng nhập khác đã bị hủy."));
            
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Collections.singletonMap("error", e.getMessage()));
        }
    }
}