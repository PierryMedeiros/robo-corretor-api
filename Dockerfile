# 1. Use a imagem base node:20-slim
FROM node:20-slim

# 2. Instale as dependências essenciais
RUN apt-get update && apt-get install -y git

# 3. Instale a CLI do Gemini globalmente
RUN npm install -g @google/gemini-cli

# 4. Defina o diretório de trabalho
WORKDIR /app

# 5. Copie os arquivos de dependência e instale-as
COPY package.json package-lock.json* ./
COPY prompt_template.md ./src/
RUN npm install --production

# 6. Copie o resto do código da aplicação
COPY . .

# 7. Exponha a porta 3000
EXPOSE 3000

# 8. Defina o comando de inicialização
CMD ["node", "src/index.js"]
