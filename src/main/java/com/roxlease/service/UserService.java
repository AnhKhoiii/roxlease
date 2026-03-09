package com.roxlease.service;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.web.multipart.MultipartFile;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.Iterator;

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
            throw new RuntimeException("Username is already taken.");
        }
         if (userRepository.existsByEmail(request.getEmail())) {
             throw new RuntimeException("Email is already in use.");
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
        user.setVpasite(request.getVpasite());
        if (request.getGender() != null && !request.getGender().isEmpty()) {
            user.setGender(Gender.valueOf(request.getGender().toUpperCase()));
        } else {
            user.setGender(null);
        }

        userRepository.save(user);
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToUserListResponse)
                .collect(Collectors.toList());
    }

    public UserDetailResponse getUserByUsername(String username) {
        User user = userRepository.findById(username)
                .orElseThrow(() -> new RuntimeException("User data does not exist or has been deleted."));
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
                .orElseThrow(() -> new RuntimeException("User does not exist or has been deleted."));

        // 2. Kiểm tra ngoại lệ: Email đã bị người khác sử dụng
        Optional<User> userWithEmail = userRepository.findByEmail(request.getEmail());
        if (userWithEmail.isPresent() && !userWithEmail.get().getUsername().equals(username)) {
            throw new RuntimeException("This email is already in use by another user.");
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
        existingUser.setVpasite(request.getVpasite());
        if (request.getGender() != null && !request.getGender().isEmpty()) {
            existingUser.setGender(Gender.valueOf(request.getGender().toUpperCase()));
        } else {
            existingUser.setGender(null);
        }
        
        existingUser.setUpdatedAt(LocalDateTime.now());

        // 4. Lưu xuống Database
        userRepository.save(existingUser);
    }

    // --- KHÓA TÀI KHOẢN ---
    public void lockUser(String username) {
        User user = userRepository.findById(username)
                .orElseThrow(() -> new RuntimeException("User does not exist or has been deleted."));
        user.lockAccount();
        userRepository.save(user);
    }

    // --- MỞ KHÓA TÀI KHOẢN ---
    public void unlockUser(String username) {
        User user = userRepository.findById(username)
                .orElseThrow(() -> new RuntimeException("User does not exist or has been deleted."));
        user.unlockAccount();
        userRepository.save(user);
    }

    // --- XUẤT EXCEL (EXPORT) ---
    public ByteArrayInputStream exportUsersToExcel() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Users");

            // Tạo dòng Header
            Row headerRow = sheet.createRow(0);
            String[] columns = {"Username", "Full Name", "Email", "Role", "Company", "Department", "Phone"};
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
            }

            // Đổ dữ liệu
            List<User> users = userRepository.findAll();
            int rowIdx = 1;
            for (User user : users) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(user.getUsername() != null ? user.getUsername() : "");
                row.createCell(1).setCellValue(user.getFullname() != null ? user.getFullname() : "");
                row.createCell(2).setCellValue(user.getEmail() != null ? user.getEmail() : "");
                row.createCell(3).setCellValue(user.getRoleName() != null ? user.getRoleName() : "");
                row.createCell(4).setCellValue(user.getCompany() != null ? user.getCompany() : "");
                row.createCell(5).setCellValue(user.getDepartment() != null ? user.getDepartment() : "");
                row.createCell(6).setCellValue(user.getPhone() != null ? user.getPhone() : "");
            }
            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        } catch (Exception e) {
            throw new RuntimeException("Lỗi khi xuất dữ liệu ra file Excel: " + e.getMessage());
        }
    }

    // --- NHẬP EXCEL (IMPORT) ---
    public void importUsersFromExcel(MultipartFile file) {
        try (InputStream is = file.getInputStream(); Workbook workbook = new XSSFWorkbook(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            int rowNumber = 0;
            while (rows.hasNext()) {
                Row currentRow = rows.next();
                
                // Bỏ qua dòng Header (dòng 0)
                if (rowNumber == 0) { rowNumber++; continue; }

                String username = getCellValue(currentRow.getCell(0));
                // Bỏ qua nếu dòng trống hoặc Username đã tồn tại trong DB
                if (username.isEmpty() || userRepository.existsById(username)) continue;

                User user = new User();
                user.setUsername(username);
                user.setFullname(getCellValue(currentRow.getCell(1)));
                user.setEmail(getCellValue(currentRow.getCell(2)));
                user.setRoleName(getCellValue(currentRow.getCell(3)));
                user.setCompany(getCellValue(currentRow.getCell(4)));
                user.setDepartment(getCellValue(currentRow.getCell(5)));
                user.setPhone(getCellValue(currentRow.getCell(6)));

                // Set password mặc định cho user import (Mã hoá bằng BCrypt)
                user.setUserPwd(passwordEncoder.encode("12345678aA@"));
                userRepository.save(user);
            }
        } catch (Exception e) {
            throw new RuntimeException("Error importing Excel file: Invalid format or corrupted file.");
        }
    }

    // Hàm hỗ trợ đọc từng ô Excel
    private String getCellValue(Cell cell) {
        if (cell == null) return "";
        switch (cell.getCellType()) {
            case STRING: return cell.getStringCellValue();
            case NUMERIC: return String.valueOf((long) cell.getNumericCellValue());
            default: return "";
        }
    }
}