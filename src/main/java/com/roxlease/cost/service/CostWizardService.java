package com.roxlease.cost.service;

import com.roxlease.cost.model.Enum.PaymentStatus;
import com.roxlease.cost.model.Enum.Period;
import com.roxlease.cost.model.RecurringCost;
import com.roxlease.cost.model.RecurringCostSchedule;
import com.roxlease.cost.repository.RecurringCostRepository;
import com.roxlease.cost.repository.RecurringCostScheduleRepository;
import com.roxlease.lease.model.LeaseOption;
import com.roxlease.lease.model.Enum.OptionType;
import com.roxlease.lease.repository.LeaseOptionRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CostWizardService {

    private final RecurringCostRepository recurringCostRepo;
    private final RecurringCostScheduleRepository scheduleRepo;
    private final LeaseOptionRepository optionRepo; // 🚀 Tiêm thêm Option Repo để tính effectiveEndDate

    public CostWizardService(RecurringCostRepository recurringCostRepo, 
                             RecurringCostScheduleRepository scheduleRepo,
                             LeaseOptionRepository optionRepo) {
        this.recurringCostRepo = recurringCostRepo;
        this.scheduleRepo = scheduleRepo;
        this.optionRepo = optionRepo;
    }

    // ==============================================================================
    // UC-RC-01: HIỂN THỊ DANH SÁCH CHƯA LẬP LỊCH (Tab 1)
    // Lọc: active = true, schedule_status = NONE, end_date >= sysdate
    // ==============================================================================
    public List<RecurringCost> getPendingBaseCosts() {
        LocalDate today = LocalDate.now();
        return recurringCostRepo.findByActiveTrue().stream()
                .filter(cost -> "NONE".equals(cost.getScheduleStatus()))
                .filter(cost -> cost.getEndDate() == null || !cost.getEndDate().isBefore(today))
                .collect(Collectors.toList());
    }

    // ==============================================================================
    // UC-RC-01: LẬP LỊCH CHI PHÍ ĐỊNH KỲ (Generate Schedule)
    // ==============================================================================
    public int generateSchedule(String costId) { // 🚀 Đổi từ void sang int để trả về số lượng
        RecurringCost cost = recurringCostRepo.findById(costId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chi phí định kỳ!"));

        if (!Boolean.TRUE.equals(cost.getActive()) || !"NONE".equals(cost.getScheduleStatus())) {
            throw new RuntimeException("Chi phí này chưa được Active hoặc đã được lập lịch!");
        }

        if (cost.getStartDate() == null || cost.getPeriod() == null) {
            throw new RuntimeException("Lỗi: Start Date và Period không được để trống!");
        }

        LocalDate effectiveEndDate = cost.getEndDate();
        List<LeaseOption> options = optionRepo.findByLsIdAndActiveTrue(cost.getLsId());
        
        if (options != null && !options.isEmpty()) {
            LocalDate maxExtension = options.stream()
                    .filter(o -> o.getOpType() == OptionType.EXTENSION || o.getOpType() == OptionType.RENEWAL)
                    .map(LeaseOption::getEndDate)
                    .max(LocalDate::compareTo)
                    .orElse(null);

            LocalDate minTermination = options.stream()
                    .filter(o -> o.getOpType() == OptionType.EARLY_TERMINATION)
                    .map(LeaseOption::getStartDate) 
                    .min(LocalDate::compareTo)
                    .orElse(null);

            if (maxExtension != null && (effectiveEndDate == null || maxExtension.isAfter(effectiveEndDate))) {
                effectiveEndDate = maxExtension;
            }
            if (minTermination != null && (effectiveEndDate == null || minTermination.isBefore(effectiveEndDate))) {
                effectiveEndDate = minTermination;
            }
        }

        // 🚀 BẢO VỆ 1: Nếu không có ngày kết thúc, mặc định lập lịch trong 1 năm
        if (effectiveEndDate == null) {
            effectiveEndDate = cost.getStartDate().plusYears(1);
        }

        LocalDate currentDue = cost.getStartDate();
        int interval = (cost.getInterval() != null && cost.getInterval() > 0) ? cost.getInterval() : 1;
        Period period = cost.getPeriod();
        int generatedCount = 0; // Đếm số bản ghi

        // Vòng lặp sinh lịch
        while (currentDue != null && !currentDue.isAfter(effectiveEndDate)) {
            RecurringCostSchedule schedule = new RecurringCostSchedule();
            schedule.setRecurringCostId(cost.getRecurringCostId());
            schedule.setLeaseId(cost.getLsId());
            schedule.setDueDate(currentDue);
            schedule.setPaymentStatus(PaymentStatus.PENDING); // ⚠️ Nếu Enum của bạn là NO, hãy đổi PENDING thành NO
            
            schedule.setAmountInBase(cost.getAmountInBase());
            schedule.setAmountInVat(cost.getAmountInVat());
            schedule.setAmountInTotal(cost.getAmountInTotal());
            schedule.setAmountOutBase(cost.getAmountOutBase());
            schedule.setAmountOutVat(cost.getAmountOutVat());
            schedule.setAmountOutTotal(cost.getAmountOutTotal());

            scheduleRepo.save(schedule);
            generatedCount++;

            // 🚀 BẢO VỆ 2: Giới hạn tối đa 120 kỳ (10 năm) để chống treo Database
            if (generatedCount >= 120) break;

            // Tịnh tiến ngày chuẩn xác theo Enum Period
            if (period == Period.DAILY) currentDue = currentDue.plusDays(interval);
            else if (period == Period.WEEKLY) currentDue = currentDue.plusWeeks(interval);
            else if (period == Period.MONTHLY) currentDue = currentDue.plusMonths(interval);
            else if (period == Period.QUARTERLY) currentDue = currentDue.plusMonths(interval * 3L);
            else if (period == Period.YEARLY) currentDue = currentDue.plusYears(interval);
            else break; 
        }

        // 🚀 BẢO VỆ 3: Nếu không sinh được kỳ nào, ném lỗi thẳng ra màn hình
        if (generatedCount == 0) {
            throw new RuntimeException("Không thể sinh lịch! Start Date (" + cost.getStartDate() + ") đang lớn hơn End Date (" + effectiveEndDate + ").");
        }

        cost.setScheduleStatus("SCHEDULED");
        recurringCostRepo.save(cost);

        return generatedCount; // Trả về con số thực tế
    }

    // ==============================================================================
    // UC-RC-02: HIỂN THỊ DANH SÁCH CHI PHÍ ĐẾN HẠN (Tab Approve)
    // Lọc: payment_status = PENDING (NO), due_date <= sysdate + 45
    // ==============================================================================
    public List<RecurringCostSchedule> getPendingSchedules() {
        LocalDate cutoffDate = LocalDate.now().plusDays(45); // Tương lai 45 ngày
        
        return scheduleRepo.findByPaymentStatus(PaymentStatus.PENDING).stream()
                .filter(s -> s.getDueDate() != null && !s.getDueDate().isAfter(cutoffDate))
                .sorted(Comparator.comparing(RecurringCostSchedule::getDueDate)) // Sắp xếp tăng dần
                .collect(Collectors.toList());
    }

    // ==============================================================================
    // UC-RC-03: DUYỆT KỲ CHI PHÍ
    // ==============================================================================
    public void approveSchedule(String id, LocalDate userPaymentDate) {
        RecurringCostSchedule schedule = scheduleRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy kỳ chi phí!"));

        if (schedule.getPaymentStatus() != PaymentStatus.PENDING) {
            throw new RuntimeException("Chỉ được duyệt kỳ chi phí đang ở trạng thái Chờ (PENDING)!");
        }

        schedule.setPaymentStatus(PaymentStatus.PAID); // Đổi thành YES/APPROVED
        schedule.setApprovalDate(LocalDateTime.now());     // Ngày hệ thống duyệt
        schedule.setPaymentDate(userPaymentDate != null ? userPaymentDate : LocalDate.now()); // Ngày Kế toán nhập
        
        scheduleRepo.save(schedule);
    }

    // ==============================================================================
    // UC-RC-04: HỦY KỲ CHI PHÍ
    // ==============================================================================
    public void cancelSchedule(String id, String reason) {
        if (reason == null || reason.trim().isEmpty()) {
            throw new RuntimeException("Lý do hủy là bắt buộc!");
        }

        RecurringCostSchedule schedule = scheduleRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy kỳ chi phí!"));

        if (schedule.getPaymentStatus() != PaymentStatus.PENDING) {
            throw new RuntimeException("Chỉ được hủy kỳ chi phí đang ở trạng thái Chờ (PENDING)!");
        }

        schedule.setPaymentStatus(PaymentStatus.REJECTED);
        schedule.setApprovalDate(LocalDateTime.now());
        schedule.setCancelReason(reason);

        scheduleRepo.save(schedule);
    }

    // ==============================================================================
    // UC-RC-05: TRA CỨU LỊCH SỬ (Tab Review)
    // ==============================================================================
    public List<RecurringCostSchedule> getScheduleHistory() {
        return scheduleRepo.findAll().stream()
                .filter(s -> s.getPaymentStatus() == PaymentStatus.PAID || s.getPaymentStatus() == PaymentStatus.REJECTED)
                .sorted(Comparator.comparing(RecurringCostSchedule::getDueDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }
}