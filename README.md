# equipe7-backend

Back-end acadêmico em Java (cadastro e login) com testes unitários (JUnit 5). Não há servidor HTTP nem `main`; o que se “roda” aqui é principalmente a suíte de testes via Maven.

## Pré-requisitos

- **Java 17** (JDK)
- **Maven 3.3+** instalado e disponível no `PATH` (comando `mvn`)

Para conferir:

```bash
java -version
mvn -version
```

## Como rodar os testes

Na raiz do repositório (`equipe7-backend`):

```bash
mvn test
```

Com saída mais enxuta:

```bash
mvn -q test
```

Os relatórios do Surefire ficam em `target/surefire-reports/` após a execução.

## Como compilar (sem rodar testes)

```bash
mvn compile
```

Pacote apenas compilação + testes em um passo:

```bash
mvn verify
```

## Windows (PowerShell)

Abra o PowerShell na pasta do projeto e use os mesmos comandos; por exemplo:

```powershell
cd caminho\para\equipe7-backend
mvn test
``
