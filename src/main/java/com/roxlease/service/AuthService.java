package com.roxlease.service;

import com.roxlease.dto.RegisterRequest;
import com.roxlease.model.ActiveSession;
import com.roxlease.model.LoginHistory;
import com.roxlease.model.User;
import com.roxlease.model.Enum.UserStatus;
import com.roxlease.repository.ActiveSessionRepository;
import com.roxlease.repository.LoginHistoryRepository;
import com.roxlease.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;

@Service
public class AuthService {

    private final ActiveSessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final LoginHistoryRepository loginHistoryRepository;
    private final PasswordEncoder passwordEncoder;

    // Inject các Repository và BCryptPasswordEncoder
    public AuthService(ActiveSessionRepository sessionRepository, 
                       UserRepository userRepository, 
                       LoginHistoryRepository loginHistoryRepository, 
                       PasswordEncoder passwordEncoder) {
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
        this.loginHistoryRepository = loginHistoryRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // --- REGISTER ---
    public void register(RegisterRequest request) {
        // Kiểm tra username đã tồn tại chưa
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new RuntimeException("Username already exists");
        }

        // Tạo User mới
        User newUser = new User();
        newUser.setUsername(request.getUsername());
        
        // Mã hóa mật khẩu trước khi lưu
        newUser.setUserPwd(passwordEncoder.encode(request.getPassword()));
        
        newUser.setEmail(request.getEmail());
        
        newUser.setStatus(UserStatus.ACTIVE);

        // Lưu vào MongoDB
        userRepository.save(newUser);
    }

    // --- LOGIN ---
    public ActiveSession login(String username, String password, String ipAddress, String device, boolean rememberMe) {
        
        // 1. Kiểm tra Username tồn tại
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Invalid Username or Password")); 

        // 2. Kiểm tra trạng thái khóa tài khoản
        if (user.isLocked()) {
            throw new RuntimeException("Account is locked"); 
        }

        // 3. Kiểm tra mật khẩu đã mã hóa (BCrypt)
        if (!passwordEncoder.matches(password, user.getUserPwd())) {
            throw new RuntimeException("Invalid Username or Password"); 
        }
        
        // 4. Xử lý tạo Token
        String token = UUID.randomUUID().toString();
        Date expirationTime = rememberMe 
                ? Date.from(Instant.now().plus(30, ChronoUnit.DAYS)) 
                : Date.from(Instant.now().plus(24, ChronoUnit.HOURS));
        
        // 5. Lưu phiên đăng nhập (Session)
        ActiveSession session = new ActiveSession();
        session.setToken(token);
        session.setUsername(username);
        session.setIpAddress(ipAddress);
        session.setDevice(device);
        session.setExpiresAt(expirationTime);
        ActiveSession savedSession = sessionRepository.save(session);

        // 6. Ghi nhận thời gian đăng nhập vào "Login History" (Normal Flow bước 5)
        LoginHistory history = new LoginHistory();
        history.setUsername(username);
        history.setIpAddress(ipAddress);
        history.setUserAgent(device);
        history.setCreatedAt(LocalDateTime.now());
        loginHistoryRepository.save(history);

        return savedSession;
    }

    // --- LOGOUT ---
    public void logout(String token) {
        sessionRepository.deleteByToken(token);
    }

    // --- CHANGE PASSWORD ---
    public void changePassword(String username, String currentPassword, String newPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("USER_NOT_FOUND"));

        if (!passwordEncoder.matches(currentPassword, user.getUserPwd())) {
            throw new RuntimeException("WRONG_CURRENT_PASSWORD");
        }

        String passwordPattern = "^(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*])[A-Za-z\\d!@#$%^&*]{8,}$";
        if (!newPassword.matches(passwordPattern)) {
            throw new RuntimeException("INVALID_PASSWORD_FORMAT");
        }

        user.setUserPwd(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        sessionRepository.deleteAllByUsername(username);
    }
}