package com.roxlease.system.controller;

import com.roxlease.system.dto.AuthResponse;
import com.roxlease.system.dto.ChangePasswordRequest;
import com.roxlease.system.dto.ForgotPasswordRequest;
import com.roxlease.system.dto.LoginRequest;
import com.roxlease.system.dto.ResetPasswordRequest;
import com.roxlease.system.model.ActiveSession;
import com.roxlease.system.service.AuthService;
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
        String username = authentication.getName();
        
        List<String> permissions = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("username", username);
        response.put("permissions", permissions); 
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getUserProfile(Authentication authentication) {
        try {
            String username = authentication.getName();
            com.roxlease.system.model.User user = authService.getUserProfile(username);
            
            Map<String, Object> profile = new HashMap<>();
            profile.put("username", user.getUsername());
            profile.put("email", user.getEmail());
            profile.put("fullname", user.getFullname());
            profile.put("roleName", user.getRoleName());
            profile.put("company", user.getCompany());
            profile.put("department", user.getDepartment());
            profile.put("phone", user.getPhone());
            profile.put("employeeTitle", user.getEmployeeTitle());
            profile.put("birthday", user.getBirthday());
            profile.put("manager", user.getManager());
            profile.put("gender", user.getGender());
            profile.put("vpasite", user.getVpasite());
            
            return ResponseEntity.ok(profile);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
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
        return ResponseEntity.ok(Collections.singletonMap("message", "Logout successfully"));
    }

    // --- CHANGE PASSWORD ---
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest changeRequest, Authentication authentication) {
        try {
            if (authentication == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Collections.singletonMap("error", "Please login again"));
            }

            String username = authentication.getName();
            authService.changePassword(username, changeRequest.getCurrentPassword(), changeRequest.getNewPassword());
            
            return ResponseEntity.ok(Collections.singletonMap("message", "Change password successfully"));
            
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Collections.singletonMap("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("error", "System error: " + e.getMessage()));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        try {
            authService.forgotPassword(request.getEmail());
            return ResponseEntity.ok(Collections.singletonMap("message", "Reset password link has been sent to your email."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        try {
            authService.resetPassword(request.getToken(), request.getNewPassword());
            return ResponseEntity.ok(Collections.singletonMap("message", "Password has been reset successfully. You can log in now."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Collections.singletonMap("error", e.getMessage()));
        }
    }
}