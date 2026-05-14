package com.roxlease.cost.service;

import com.roxlease.cost.model.RecurringCost;
import com.roxlease.cost.model.RecurringCostSchedule;
import com.roxlease.cost.model.Enum.PaymentStatus;
import com.roxlease.cost.repository.RecurringCostRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class RecurringCostService {
    @Autowired
    private RecurringCostRepository repository;

    @Autowired
    private MongoTemplate mongoTemplate;

    public List<RecurringCost> getByLeaseId(String leaseId) {
        return repository.findByLsId(leaseId);
    }

    public RecurringCost saveOrUpdate(String leaseId, RecurringCost cost) {
        cost.setLsId(leaseId);
        cost.setUpdatedAt(LocalDateTime.now());
        if (cost.getRecurringCostId() == null || cost.getRecurringCostId().isEmpty()) {
            cost.setCreatedAt(LocalDateTime.now());
        } else {
            // Khi update End Date giảm xuống: chuyển các lịch nằm ngoài End Date về PENDING
            if (cost.getEndDate() != null) {
                Query query = new Query(Criteria.where("recurringCostId").is(cost.getRecurringCostId())
                        .and("dueDate").gt(cost.getEndDate()));
                Update update = new Update().set("paymentStatus", PaymentStatus.PENDING);
                mongoTemplate.updateMulti(query, update, RecurringCostSchedule.class);
            }
        }
        return repository.save(cost);
    }

    public void delete(String id) {
        // Xóa tất cả các Schedule (Kỳ thanh toán) liên quan đến Recurring Cost này trước khi xóa Cost
        Query query = new Query(Criteria.where("recurringCostId").is(id));
        mongoTemplate.remove(query, RecurringCostSchedule.class);

        repository.deleteById(id);
    }
}