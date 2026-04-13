package com.truyenhay.backend.repository;

import com.truyenhay.backend.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    
    // Lấy danh sách đơn hàng của user
    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    // Lấy đơn hàng theo VNPay transaction number
    Optional<Order> findByVnpayTransactionNo(String vnpayTransactionNo);
    
    // Lấy các đơn hàng pending (chưa thanh toán)
    List<Order> findByStatusAndUserId(String status, Long userId);
}
