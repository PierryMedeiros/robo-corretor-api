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
-d 
'{'
  "repo_url": "https://github.com/usuario/repositorio-do-aluno.git",
  "enunciado": "Crie uma API REST com Node.js e Express que tenha um endpoint para somar dois números."
}'
```

### Resposta

O servidor responderá com o JSON de resultado da análise do Gemini ou com uma mensagem de erro se algo der errado durante o processo.

```