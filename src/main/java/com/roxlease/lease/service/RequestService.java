package com.roxlease.lease.service;

import com.roxlease.lease.model.Request;
import com.roxlease.lease.model.Enum.RQStatus;
import com.roxlease.lease.model.Enum.RQType;
import com.roxlease.lease.model.Clause;
import com.roxlease.lease.model.LeaseOption;
import com.roxlease.lease.model.Lease;
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

        // Trích xuất thông tin Lease ID trước khi apply changes (đề phòng bản ghi bị xoá mất do action DELETE)
        String lsIdForSuite = null;
        if (request.getRequestType() == RQType.SUITE_ASSIGNMENT) {
            lsIdForSuite = extractLeaseIdFromRequest(request);
        }

        // 1. Áp dụng data vào bảng LeaseSuite, Option, Clause...
        applyRequestChanges(request);

        // 2. LOGIC ĐẶC BIỆT CHO SUITE: TỰ ĐỘNG REJECT CÁC REQUEST KHÁC ĐANG TRANH GIÀNH
        if (request.getRequestType() == RQType.SUITE_ASSIGNMENT) {
            String approvedSuId = extractSuiteIdFromRequest(request);

            if (approvedSuId != null) {
                if (!"DELETE".equalsIgnoreCase(request.getAction()) && !"REMOVE".equalsIgnoreCase(request.getAction())) {
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
            
            // TỰ ĐỘNG TÍNH LẠI DIỆN TÍCH CHO THUÊ (AREA_NEGOTIATED) BẰNG TỔNG DIỆN TÍCH CÁC SUITE
            recalculateLeaseArea(lsIdForSuite);
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

    // --- HÀM LẤY DANH SÁCH CÁC SUITE ĐANG ĐƯỢC THUÊ (CHO FRONTEND LỌC MÀ KHÔNG CẦN TRƯỜNG STATUS) ---
    public List<String> getActiveSuiteIds() {
        Query query = new Query(Criteria.where("active").is(true));
        List<LeaseSuite> activeSuites = mongoTemplate.find(query, LeaseSuite.class);
        return activeSuites.stream().map(LeaseSuite::getSuId).filter(java.util.Objects::nonNull).collect(java.util.stream.Collectors.toList());
    }

    private String extractLeaseIdFromRequest(Request req) {
        if (req.getRequestData() != null) {
            if (req.getRequestData().containsKey("lsId")) return req.getRequestData().get("lsId").toString();
            if (req.getRequestData().containsKey("leaseId")) return req.getRequestData().get("leaseId").toString();
            if (req.getRequestData().containsKey("ls_id")) return req.getRequestData().get("ls_id").toString();
        }
        if (req.getTargetId() != null && !req.getTargetId().equals("NEW")) {
            LeaseSuite ls = mongoTemplate.findById(req.getTargetId(), LeaseSuite.class);
            if (ls != null) return ls.getLsId();
        }
        return null;
    }

    private void recalculateLeaseArea(String lsId) {
        if (lsId == null) {
            System.out.println("[recalculateLeaseArea] lsId is null, skipping.");
            return;
        }
        System.out.println("[recalculateLeaseArea] Starting area calculation for Lease ID: " + lsId);
        Query query = new Query(Criteria.where("lsId").is(lsId).and("active").is(true));
        List<LeaseSuite> activeSuites = mongoTemplate.find(query, LeaseSuite.class);
        
        System.out.println("[recalculateLeaseArea] Found active suites: " + activeSuites.size());
        double totalArea = 0.0;
        java.time.LocalDate today = java.time.LocalDate.now();
        
        for (LeaseSuite ls : activeSuites) {
            boolean isValid = true;
            try {
                java.lang.reflect.Method method = ls.getClass().getMethod("getDateEnd");
                Object dateEndObj = method.invoke(ls);
                if (dateEndObj != null) {
                    java.time.LocalDate dateEnd = null;
                    if (dateEndObj instanceof java.time.LocalDate) {
                        dateEnd = (java.time.LocalDate) dateEndObj;
                    } else if (dateEndObj instanceof String) {
                        dateEnd = java.time.LocalDate.parse((String) dateEndObj);
                    } else if (dateEndObj instanceof java.util.Date) {
                        dateEnd = ((java.util.Date) dateEndObj).toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDate();
                    }
                    if (dateEnd != null && dateEnd.isBefore(today)) {
                        isValid = false;
                    }
                }
            } catch (Exception ignored) {
                // Fallback nếu không lấy được dateEnd
            }

            if (!isValid) {
                continue; // Bỏ qua nếu suite đã hết hạn
            }

            if (ls.getSuId() != null) {
                org.bson.Document suiteDoc = mongoTemplate.findOne(
                        new Query(new Criteria().orOperator(
                            Criteria.where("suiteId").is(ls.getSuId()), Criteria.where("_id").is(ls.getSuId()))), 
                        org.bson.Document.class, "suites");
                if (suiteDoc != null && suiteDoc.get("area") != null) {
                    try { totalArea += Double.parseDouble(suiteDoc.get("area").toString()); } catch (Exception ignored) {}
                } else {
                    org.bson.Document roomDoc = mongoTemplate.findOne(
                            new Query(new Criteria().orOperator(
                                Criteria.where("roomId").is(ls.getSuId()), Criteria.where("_id").is(ls.getSuId()))), 
                            org.bson.Document.class, "rooms");
                    if (roomDoc != null && roomDoc.get("area") != null) {
                        try { totalArea += Double.parseDouble(roomDoc.get("area").toString()); } catch (Exception ignored) {}
                    }
                }
            }
        }
        
        System.out.println("[recalculateLeaseArea] Total Area Calculated: " + totalArea);
        Query leaseQuery = new Query(new Criteria().orOperator(
            Criteria.where("_id").is(lsId),
            Criteria.where("lsId").is(lsId),
            Criteria.where("ls_id").is(lsId)
        ));
        Update update = new Update().set("areaNegotiated", totalArea).set("area_negotiated", totalArea);
        var result = mongoTemplate.updateFirst(leaseQuery, update, "leases");
        System.out.println("[recalculateLeaseArea] Update leases collection match: " + result.getMatchedCount() + ", modified: " + result.getModifiedCount());
    }

    // Hàm phụ trợ để lấy mã Suite an toàn từ Request
    private String extractSuiteIdFromRequest(Request req) {
        if (req.getRequestData() != null) {
            if (req.getRequestData().containsKey("suId")) return req.getRequestData().get("suId").toString();
            if (req.getRequestData().containsKey("suiteId")) return req.getRequestData().get("suiteId").toString();
            if (req.getRequestData().containsKey("roomId")) return req.getRequestData().get("roomId").toString();
        }
        if (req.getTargetId() != null && !req.getTargetId().equals("NEW")) {
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
            case LEASE_DETAILS: entityClass = Lease.class; break;
            default: return;
        }

        String action = req.getAction();
        if (action == null) action = "UPDATE"; // fallback

        if ("CREATE".equalsIgnoreCase(action) || "ADD".equalsIgnoreCase(action)) {
            mongoTemplate.updateFirst(query, new Update().set("active", true), entityClass);
        } else if ("UPDATE".equalsIgnoreCase(action) || "EDIT".equalsIgnoreCase(action)) {
            Update update = new Update();
            if (req.getRequestData() != null) {
                for (Map.Entry<String, Object> entry : req.getRequestData().entrySet()) {
                    String key = entry.getKey();
                    Object value = entry.getValue();

                    // Lọc bỏ các trường khóa chính (_id, id) và các metadata
                    if (!key.equals("_id") && !key.equals("id") && !key.equals("_class") && !key.equals("class") 
                        && !key.equals("recurringCostId") && !key.equals("amendmentId") && !key.equals("opId") 
                        && !key.equals("clauseId") && !key.equals("lsSuId") && !key.equals("suId")
                        && !key.equals("lsId") && !key.equals("leaseId") && !key.equals("createdAt") 
                        && !key.equals("updatedAt") && !key.equals("createdDate") && !key.equals("updatedDate")) {
                        
                        // 🚀 SỬ DỤNG REFLECTION ĐỂ CHỌN ĐÚNG KIỂU DỮ LIỆU TỪ ENTITY CLASS (Tránh lỗi MappingException)
                        if (value != null) {
                            try {
                                java.lang.reflect.Field field = null;
                                Class<?> currentClass = entityClass;
                                while (currentClass != null && currentClass != Object.class) {
                                    try {
                                        field = currentClass.getDeclaredField(key);
                                        break;
                                    } catch (NoSuchFieldException e) {
                                        currentClass = currentClass.getSuperclass();
                                    }
                                }

                                if (field != null) {
                                    Class<?> type = field.getType();
                                    String strVal = value.toString().trim();
                                    
                                    if (strVal.isEmpty() || strVal.equalsIgnoreCase("null")) {
                                        value = null;
                                    } else if (type == java.time.LocalDate.class) {
                                        if (strVal.contains("T")) value = java.time.LocalDate.parse(strVal.split("T")[0]);
                                        else value = java.time.LocalDate.parse(strVal);
                                    } else if (type == java.time.LocalDateTime.class) {
                                        value = java.time.LocalDateTime.parse(strVal);
                                    } else if (type == java.math.BigDecimal.class) {
                                        value = new java.math.BigDecimal(strVal);
                                    } else if (type == Double.class || type == double.class) {
                                        value = Double.valueOf(strVal);
                                    } else if (type == Integer.class || type == int.class) {
                                        value = Integer.valueOf(strVal);
                                    } else if (type == Boolean.class || type == boolean.class) {
                                        value = Boolean.valueOf(strVal);
                                    } else if (type.isEnum()) {
                                        for (Object enumConstant : type.getEnumConstants()) {
                                            if (enumConstant.toString().equalsIgnoreCase(strVal)) {
                                                value = enumConstant;
                                                break;
                                            }
                                        }
                                    }
                                }
                            } catch (Exception ignored) {
                                System.err.println("Request parsing error for key " + key + ": " + ignored.getMessage());
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
        } else if ("DELETE".equalsIgnoreCase(action) || "REMOVE".equalsIgnoreCase(action)) {
            mongoTemplate.remove(query, entityClass);
        }
    }
}