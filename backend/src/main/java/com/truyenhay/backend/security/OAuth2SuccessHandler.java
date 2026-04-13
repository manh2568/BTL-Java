package com.truyenhay.backend.security;

import com.truyenhay.backend.entity.AuthProvider;
import com.truyenhay.backend.entity.User;
import com.truyenhay.backend.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Optional;

@Component
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Value("${vnpay.return-url}")
    private String frontendReturnUrl;

    public OAuth2SuccessHandler(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String providerId = oAuth2User.getName();
        String picture = oAuth2User.getAttribute("picture"); // Google
        if (picture == null) picture = oAuth2User.getAttribute("url"); // Facebook sometimes stores picture separately

        // Xác định nhà cung cấp
        String registrationId = ((org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken) authentication)
                .getAuthorizedClientRegistrationId();
        AuthProvider provider = AuthProvider.LOCAL;
        if ("google".equalsIgnoreCase(registrationId)) provider = AuthProvider.GOOGLE;
        else if ("facebook".equalsIgnoreCase(registrationId)) provider = AuthProvider.FACEBOOK;

        if (email == null) {
            // Trường hợp FB không trả email, có thể dùng providerId làm username tạm thời
            email = providerId + "@" + registrationId + ".com";
        }

        Optional<User> userOpt = userRepository.findByEmailCanonical(email.toLowerCase().trim());
        User user;
        if (userOpt.isPresent()) {
            user = userOpt.get();
            user.setProvider(provider);
            user.setProviderId(providerId);
            if (user.getFullName() == null) user.setFullName(name);
            if (user.getAvatarUrl() == null && picture != null) user.setAvatarUrl(picture);
            userRepository.save(user);
        } else {
            user = new User();
            user.setEmail(email);
            user.setUsername(email.split("@")[0].replace(".", "_") + "_" + registrationId); 
            user.setFullName(name);
            user.setProvider(provider);
            user.setProviderId(providerId);
            user.setAvatarUrl(picture);
            user.setVerified(true);
            userRepository.save(user);
        }

        String token = jwtService.generateToken(user.getUsername());
        String targetUrl = UriComponentsBuilder.fromUriString(frontendReturnUrl)
                .queryParam("token", token)
                .build().toUriString();

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
