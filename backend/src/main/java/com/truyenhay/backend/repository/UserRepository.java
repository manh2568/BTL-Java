package com.truyenhay.backend.repository;

import com.truyenhay.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);

    @Query("SELECT u FROM User u WHERE LOWER(TRIM(u.username)) = :username")
    Optional<User> findByUsernameCanonical(@Param("username") String username);

    Optional<User> findByEmail(String email);

    /** So khớp email không phụ thuộc hoa/thường và khoảng trắng đầu/cuối (đồng bộ với dữ liệu cũ trong DB). */
    @Query("SELECT CASE WHEN COUNT(u) > 0 THEN true ELSE false END FROM User u WHERE LOWER(TRIM(u.email)) = :email")
    boolean existsByEmailCanonical(@Param("email") String email);

    @Query("SELECT u FROM User u WHERE LOWER(TRIM(u.email)) = :email")
    Optional<User> findByEmailCanonical(@Param("email") String email);

    @Query("SELECT CASE WHEN COUNT(u) > 0 THEN true ELSE false END FROM User u WHERE LOWER(TRIM(u.username)) = :username")
    boolean existsByUsernameCanonical(@Param("username") String username);

    @Query("SELECT CASE WHEN COUNT(u) > 0 THEN true ELSE false END FROM User u WHERE LOWER(TRIM(u.email)) = :email AND u.isVerified = true")
    boolean existsVerifiedByEmailCanonical(@Param("email") String email);

    @Query("SELECT CASE WHEN COUNT(u) > 0 THEN true ELSE false END FROM User u WHERE LOWER(TRIM(u.username)) = :username AND u.isVerified = true")
    boolean existsVerifiedByUsernameCanonical(@Param("username") String username);

    @Query("SELECT u FROM User u WHERE LOWER(TRIM(u.email)) = :email AND u.isVerified = false")
    Optional<User> findPendingByEmailCanonical(@Param("email") String email);

    @Query("SELECT u FROM User u WHERE LOWER(TRIM(u.username)) = :username AND u.isVerified = false")
    Optional<User> findPendingByUsernameCanonical(@Param("username") String username);

    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}
