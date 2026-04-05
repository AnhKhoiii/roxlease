package com.roxlease.lease.service;

import com.roxlease.lease.model.Request;
import com.roxlease.lease.model.Enum.RQStatus;
import com.roxlease.lease.repository.RequestRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Service
public class RequestService {

    private final RequestRepository repository;

    public RequestService(RequestRepository repository) {
        this.repository = repository;
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
        Request request = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Request not found"));
        
        request.setStatus(RQStatus.APPROVED);
        request.setCompletedBy(user);
        request.setCompletedDate(LocalDateTime.now());
        return repository.save(request);
    }

    public Request rejectRequest(String id, String user, String comment) {
        Request request = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Request not found"));
        
        request.setStatus(RQStatus.REJECTED);
        request.setCompletedBy(user);
        request.setCompletedDate(LocalDateTime.now());
        request.setComment(comment);
        return repository.save(request);
    }
}