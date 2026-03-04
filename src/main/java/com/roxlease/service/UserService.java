package com.roxlease.service;

import com.roxlease.model.Enum.Gender;
import com.roxlease.dto.CreateUserRequest;
import com.roxlease.dto.UpdateUserRequest;
import com.roxlease.model.User;
import com.roxlease.repository.UserRepository;
import com.roxlease.dto.UserResponse;
import com.roxlease.dto.UserDetailResponse;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public void createUser(CreateUserRequest request) {
        if (userRepository.existsById(request.getUsername())) {
            throw new RuntimeException("Username đã tồn tại trong hệ thống.");
        }
         if (userRepository.existsByEmail(request.getEmail())) {
             throw new RuntimeException("Email đã được sử dụng.");
         }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setUserPwd(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        user.setFullname(request.getFullname());
        user.setRoleName(request.getRoleName());
        
        // Map thêm các trường mới
        user.setCompany(request.getCompany());
        user.setDepartment(request.getDepartment());
        user.setPhone(request.getPhone());
        user.setEmployeeTitle(request.getEmployeeTitle());
        user.setBirthday(request.getBirthday());
        user.setManager(request.getManager());
        user.setGender(Gender.valueOf(request.getGender()));
        user.setVpasite(request.getVpasite());

        userRepository.save(user);
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToUserListResponse)
                .collect(Collectors.toList());
    }

    public UserDetailResponse getUserByUsername(String username) {
        User user = userRepository.findById(username)
                .orElseThrow(() -> new RuntimeException("Dữ liệu người dùng không tồn tại hoặc đã bị xóa."));
        return mapToUserDetailResponse(user);
    }

    // --- Hàm phụ trợ MAP LIST ---
    public UserResponse mapToUserListResponse(User user) {
        UserResponse response = new UserResponse();
        response.setUsername(user.getUsername());
        response.setFullname(user.getFullname());
        response.setCompany(user.getCompany());
        response.setDepartment(user.getDepartment());
        response.setRoleName(user.getRoleName());
        response.setStatus(user.getStatus());
        response.setEmail(user.getEmail());
        return response;
    }

    // --- Hàm phụ trợ MAP DETAIL ---
    public UserDetailResponse mapToUserDetailResponse(User user) {
        UserDetailResponse response = new UserDetailResponse();
        response.setUsername(user.getUsername());
        response.setFullname(user.getFullname());
        response.setCompany(user.getCompany());
        response.setRoleName(user.getRoleName());
        response.setEmail(user.getEmail());
        response.setDepartment(user.getDepartment());
        response.setUserPwd(user.getUserPwd());
        response.setPhone(user.getPhone());
        response.setEmployeeTitle(user.getEmployeeTitle());
        response.setFailedAttempts(user.getFailedAttempts());
        response.setBirthday(user.getBirthday());
        response.setManager(user.getManager());
        response.setGender(user.getGender());
        response.setVpasite(user.getVpasite());
        response.setStatus(user.getStatus());
        return response;
    }

    // --- CẬP NHẬT THÔNG TIN NGƯỜI DÙNG ---
    public void updateUser(String username, UpdateUserRequest request) {
        // 1. Kiểm tra xem User có tồn tại không
        User existingUser = userRepository.findById(username)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại hoặc đã bị xóa."));

        // 2. Kiểm tra ngoại lệ: Email đã bị người khác sử dụng
        Optional<User> userWithEmail = userRepository.findByEmail(request.getEmail());
        if (userWithEmail.isPresent() && !userWithEmail.get().getUsername().equals(username)) {
            throw new RuntimeException("Email này đã được sử dụng bởi một người dùng khác.");
        }

        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            // Mã hóa mật khẩu mới trước khi lưu
            existingUser.setUserPwd(passwordEncoder.encode(request.getPassword()));
        }

        // 3. Tiến hành cập nhật các dữ liệu khác
        existingUser.setEmail(request.getEmail());
        existingUser.setFullname(request.getFullname());
        existingUser.setRoleName(request.getRoleName());
        existingUser.setCompany(request.getCompany());
        existingUser.setDepartment(request.getDepartment());
        existingUser.setPhone(request.getPhone());
        existingUser.setEmployeeTitle(request.getEmployeeTitle());
        existingUser.setBirthday(request.getBirthday());
        existingUser.setManager(request.getManager());
        existingUser.setGender(Gender.valueOf(request.getGender()));
        existingUser.setVpasite(request.getVpasite());
        
        existingUser.setUpdatedAt(LocalDateTime.now());

        // 4. Lưu xuống Database
        userRepository.save(existingUser);
    }
}