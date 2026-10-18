package com.trainify.lms;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.security.web.SecurityFilterChain;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Prova que a aplicacao consegue subir.
 *
 * E o unico teste que percorre a fiacao inteira: beans, expressoes de permissao,
 * consultas derivadas dos repositorios e configuracao dos clientes externos. Um
 * erro em qualquer um deles so apareceria quando a hospedagem tentasse iniciar.
 *
 * Ele ficou muito tempo falhando por falta de banco e o CI passou a exclui-lo,
 * entao essa verificacao deixou de existir. Agora roda sobre um banco em memoria,
 * sem tocar no esquema (ver src/test/resources/application.properties).
 */
@SpringBootTest
class TrainifyBackendApplicationTests {

	@Autowired
	private ApplicationContext contexto;

	@Test
	void contextLoads() {
		assertNotNull(contexto);
	}

	@Test
	void aProtecaoDasRotasEstaMontada() {
		assertFalse(contexto.getBeansOfType(SecurityFilterChain.class).isEmpty(),
				"sem cadeia de seguranca a API subiria com tudo aberto");
	}

	@Test
	void osRepositoriosForamAceitosPeloSpringData() {
		// Consulta derivada com nome errado, @Query invalida ou @EntityGraph
		// apontando para campo inexistente quebram a criacao destes beans
		assertFalse(contexto.getBeanNamesForType(
				org.springframework.data.repository.Repository.class).length == 0,
				"nenhum repositorio foi criado");
	}

	@Test
	void oClienteDoServicoDeIaEstaConfigurado() {
		assertNotNull(contexto.getBean(com.trainify.lms.ai.TrainifyAiClient.class));
	}
}
