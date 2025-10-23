# Serviço de Correção Automática

Este projeto é um microsserviço Node.js com Express projetado para corrigir projetos de programação de forma automatizada, utilizando a CLI do Google Gemini.

O servidor gerencia as requisições de correção em uma fila interna, garantindo que apenas uma correção seja processada por vez para não exceder os limites de taxa da API do Gemini.

## Funcionalidades

-   **Servidor Web:** Implementado com Express, expondo um único endpoint para receber trabalhos de correção.
-   **Fila de Processamento:** Garante que as correções sejam executadas sequencialmente.
-   **Correção Automatizada:** Clona um repositório Git, executa a CLI do Gemini com um enunciado específico e retorna o resultado.
-   **Ambiente Containerizado:** Totalmente configurado para ser executado dentro de um container Docker.

## Como Executar

### Pré-requisitos

-   [Docker](https://www.docker.com/get-started) instalado.
-   Uma chave de API do Google Gemini configurada no seu ambiente ou na CLI do Gemini.

### Passos

1.  **Construa a imagem Docker:**

    ```bash
    docker build -t correction-service .
    ```

2.  **Execute o container:**

    Para executar o serviço, você precisa fornecer sua chave de API do Gemini como uma variável de ambiente.

    ```bash
    docker run -p 3000:3000 -e GEMINI_API_KEY="SUA_CHAVE_DE_API_AQUI" --name correction-api -d correction-service
    ```

    O servidor estará rodando e acessível em `http://localhost:3000`.

## Como Usar

Envie uma requisição `POST` para o endpoint `/corrigir` com a URL do repositório e o enunciado do projeto.

### Exemplo com `curl`

```bash
curl -X POST http://localhost:3000/corrigir \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/thyrso/POSGoExperts-01.git",
    "enunciado": "Descrição:\nOlá dev, tudo bem?\n\nNeste desafio vamos aplicar o que aprendemos sobre webserver http, contextos, banco de dados e manipulação de arquivos com Go.\n\nVocê precisará nos entregar dois sistemas em Go:\n- client.go\n- server.go\n\nOs requisitos para cumprir este desafio são:\n\nO client.go deverá realizar uma requisição HTTP no server.go solicitando a cotação do dólar.\n\nO server.go deverá consumir a API contendo o câmbio de Dólar e Real no endereço: https://economia.awesomeapi.com.br/json/last/USD-BRL e em seguida deverá retornar no formato JSON o resultado para o cliente.\n\nUsando o package \"context\", o server.go deverá registrar no banco de dados SQLite cada cotação recebida, sendo que o timeout máximo para chamar a API de cotação do dólar deverá ser de 200ms e o timeout máximo para conseguir persistir os dados no banco deverá ser de 10ms.\n\nO client.go precisará receber do server.go apenas o valor atual do câmbio (campo \"bid\" do JSON). Utilizando o package \"context\", o client.go terá um timeout máximo de 300ms para receber o resultado do server.go.\n\nOs 3 contextos deverão retornar erro nos logs caso o tempo de execução seja insuficiente.\n\nO client.go terá que salvar a cotação atual em um arquivo \"cotacao.txt\" no formato: Dólar: {valor}\n\nO endpoint necessário gerado pelo server.go para este desafio será: /cotacao e a porta a ser utilizada pelo servidor HTTP será a 8080.\n\nAo finalizar, envie o link do repositório para correção."
  }'

```

### Resposta

O servidor responderá com o JSON de resultado da análise do Gemini ou com uma mensagem de erro se algo der errado durante o processo.

```