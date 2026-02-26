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
import org.springframework.web.bind.annotation.*;

import java.util.Collections;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // --- REGISTER ---
    // @PostMapping("/register")
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
            
            authService.changePassword(username, changeRequest.getOldPassword(), changeRequest.getNewPassword());
            
            return ResponseEntity.ok(Collections.singletonMap("message", "Đổi mật khẩu thành công. Các phiên đăng nhập khác đã bị hủy."));
            
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Collections.singletonMap("error", e.getMessage()));
        }
    }
}