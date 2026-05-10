package com.roxlease.cost.service;

import com.roxlease.cost.model.PlannedRevenue;
import com.roxlease.cost.repository.PlannedRevenueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.annotation.Id;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoOperations;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Objects;

@Service
public class PlannedRevenueService {

    @Autowired
    private PlannedRevenueRepository repository;

    @Autowired
    private MongoOperations mongoOperations;

    public Page<PlannedRevenue> getFilteredData(Integer year, Integer month, Pageable pageable) {
        return repository.findWithFilters(year, month, pageable);
    }

    public PlannedRevenue getById(String id) {
        return repository.findById(id).orElseThrow(() -> new RuntimeException("Data not found"));
    }

    public PlannedRevenue save(PlannedRevenue data) {
        if (data.getId() == null || data.getId().isEmpty()) {
            // Tự động sinh ID mới nếu là Create
            data.setId(generateSequence("planned_revenue_sequence"));
            data.setCreatedAt(LocalDateTime.now());
        } else {
            PlannedRevenue existing = getById(data.getId());
            data.setCreatedAt(existing.getCreatedAt());
        }
        data.setUpdatedAt(LocalDateTime.now());
        return repository.save(data);
    }

    public void delete(String id) {
        repository.deleteById(id);
    }

    // Hàm xử lý tăng ID nguyên tử (atomic) trên MongoDB
    private String generateSequence(String seqName) {
        Query query = new Query(Criteria.where("_id").is(seqName));
        Update update = new Update().inc("seq", 1);
        FindAndModifyOptions options = new FindAndModifyOptions().returnNew(true).upsert(true);

        DatabaseSequence counter = mongoOperations.findAndModify(query, update, options, DatabaseSequence.class);
        long seqValue = !Objects.isNull(counter) ? counter.getSeq() : 1;

        // Định dạng chuỗi ID trả về: PR-00001, PR-00002...
        return String.format("PR-%05d", seqValue);
    }

    // Inner class để map với collection lưu trữ Sequence
    @Document(collection = "database_sequences")
    private static class DatabaseSequence {
        @Id
        private String id;
        private long seq;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public long getSeq() { return seq; }
        public void setSeq(long seq) { this.seq = seq; }
    }
}