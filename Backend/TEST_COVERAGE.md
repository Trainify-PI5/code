# Test Coverage

## Como executar os testes

Execute o comando abaixo na raiz do projeto:

```bash
./mvnw.cmd test
```

ou, em sistemas Unix/Linux/macOS:

```bash
./mvnw test
```

## Como gerar o relatório de cobertura

O relatório JaCoCo é gerado automaticamente durante o ciclo de build Maven. Para gerar o relatório completo, execute:

```bash
./mvnw.cmd verify
```

## Onde localizar o HTML

O relatório HTML do JaCoCo fica em:

- `target/site/jacoco/index.html`

## Onde localizar o XML

O relatório XML do JaCoCo fica em:

- `target/site/jacoco/jacoco.xml`

## Onde localizar o CSV

O relatório CSV do JaCoCo fica em:

- `target/site/jacoco/jacoco.csv`

## Como interpretar os resultados

O relatório `index.html` exibe cobertura por:

- Classes
- Métodos
- Linhas
- Branches

A linha `Total` no topo do relatório mostra as métricas agregadas.

## Como verificar a porcentagem de cobertura

O JaCoCo exibe porcentagens na coluna `Cov.` da tabela de cobertura. A configuração do build garante que o Maven falhe se:

- a cobertura de linha for menor que `80%`
- a cobertura de branch for menor que `70%`

## Observações

As classes em `**/dto/**`, `**/entity/**` e `**/config/**` são excluídas da verificação de cobertura JaCoCo para evitar penalizar o relatório com classes simples de DTO e configuração.
