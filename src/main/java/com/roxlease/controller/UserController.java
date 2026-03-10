package com.roxlease.controller;

import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;

import com.roxlease.dto.CreateUserRequest;
import com.roxlease.dto.UserDetailResponse;
import com.roxlease.dto.UserResponse;
import com.roxlease.service.UserService;
import com.roxlease.dto.UpdateUserRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // --- CREATE USER ---
    @PostMapping
    public ResponseEntity<?> createUser(@Valid @RequestBody CreateUserRequest request) {
        try {
            userService.createUser(request);
            
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Collections.singletonMap("message", "Create User successfully."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    // --- VIEW LIST USERS ---
    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        List<UserResponse> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    // --- VIEW USER DETAIL ---
    @GetMapping("/{username}")
    public ResponseEntity<?> getUserDetail(@PathVariable String username) {
        try {
            UserDetailResponse user = userService.getUserByUsername(username);
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationExceptions(MethodArgumentNotValidException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Collections.singletonMap("error", "Missing required information. Please fill in all fields marked in red."));
    }

    // --- UPDATE INFORMATION ---
    @PutMapping("/{username}")
    public ResponseEntity<?> updateUser(@PathVariable String username, @Valid @RequestBody UpdateUserRequest request) {
        try {
            userService.updateUser(username, request);
            return ResponseEntity.ok(Collections.singletonMap("message", "Update User information successfully."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    // --- LOCK & UNLOCK USER ---
    @PostMapping("/{username}/lock")
    public ResponseEntity<?> lockUser(@PathVariable String username) {
        try {
            userService.lockUser(username);
            return ResponseEntity.ok(Collections.singletonMap("message", "Lock User successfully."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @PostMapping("/{username}/unlock")
    public ResponseEntity<?> unlockUser(@PathVariable String username) {
        try {
            userService.unlockUser(username);
            return ResponseEntity.ok(Collections.singletonMap("message", "Unlock User successfully."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    // --- API EXPORT EXCEL ---
    @GetMapping("/export")
    public ResponseEntity<Resource> exportUsers() {
        InputStreamResource file = new InputStreamResource(userService.exportUsersToExcel());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=users_roxlease.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(file);
    }

    // --- API IMPORT EXCEL ---
    @PostMapping("/import")
    public ResponseEntity<?> importUsers(@RequestParam("file") MultipartFile file) {
        try {
            userService.importUsersFromExcel(file);
            return ResponseEntity.ok(Collections.singletonMap("message", "Import dữ liệu thành công!"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Collections.singletonMap("error", e.getMessage()));
        }
    }
}