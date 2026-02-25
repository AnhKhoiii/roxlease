package com.roxlease.controller;

import com.roxlease.dto.LoginRequest;
import com.roxlease.dto.RegisterRequest;
import com.roxlease.model.User;
import com.roxlease.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth") // Đường dẫn gốc cho tất cả API trong file này
@RequiredArgsConstructor

public class AuthController {

    private final AuthService authService;
    @Value("${app.cookie.secure}")
    private boolean isCookieSecure;

    /**
     * API Đăng ký: POST http://localhost:8080/api/auth/register
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) { // <-- Đổi chỗ này
        try {
            User savedUser = authService.register(request);
            
            // Trả về thông báo thành công
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Đăng ký thành công!");
            response.put("username", savedUser.getUsername());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * API Đăng nhập: POST http://localhost:8080/api/auth/login
     */
    
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, jakarta.servlet.http.HttpServletRequest httpRequest) {
        try {
            // Truyền httpRequest vào service để lấy IP
            String token = authService.login(request, httpRequest);
            
            // Cấu hình thời gian sống của Cookie dựa vào lựa chọn "Remember Me"
            // Nếu true: sống 30 ngày.
            long maxAgeInSeconds = request.isRememberMe() ? 30 * 24 * 60 * 60 : 0;

            // Tạo Cookie an toàn
            org.springframework.http.ResponseCookie cookie = org.springframework.http.ResponseCookie.from("jwt_token", token)
                    .httpOnly(true)       // Ngăn chặn XSS attack
                    .secure(isCookieSecure)
                    .path("/")            // Cookie có hiệu lực trên toàn bộ API
                    .maxAge(maxAgeInSeconds)
                    .sameSite("Lax")      // Cấu hình CORS an toàn khi gọi từ Frontend sang Backend
                    .build();

            Map<String, Object> response = new java.util.HashMap<>();
            response.put("message", "Đăng nhập thành công!");
            response.put("username", request.getUsername());
            // Không nhất thiết phải trả token về JSON nữa vì nó đã nằm trong Cookie, 
            // nhưng cứ để đây nếu Frontend muốn dùng vào việc khác
            response.put("token", token); 

            // Đính kèm Cookie vào Header của Response trả về
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.SET_COOKIE, cookie.toString())
                    .body(response);
            
        } catch (Exception e) {
            return ResponseEntity.status(401).body(e.getMessage());
        }
    }

    /**
     * API Đăng xuất: POST http://localhost:8080/api/auth/logout
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        // Tạo một Cookie rác ghi đè lên Cookie thật
        org.springframework.http.ResponseCookie cleanCookie = org.springframework.http.ResponseCookie.from("jwt_token", "")
                .httpOnly(true)
                .secure(isCookieSecure)
                .path("/")
                .maxAge(0) // maxAge=0 nghĩa là Cookie sẽ bị xóa ngay lập tức
                .sameSite("Lax")
                .build();

        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("message", "Đăng xuất thành công, Token đã bị hủy!");

        // Trả về Cookie rỗng 
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.SET_COOKIE, cleanCookie.toString())
                .body(response);
    }
    
}