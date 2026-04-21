package com.roxlease.cost.repository;

import com.roxlease.cost.model.RecurringCostSchedule;
import com.roxlease.cost.model.Enum.PaymentStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface RecurringCostScheduleRepository extends MongoRepository<RecurringCostSchedule, String> {
    List<RecurringCostSchedule> findByPaymentStatus(PaymentStatus pending);
    boolean existsByRecurringCostId(String recurringCostId);
    List<RecurringCostSchedule> findByLeaseId(String leaseId);
}