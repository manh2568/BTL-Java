package com.truyenhay.backend.service;

import com.truyenhay.backend.config.VnpayConfig;
import com.truyenhay.backend.entity.Order;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.SimpleDateFormat;
import java.util.*;

/**
 * Service xử lý thanh toán VNPay
 * 
 * FLOW:
 * 1. createPaymentUrl() → tạo URL thanh toán VNPay
 * 2. verifyCallbackData() → xác thực callback từ VNPay
 */
@Service
public class VnpayService {

    @Autowired
    private VnpayConfig vnpayConfig;

    /**
     * Tạo URL thanh toán VNPay
     * 
     * @param order Đơn hàng cần thanh toán
     * @return URL chuyển hướng sang VNPay
     */
    public String createPaymentUrl(Order order, String clientIp) {
        try {
            Map<String, String> vnp_Params = new TreeMap<>();
            
            vnp_Params.put("vnp_Version", "2.1.0");
            vnp_Params.put("vnp_Command", "pay");
            vnp_Params.put("vnp_TmnCode", vnpayConfig.getTmnCode());
            
            // Số tiền tính bằng VND * 100 (VNPay yêu cầu)
            vnp_Params.put("vnp_Amount", String.valueOf(order.getAmount() * 100));
            
            vnp_Params.put("vnp_CurrCode", "VND");
            vnp_Params.put("vnp_TxnRef", String.valueOf(order.getId())); // Mã đơn hàng
            vnp_Params.put("vnp_OrderInfo", "Nap " + order.getAmount() + " coins");
            vnp_Params.put("vnp_OrderType", "other");
            vnp_Params.put("vnp_Locale", "vn");
            vnp_Params.put("vnp_ReturnUrl", vnpayConfig.getReturnUrl());
            vnp_Params.put("vnp_IpAddr", clientIp);
            
            // Thời gian hiện tại (yyyyMMddHHmmss)
            Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Etc/GMT+7"));
            SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
            String vnp_CreateDate = formatter.format(cld.getTime());
            vnp_Params.put("vnp_CreateDate", vnp_CreateDate);
            
            // Thời gian hết hạn (yyyyMMddHHmmss)
            cld.add(Calendar.MINUTE, 15); // 15 phút
            String vnp_ExpireDate = formatter.format(cld.getTime());
            vnp_Params.put("vnp_ExpireDate", vnp_ExpireDate);
            
            // Tính toán secure hash
            String queryUrl = buildQueryString(vnp_Params);
            String vnp_SecureHash = hmacSHA512(vnpayConfig.getSecretKey(), queryUrl);
            String paymentUrl = vnpayConfig.getUrl() + "?" + queryUrl + "&vnp_SecureHash=" + vnp_SecureHash;
            
            return paymentUrl;
            
        } catch (Exception e) {
            throw new RuntimeException("Lỗi tạo URL VNPay: " + e.getMessage());
        }
    }

    /**
     * Xác thực dữ liệu callback từ VNPay
     * 
     * @param responseCode Mã phản hồi từ VNPay (00 = thành công)
     * @param vnp_SecureHash Hash từ VNPay
     * @param params Tất cả tham số callback
     * @return true nếu hợp lệ, false nếu không
     */
    public boolean verifyCallbackData(String responseCode, String vnp_SecureHash, Map<String, String> params) {
        try {
            // Loại bỏ secure hash khỏi params để tính toán lại
            Map<String, String> vnp_Params = new TreeMap<>(params);
            vnp_Params.remove("vnp_SecureHash");
            vnp_Params.remove("vnp_SecureHashType");
            
            // Xây dựng query string từ params
            String queryUrl = buildQueryString(vnp_Params);
            
            // Tính hash
            String checksum = hmacSHA512(vnpayConfig.getSecretKey(), queryUrl);
            
            // So sánh hash
            boolean isValid = checksum.equals(vnp_SecureHash);
            
            // Kiểm tra response code
            boolean isSuccess = "00".equals(responseCode);
            
            return isValid && isSuccess;
            
        } catch (Exception e) {
            System.err.println("Lỗi xác thực callback: " + e.getMessage());
            return false;
        }
    }

    /**
     * Xây dựng query string từ map
     */
    private String buildQueryString(Map<String, String> params) throws UnsupportedEncodingException {
        StringBuilder sb = new StringBuilder();
        boolean first = true;
        
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (!first) {
                sb.append("&");
            }
            sb.append(URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8.toString()));
            sb.append("=");
            sb.append(URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8.toString()));
            first = false;
        }
        
        return sb.toString();
    }

    /**
     * Tính HMAC SHA512
     */
    private String hmacSHA512(String key, String data) throws NoSuchAlgorithmException {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(), "HmacSHA512");
            mac.init(secretKeySpec);
            byte[] hash = mac.doFinal(data.getBytes());
            
            return bytesToHexString(hash);
            
        } catch (Exception e) {
            throw new NoSuchAlgorithmException("Lỗi tính HMAC SHA512");
        }
    }

    /**
     * Chuyển byte array thành hex string
     */
    private String bytesToHexString(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) {
                sb.append('0');
            }
            sb.append(hex);
        }
        return sb.toString();
    }
}
