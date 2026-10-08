package com.trainify.lms.services;

import com.trainify.lms.domain.entities.Tenant;
import com.trainify.lms.domain.entities.User;
import com.trainify.lms.domain.enums.Role;
import com.trainify.lms.dto.LoginRequest;
import com.trainify.lms.exceptions.GlobalExceptionHandler;
import com.trainify.lms.repositories.UserRepository;
import com.trainify.lms.security.CustomUserDetails;
import com.trainify.lms.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Entrar na plataforma passou a depender de duas coisas que nada tem a ver com
 * a senha: registrar o acesso na auditoria e assinar o endereco da foto do
 * usuario para colocar no token. Qualquer uma das duas falhando derrubava o
 * login inteiro com "tente novamente mais tarde", sem dizer o motivo.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class LoginResilienciaTest {

    private static final UUID EMPRESA = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Mock private AuthenticationManager authenticationManager;
    @Mock private JwtUtil jwtUtil;
    @Mock private StringRedisTemplate redisTemplate;
    @Mock private UserDetailsService userDetailsService;
    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JavaMailSender mailSender;
    @Mock private ActivityLogService activityLog;

    @InjectMocks private AuthService authService;

    private User conta() {
        Tenant tenant = new Tenant();
        tenant.setId(EMPRESA);
        tenant.setName("Empresa Demo");

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setTenant(tenant);
        user.setEmail("adminsupremo2@trainify.com");
        user.setName("Admin Supremo");
        user.setPasswordHash("hash");
        user.setRole(Role.SUPER_ADMIN);
        user.setIsActive(true);
        user.setAvatar("s3:avatars/foto.png");
        return user;
    }

    private void senhaCorreta(User user) {
        CustomUserDetails detalhes = new CustomUserDetails(user);
        when(userRepository.findAllByEmailIgnoreCaseAndIsActiveTrue(user.getEmail()))
                .thenReturn(List.of(user));
        when(authenticationManager.authenticate(any()))
                .thenReturn(new UsernamePasswordAuthenticationToken(detalhes, null, detalhes.getAuthorities()));
        when(jwtUtil.generateToken(any())).thenReturn("token-de-acesso");
        when(jwtUtil.generateRefreshToken(any())).thenReturn("token-de-renovacao");
    }

    private LoginRequest pedido(User user) {
        LoginRequest request = new LoginRequest();
        request.setEmail(user.getEmail());
        request.setPassword("senha-correta");
        return request;
    }

    @Test
    void entraMesmoQuandoAAuditoriaFalha() {
        User user = conta();
        senhaCorreta(user);
        doThrow(new RuntimeException("banco recusou o registro"))
                .when(activityLog).recordFor(any(), any(), any(), any(), any(), any());

        var resposta = authService.login(pedido(user));

        assertEquals("token-de-acesso", resposta.getAccessToken());
    }

    @Test
    void aAuditoriaRecebeOsIdentificadoresEmVezDaEntidade() {
        User user = conta();
        senhaCorreta(user);

        authService.login(pedido(user));

        // Passar a entidade fazia o Hibernate tentar lê-la fora da transação dela
        verify(activityLog).recordFor(EMPRESA, user.getId(), "LOGIN", "USER", user.getId(), java.util.Map.of());
    }

    @Test
    void fotoComEnderecoQuebradoDeixaOUsuarioSemFotoNaoSemAcesso() {
        S3Service s3 = mock(S3Service.class);
        when(s3.generatePresignedDownloadUrl(any()))
                .thenThrow(new RuntimeException("armazenamento indisponível"));

        AvatarUrlResolver resolver = new AvatarUrlResolver(s3);

        assertNull(resolver.resolve("s3:avatars/foto.png"));
        assertEquals("https://externo/foto.png", resolver.resolve("https://externo/foto.png"));
    }

    @Test
    void erroSemTratamentoExplicaOQueHouveEmVezDeSairEmBranco() {
        var problema = new GlobalExceptionHandler()
                .handleUnexpected(new NullPointerException("algo nulo"));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR.value(), problema.getStatus());
        assertNotNull(problema.getDetail(), "sem detail o site só sabe dizer 'tente mais tarde'");
        assertNotNull(problema.getProperties().get("reference"), "o código ajuda a achar o erro no log");
    }
}
