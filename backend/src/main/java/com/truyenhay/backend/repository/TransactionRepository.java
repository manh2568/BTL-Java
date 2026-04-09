package com.truyenhay.backend.repository;

import com.truyenhay.backend.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    Optional<Transaction> findByUserIdAndChapterIdAndType(Long userId, Long chapterId, String type);
    List<Transaction> findByUserIdAndType(Long userId, String type);
}
