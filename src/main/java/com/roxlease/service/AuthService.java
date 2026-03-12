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
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import com.roxlease.model.PasswordResetToken;
import com.roxlease.repository.PasswordResetTokenRepository;

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
    private final JavaMailSender mailSender;
    private final PasswordResetTokenRepository tokenRepository;

    // Inject các Repository và BCryptPasswordEncoder
    public AuthService(ActiveSessionRepository sessionRepository, 
                       UserRepository userRepository, 
                       LoginHistoryRepository loginHistoryRepository, 
                       PasswordEncoder passwordEncoder
                       , JavaMailSender mailSender,
                       PasswordResetTokenRepository tokenRepository) {
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
        this.loginHistoryRepository = loginHistoryRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailSender = mailSender;
        this.tokenRepository = tokenRepository;
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

    // --- FORGOT PASSWORD ---
    public void forgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email does not exist"));

        // Tạo token ngẫu nhiên
        String token = UUID.randomUUID().toString();
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setEmail(email);
        resetToken.setToken(token);
        resetToken.setExpiryDate(LocalDateTime.now().plusMinutes(15)); 
        resetToken.setUsed(false);
        tokenRepository.save(resetToken);

        // Gửi email
        String resetLink = "http://localhost:5173/reset-password?token=" + token;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("[ROX Lease] Please enter your password");
        message.setText("Hello " + user.getFullname() + ",\n\n" +
                "You have requested to reset your password. Please click on the link below to create a new password (Link is valid for 15 minutes):\n" +
                resetLink + "\n\n" +
                "If you did not request this, please ignore this email.");
        mailSender.send(message);
    }

    // --- RESET PASSWORD ---
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("The link is invalid or does not exist"));

        if (resetToken.isUsed()) {
            throw new RuntimeException("This link has already been used");
        }
        if (resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("The link has expired");
        }

        User user = userRepository.findByEmail(resetToken.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Validate mật khẩu mới
        if (!newPassword.matches("^(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*])[A-Za-z\\d!@#$%^&*]{8,}$")) {
            throw new RuntimeException("Password must be at least 8 characters long, contain at least one uppercase letter, one number, and one special character");
        }

        user.setUserPwd(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Đánh dấu token đã sử dụng
        resetToken.setUsed(true);
        tokenRepository.save(resetToken);
        
        // Đăng xuất mọi phiên của user này
        sessionRepository.deleteAllByUsername(user.getUsername());
    }
}