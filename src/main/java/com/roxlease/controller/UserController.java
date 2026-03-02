package com.roxlease.controller;

import com.roxlease.dto.CreateUserRequest;
import com.roxlease.dto.UserDetailResponse;
import com.roxlease.dto.UserResponse;
import com.roxlease.service.UserService;
import com.roxlease.dto.UpdateUserRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // --- CREATE USER ---
    // Yêu cầu quyền USER_CREATE mới được phép gọi API này
    //@PreAuthorize("hasAuthority('USER_CREATE')")
    @PostMapping
    public ResponseEntity<?> createUser(@Valid @RequestBody CreateUserRequest request) {
        try {
            userService.createUser(request);
            
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Collections.singletonMap("message", "Tạo tài khoản người dùng thành công."));
                    
        } catch (RuntimeException e) {
            // Bắt lỗi nghiệp vụ từ Service (như trùng Username, Email...)
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    // --- VIEW LIST USERS ---
    // Yêu cầu quyền USER_VIEW
    //@PreAuthorize("hasAuthority('USER_VIEW')")
    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        // Trả về danh sách gọn nhẹ (UserResponse)
        List<UserResponse> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    // --- VIEW USER DETAIL ---
    // Yêu cầu quyền USER_VIEW
    //@PreAuthorize("hasAuthority('USER_VIEW')")
    @GetMapping("/{username}")
    public ResponseEntity<?> getUserDetail(@PathVariable String username) {
        try {
            // Trả về thông tin đầy đủ (UserDetailResponse)
            UserDetailResponse user = userService.getUserByUsername(username);
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            // Trả về 404 Not Found nếu người dùng không tồn tại
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationExceptions(MethodArgumentNotValidException ex) {
        // Tự động trả về câu thông báo này nếu bất kỳ trường @NotBlank nào bị bỏ trống
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Collections.singletonMap("error", "Thiếu thông tin bắt buộc. Vui lòng điền đầy đủ các trường đánh dấu đỏ."));
    }

    // --- UPDATE INFORMATION ---
    // Yêu cầu quyền USER_UPDATE mới được sửa
    //@PreAuthorize("hasAuthority('USER_UPDATE')")
    @PutMapping("/{username}")
    public ResponseEntity<?> updateUser(@PathVariable String username, @Valid @RequestBody UpdateUserRequest request) {
        try {
            userService.updateUser(username, request);
            return ResponseEntity.ok(Collections.singletonMap("message", "Cập nhật thông tin người dùng thành công."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Collections.singletonMap("error", e.getMessage()));
        }
    }
}