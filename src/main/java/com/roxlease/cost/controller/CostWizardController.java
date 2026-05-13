package com.roxlease.cost.controller;

import com.roxlease.cost.model.RecurringCostSchedule;
import com.roxlease.cost.service.CostWizardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/cost/wizard")
public class CostWizardController {

    private final CostWizardService service;

    public CostWizardController(CostWizardService service) {
        this.service = service;
    }

    // =======================================================
    // TAB 1: COST SCHEDULE (UC-RC-01)
    // =======================================================
    @GetMapping("/recurring-costs")
    public ResponseEntity<?> getBaseCosts() {
        return ResponseEntity.ok(service.getPendingBaseCosts());
    }

    @PostMapping("/recurring-costs/{id}/generate")
    public ResponseEntity<?> generateSchedule(@PathVariable String id) {
        try {
            int count = service.generateSchedule(id);
            // 🚀 Báo cáo chính xác số lượng kỳ đã được tạo
            return ResponseEntity.ok(Collections.singletonMap("message", "Thành công! Đã tạo ra " + count + " kỳ chi phí."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    // =======================================================
    // TAB 2: APPROVE SCHEDULES (UC-RC-02, UC-RC-03, UC-RC-04)
    // =======================================================
    @GetMapping("/schedules/pending")
    public ResponseEntity<?> getPendingSchedules() {
        return ResponseEntity.ok(service.getPendingSchedules());
    }

    @PutMapping("/schedules/{id}/approve")
    public ResponseEntity<?> approveSchedule(
            @PathVariable String id, 
            @RequestBody(required = false) Map<String, String> payload) {
        try {
            LocalDate paymentDate = null;
            if (payload != null && payload.containsKey("paymentDate") && !payload.get("paymentDate").isEmpty()) {
                paymentDate = LocalDate.parse(payload.get("paymentDate"));
            }
            service.approveSchedule(id, paymentDate);
            return ResponseEntity.ok(Collections.singletonMap("message", "Duyệt và ghi nhận thanh toán thành công!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @PutMapping("/schedules/{id}/cancel")
    public ResponseEntity<?> cancelSchedule(@PathVariable String id, @RequestBody Map<String, String> payload) {
        try {
            String reason = payload.get("reason");
            service.cancelSchedule(id, reason);
            return ResponseEntity.ok(Collections.singletonMap("message", "Đã xóa kỳ chi phí thành công khỏi hệ thống!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    // =======================================================
    // TAB 3: REVIEW HISTORY (UC-RC-05)
    // =======================================================
    @GetMapping("/schedules/history")
    public ResponseEntity<?> getScheduleHistory() {
        return ResponseEntity.ok(service.getScheduleHistory());
    }
}