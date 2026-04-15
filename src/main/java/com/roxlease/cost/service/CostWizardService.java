package com.roxlease.cost.service;

import com.roxlease.cost.model.RecurringCost;
import com.roxlease.cost.model.RecurringCostSchedule;
import com.roxlease.cost.model.Enum.PaymentStatus;
import com.roxlease.cost.repository.RecurringCostRepository;
import com.roxlease.cost.repository.RecurringCostScheduleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class CostWizardService {

    @Autowired
    private RecurringCostRepository recurringCostRepo;

    @Autowired
    private RecurringCostScheduleRepository scheduleRepo;

    // TAB 1: Tạo Lịch tự động (Generate Schedule)
    public List<RecurringCostSchedule> generateSchedule(String recurringCostId) {
        if (scheduleRepo.existsByRecurringCostId(recurringCostId)) {
            throw new RuntimeException("Schedule already generated for this cost!");
        }

        RecurringCost cost = recurringCostRepo.findById(recurringCostId)
                .orElseThrow(() -> new RuntimeException("Recurring Cost not found"));

        List<RecurringCostSchedule> schedules = new ArrayList<>();
        LocalDate currentSrc = cost.getStartDate() != null ? cost.getStartDate() : LocalDate.now();
        LocalDate end = cost.getEndDate() != null ? cost.getEndDate() : currentSrc.plusYears(1);
        int interval = cost.getInterval() != null && cost.getInterval() > 0 ? cost.getInterval() : 1;

        while (!currentSrc.isAfter(end)) {
            LocalDate currentEnd = currentSrc.plusMonths(interval).minusDays(1);
            if (currentEnd.isAfter(end)) currentEnd = end;

            RecurringCostSchedule schedule = RecurringCostSchedule.builder()
                    .recurringCostId(cost.getRecurringCostId())
                    .leaseId("L-" + cost.getLsId()) // Fallback mockup
                    .costType(cost.getCostType())
                    .vatCountry(cost.getVatCountry())
                    .amountInBase(cost.getAmountInBase())
                    .amountInVat(cost.getAmountInVat())
                    .amountInTotal(cost.getAmountInTotal())
                    .amountOutBase(cost.getAmountOutBase())
                    .amountOutVat(cost.getAmountOutVat())
                    .amountOutTotal(cost.getAmountOutTotal())
                    .periodSrc(currentSrc)
                    .periodEnd(currentEnd)
                    .dueDate(currentEnd.plusDays(5))
                    .paymentStatus(PaymentStatus.PENDING)
                    .build();

            schedules.add(schedule);
            currentSrc = currentSrc.plusMonths(interval);
        }
        return scheduleRepo.saveAll(schedules);
    }

    // TAB 2: Lấy danh sách chờ duyệt
    public List<RecurringCostSchedule> getPendingApprovals() {
        return scheduleRepo.findByPaymentStatusIn(List.of(PaymentStatus.PENDING));
    }

    public RecurringCostSchedule approveCost(String id) {
        RecurringCostSchedule schedule = scheduleRepo.findById(id).orElseThrow();
        schedule.setPaymentStatus(PaymentStatus.APPROVED);
        schedule.setApprovalDate(LocalDateTime.now());
        return scheduleRepo.save(schedule);
    }

    public RecurringCostSchedule rejectCost(String id, String reason) {
        RecurringCostSchedule schedule = scheduleRepo.findById(id).orElseThrow();
        if (reason == null || reason.trim().isEmpty()) throw new RuntimeException("Cancel reason is required");
        schedule.setPaymentStatus(PaymentStatus.REJECTED);
        schedule.setCancelReason(reason);
        schedule.setApprovalDate(LocalDateTime.now());
        return scheduleRepo.save(schedule);
    }

    // TAB 3: Lấy danh sách Review & Thanh toán
    public List<RecurringCostSchedule> getReviewCosts() {
        return scheduleRepo.findByPaymentStatusIn(List.of(PaymentStatus.APPROVED, PaymentStatus.PAID, PaymentStatus.REJECTED));
    }

    public RecurringCostSchedule markAsPaid(String id) {
        RecurringCostSchedule schedule = scheduleRepo.findById(id).orElseThrow();
        if (schedule.getPaymentStatus() != PaymentStatus.APPROVED) {
            throw new RuntimeException("Only APPROVED costs can be paid!");
        }
        schedule.setPaymentStatus(PaymentStatus.PAID);
        schedule.setDatePaid(LocalDateTime.now());
        return scheduleRepo.save(schedule);
    }
}