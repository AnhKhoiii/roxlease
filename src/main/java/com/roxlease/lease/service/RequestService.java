package com.roxlease.lease.service;

import com.roxlease.lease.model.Request;
import com.roxlease.lease.model.Enum.RQStatus;
import com.roxlease.lease.model.Enum.RQType;
import com.roxlease.lease.model.Clause;
import com.roxlease.lease.model.LeaseOption;
import com.roxlease.lease.model.LeaseSuite;
import com.roxlease.cost.model.RecurringCost;
import com.roxlease.cost.model.RecurringCostSchedule;
import com.roxlease.cost.model.Enum.PaymentStatus;
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

        // 3. LOGIC ĐẶC BIỆT CHO EARLY TERMINATION: TỰ ĐỘNG HỦY CÁC KỲ CHI PHÍ TRONG TƯƠNG LAI
        if (request.getRequestType() == RQType.CONTRACT_OPTIONS) {
            try {
                LeaseOption option = null;
                if (request.getTargetId() != null && !request.getTargetId().equals("NEW")) {
                    option = mongoTemplate.findById(request.getTargetId(), LeaseOption.class);
                }

                String opType = null;
                String lsId = null;
                java.time.LocalDate startDate = null;

                if (option != null) {
                    opType = option.getOpType() != null ? option.getOpType().name() : null;
                    lsId = option.getLsId();
                    startDate = option.getStartDate();
                } else if (request.getRequestData() != null) {
                    Map<String, Object> reqData = request.getRequestData();
                    opType = String.valueOf(reqData.get("opType"));
                    lsId = String.valueOf(reqData.get("lsId"));
                    if (reqData.get("startDate") != null) {
                        startDate = java.time.LocalDate.parse(reqData.get("startDate").toString());
                    }
                }

                if ("EARLY_TERMINATION".equals(opType) && lsId != null && startDate != null && !"null".equals(lsId)) {
                    Query cancelQuery = new Query(Criteria.where("leaseId").is(lsId)
                            .and("dueDate").gt(startDate)
                            .and("paymentStatus").is(PaymentStatus.PENDING)); 

                    Update cancelUpdate = new Update()
                            .set("paymentStatus", PaymentStatus.REJECTED)
                            .set("cancelReason", "Tự động hủy do hợp đồng kích hoạt Early Termination (Chấm dứt sớm)")
                            .set("approvalDate", LocalDateTime.now());

                    mongoTemplate.updateMulti(cancelQuery, cancelUpdate, RecurringCostSchedule.class);
                }
            } catch (Exception e) {
                System.err.println("Lỗi hủy lịch chi phí do Early Termination: " + e.getMessage());
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
            case CONTRACT_CLAUSES: entityClass = Clause.class; break;
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
                    String key = entry.getKey();
                    Object value = entry.getValue();

                    // Lọc bỏ các trường khóa chính (_id, id) và các custom ID có nguy cơ được đánh dấu @Id để tránh lỗi MongoDB "Modifying immutable field '_id'"
                    if (!key.equals("_id") && !key.equals("id") && !key.equals("_class") && !key.equals("class") 
                        && !key.equals("recurringCostId") && !key.equals("amendmentId") && !key.equals("opId") && !key.equals("clauseId") && !key.equals("lsSuId") && !key.equals("suId")) {
                        
                        // 🚀 FIX LỖI ÉP KIỂU (MappingException) DÀNH RIÊNG CHO RECURRING COST
                        if (entityClass == RecurringCost.class && value != null) {
                            if (value instanceof String && (key.contains("Date") || key.contains("date"))) {
                                try {
                                    value = java.time.LocalDate.parse((String) value);
                                } catch (Exception ignored) {}
                            } else if (value instanceof Number && (key.startsWith("amount") || key.equals("exchangeRate") || key.equals("currVat"))) {
                                try {
                                    value = new java.math.BigDecimal(value.toString());
                                } catch (Exception ignored) {}
                            }
                        }
                        
                        update.set(key, value);
                    }
                }
            }
            update.set("active", true);
            mongoTemplate.updateFirst(query, update, entityClass);
            
            if (entityClass == RecurringCost.class) {
                RecurringCost updatedCost = mongoTemplate.findById(req.getTargetId(), RecurringCost.class);
                if (updatedCost != null && updatedCost.getEndDate() != null) {
                    Query schQuery = new Query(Criteria.where("recurringCostId").is(updatedCost.getRecurringCostId())
                            .and("dueDate").gt(updatedCost.getEndDate()));
                    Update schUpdate = new Update().set("paymentStatus", PaymentStatus.PENDING);
                    mongoTemplate.updateMulti(schQuery, schUpdate, RecurringCostSchedule.class);
                }
            }
        } else if ("DELETE".equals(req.getAction())) {
            mongoTemplate.remove(query, entityClass);
        }
    }
}