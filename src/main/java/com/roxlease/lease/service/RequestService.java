package com.roxlease.lease.service;

import com.roxlease.lease.model.Request;
import com.roxlease.lease.model.Enum.RQStatus;
import com.roxlease.lease.model.Enum.RQType;
import com.roxlease.lease.model.Clause;
import com.roxlease.lease.model.LeaseOption;
import com.roxlease.lease.model.LeaseSuite;
import com.roxlease.cost.model.RecurringCost;
import com.roxlease.lease.model.Amendment;
import com.roxlease.lease.repository.RequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Service
public class RequestService {

    private final RequestRepository repository;
    private final MongoTemplate mongoTemplate;

    @Autowired
    public RequestService(RequestRepository repository, MongoTemplate mongoTemplate) {
        this.repository = repository;
        this.mongoTemplate = mongoTemplate;
    }

    public Page<Request> getPendingRequests(Pageable pageable) {
        return repository.findByStatus(RQStatus.PENDING, pageable);
    }

    public Page<Request> getRequestHistory(Pageable pageable) {
        List<RQStatus> historyStatuses = Arrays.asList(RQStatus.APPROVED, RQStatus.REJECTED);
        return repository.findByStatusIn(historyStatuses, pageable);
    }

    public Request createRequest(Request request) {
        request.setStatus(RQStatus.PENDING);
        request.setCreatedDate(LocalDateTime.now());
        return repository.save(request);
    }

    public Request approveRequest(String id, String user) {
        Request request = repository.findById(id).orElseThrow(() -> new RuntimeException("Request not found"));
        
        request.setStatus(RQStatus.APPROVED);
        request.setCompletedBy(user);
        request.setCompletedDate(LocalDateTime.now());

        // 1. Áp dụng data vào bảng LeaseSuite, Option, Clause...
        applyRequestChanges(request);

        // 2. LOGIC ĐẶC BIỆT CHO SUITE: TỰ ĐỘNG REJECT CÁC REQUEST KHÁC ĐANG TRANH GIÀNH
        if (request.getRequestType() == RQType.SUITE_ASSIGNMENT) {
            String approvedSuId = extractSuiteIdFromRequest(request);

            if (approvedSuId != null) {
                // Đổi trạng thái mặt bằng ở bảng Master (Space) thành OCCUPIED để không ai add được nữa
                Query updateSuiteStatus = new Query(Criteria.where("suiteId").is(approvedSuId));
                mongoTemplate.updateFirst(updateSuiteStatus, new Update().set("status", "OCCUPIED"), "suites");

                // Tìm tất cả các Request PENDING khác có cùng mã Suite này
                Query pendingQuery = new Query(Criteria.where("status").is(RQStatus.PENDING)
                                                .and("requestType").is(RQType.SUITE_ASSIGNMENT));
                List<Request> pendingReqs = mongoTemplate.find(pendingQuery, Request.class);

                for (Request pReq : pendingReqs) {
                    if (pReq.getId().equals(request.getId())) continue; // Bỏ qua request đang duyệt
                    
                    String pSuId = extractSuiteIdFromRequest(pReq);
                    if (approvedSuId.equals(pSuId)) {
                        // Tự động Reject
                        pReq.setStatus(RQStatus.REJECTED);
                        pReq.setCompletedBy("System Auto-Reject");
                        pReq.setCompletedDate(LocalDateTime.now());
                        pReq.setComment("Tự động từ chối: Mặt bằng " + approvedSuId + " đã được cấp phát cho một hợp đồng khác.");
                        repository.save(pReq);
                    }
                }
            }
        }

        return repository.save(request);
    }

    public Request rejectRequest(String id, String user, String comment) {
        Request request = repository.findById(id).orElseThrow(() -> new RuntimeException("Request not found"));
        request.setStatus(RQStatus.REJECTED);
        request.setCompletedBy(user);
        request.setCompletedDate(LocalDateTime.now());
        request.setComment(comment);
        return repository.save(request);
    }

    // --- HÀM KIỂM TRA XEM CÓ REQUEST PENDING NÀO CỦA SUITE NÀY KHÔNG (CHO FRONTEND HIỆN WARNING) ---
    public boolean checkIfSuiteHasPendingRequest(String suId) {
        Query query = new Query(Criteria.where("status").is(RQStatus.PENDING).and("requestType").is(RQType.SUITE_ASSIGNMENT));
        List<Request> pendingReqs = mongoTemplate.find(query, Request.class);
        
        for (Request req : pendingReqs) {
            if (suId.equals(extractSuiteIdFromRequest(req))) return true;
        }
        return false;
    }

    // Hàm phụ trợ để lấy mã Suite an toàn từ Request
    private String extractSuiteIdFromRequest(Request req) {
        if (req.getRequestData() != null && req.getRequestData().containsKey("suId")) {
            return req.getRequestData().get("suId").toString();
        } else if (req.getTargetId() != null && !req.getTargetId().equals("NEW")) {
            LeaseSuite ls = mongoTemplate.findById(req.getTargetId(), LeaseSuite.class);
            if (ls != null) return ls.getSuId();
        }
        return null;
    }

    private void applyRequestChanges(Request req) {
        if (req.getRequestType() == null || req.getTargetId() == null || req.getTargetId().equals("NEW")) return;
        Query query = new Query(Criteria.where("_id").is(req.getTargetId()));
        Class<?> entityClass = null;

        switch (req.getRequestType()) {
            case CONTRACT_OPTIONS: entityClass = LeaseOption.class; break; 
            case CONTRACT_TERMS: entityClass = Clause.class; break;
            case SUITE_ASSIGNMENT: entityClass = LeaseSuite.class; break;
            case CONTRACT_AMENDMENTS: entityClass = Amendment.class; break;
            case RECURRING_COSTS: entityClass = RecurringCost.class; break;
            default: return;
        }

        if ("CREATE".equals(req.getAction())) {
            mongoTemplate.updateFirst(query, new Update().set("active", true), entityClass);
        } else if ("UPDATE".equals(req.getAction())) {
            Update update = new Update();
            if (req.getRequestData() != null) {
                for (Map.Entry<String, Object> entry : req.getRequestData().entrySet()) {
                    if (!entry.getKey().toLowerCase().contains("id") || entry.getKey().equals("suiteId") || entry.getKey().equals("amenityId")) {
                        update.set(entry.getKey(), entry.getValue());
                    }
                }
            }
            mongoTemplate.updateFirst(query, update, entityClass);
        } else if ("DELETE".equals(req.getAction())) {
            mongoTemplate.remove(query, entityClass);
        }
    }
}