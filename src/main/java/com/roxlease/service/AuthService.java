package com.roxlease.service;

import com.roxlease.dto.RegisterRequest;
import com.roxlease.dto.LoginRequest;
import com.roxlease.model.LoginHistory;
import com.roxlease.model.User;
import com.roxlease.model.Enum.UserStatus;
import com.roxlease.model.Enum.LoginStatus;
import com.roxlease.repository.LoginHistoryRepository;
import com.roxlease.repository.UserRepository;
import com.roxlease.utils.JwtUtils;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final LoginHistoryRepository loginHistoryRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final AuthenticationManager authenticationManager;

    // 1. XỬ LÝ ĐĂNG KÝ
    public User register(RegisterRequest request) {
        // Kiểm tra xem username đã tồn tại chưa
        if (userRepository.existsById(request.getUsername())) {
            throw new RuntimeException("Tên đăng nhập này đã được sử dụng!");
        }

        User newUser = new User();
        newUser.setUsername(request.getUsername());
        
        // Mã hóa mật khẩu trước khi lưu
        newUser.setUserPwd(passwordEncoder.encode(request.getPassword()));

        newUser.setEmail(request.getEmail());
        newUser.setFullname(request.getFullname()); 
        newUser.setRoleName("USER");
        
        // Cài đặt trạng thái mặc định
        newUser.setStatus(UserStatus.ACTIVE);
        newUser.resetFailedAttempts();

        return userRepository.save(newUser);
    }

    // 2. XỬ LÝ ĐĂNG NHẬP
    public String login(LoginRequest request, HttpServletRequest httpRequest) {
        // Trích xuất IP và thiết bị (User-Agent) từ request
        String ipAddress = httpRequest.getRemoteAddr();
        String userAgent = httpRequest.getHeader("User-Agent");

        User user = userRepository.findById(request.getUsername())
                .orElseThrow(() -> new RuntimeException("Invalid Username"));

        if (user.isAccountLocked()) {
            saveHistory(request.getUsername(), ipAddress, userAgent, "LOCKED");
            throw new RuntimeException("Account is locked. Please contact Admin");
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );
        } catch (BadCredentialsException e) {
            user.handleFailedLoginAttempt();
            userRepository.save(user);
            saveHistory(request.getUsername(), ipAddress, userAgent, "FAILED");
            throw new RuntimeException("Wrong password! You have failed " + user.getFailedAttempts() + " times.");
        }

        // Nếu thành công: Reset số lần sai và cập nhật thời gian
        user.resetFailedAttempts();
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);
        
        // Lưu lịch sử thành công
        saveHistory(request.getUsername(), ipAddress, userAgent, "SUCCESS");

        return jwtUtils.generateToken(user.getUsername());
    }

    // Hàm phụ trợ lưu log cho gọn code
    private void saveHistory(String username, String ip, String agent, String status) {
        LoginHistory history = new LoginHistory();
        history.setUsername(username);
        history.setIpAddress(ip);
        history.setUserAgent(agent);
        history.setStatus(LoginStatus.valueOf(status));
        loginHistoryRepository.save(history);
    }
}