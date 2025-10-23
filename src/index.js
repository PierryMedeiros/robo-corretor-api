const express = require('express');
const { exec, spawn } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const execPromise = util.promisify(exec);

const jobQueue = [];
let isProcessing = false;

const WORKSPACE_DIR = path.join(__dirname, '../workspace');

app.use(express.json());

app.post('/corrigir', (req, res) => {
    const { repo_url, enunciado } = req.body;

    if (!repo_url || !enunciado) {
        return res.status(400).json({ error: 'repo_url e enunciado são obrigatórios.' });
    }

    console.log(`Nova requisição recebida para o repositório: ${repo_url}`);

    const jobPromise = new Promise((resolve, reject) => {
        jobQueue.push({ repo_url, enunciado, resolve, reject });
        console.log(`Trabalho adicionado à fila. Tamanho da fila: ${jobQueue.length}`);
        processQueue();
    });

    jobPromise
        .then(result => res.status(200).json(result))
        .catch(error => {
            console.error('Erro na Promise do trabalho:', error);
            res.status(500).json({ error: error.message || 'Erro interno no servidor' });
        });
});

async function processQueue() {
    if (isProcessing || jobQueue.length === 0) {
        return;
    }

    isProcessing = true;
    const job = jobQueue.shift();
    console.log(`Processando trabalho para o repositório: ${job.repo_url}. Trabalhos restantes na fila: ${jobQueue.length}`);

    try {
        const result = await runCorrection(job.repo_url, job.enunciado);
        job.resolve(result);
    } catch (error) {
        console.error(`Erro ao processar ${job.repo_url}:`, error);
        job.reject(error);
    } finally {
        isProcessing = false;
        console.log('Processamento finalizado. Verificando a fila...');
        processQueue();
    }
}

async function runCorrection(repoUrl, enunciado) {
    console.log(`Iniciando correção para: ${repoUrl}`);

    const promptLines = [
        'Você é um corretor de código sênior e sua função é corrigir desafios de programação.',
        'Sua tarefa é analisar o código do projeto que está no diretório atual e fornecer uma devolutiva se o aluno está APROVADO ou REPROVADO, com base no enunciado do desafio fornecido abaixo.',
        '',
        'REGRAS IMPORTANTES:',
        '1.  Sua análise deve ser puramente ESTÁTICA, baseada apenas na leitura dos arquivos de código.',
        '2.  Você NÃO DEVE, sob NENHUMA circunstância, tentar compilar, executar, ou rodar qualquer comando no terminal (como \'go run\', \'npm install\', etc.). A ferramenta \'run_shell_command\' não deve ser usada.',
        '3.  Se o aluno não atender a todos os requisitos do enunciado, você deve REPROVAR. Se ele atender, APROVE.',
        '4.  Sua resposta final DEVE ser um único bloco de código JSON, sem nenhum texto, explicação ou ```json antes ou depois. Siga este formato à risca:',
        '    {',
        '      "status": "APROVADO" ou "REPROVADO",',
        '      "feedback": "Escreva aqui sua devolutiva para o aluno. Seja educado, direto e justifique sua decisão com base nos arquivos que você leu."',
        '    }',
        '',
        '---',
        '# ENUNCIADO DO DESAFIO',
        '---',
        enunciado
    ];
    const promptTemplate = promptLines.join('\n');

    try {
        await fs.rm(WORKSPACE_DIR, { recursive: true, force: true });
        await fs.mkdir(WORKSPACE_DIR, { recursive: true });

        console.log(`Clonando repositório...`);
        await execPromise(`git clone --depth 1 ${repoUrl} .`, { cwd: WORKSPACE_DIR });
        console.log(`Repositório clonado com sucesso.`);

        console.log('Executando a análise do Gemini...');
        const geminiResult = await new Promise((resolve, reject) => {
            const geminiProcess = spawn('gemini', ['-m', 'gemini-2.5-pro', '-o', 'json'], { cwd: WORKSPACE_DIR, shell: false });
            let stdoutData = '';
            let stderrData = '';
            geminiProcess.stdout.on('data', (data) => { stdoutData += data.toString(); });
            geminiProcess.stderr.on('data', (data) => { stderrData += data.toString(); });
            geminiProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Processo do Gemini encerrou com código ${code}. Stderr: ${stderrData}`));
                } else {
                    resolve(stdoutData);
                }
            });
            geminiProcess.on('error', (err) => { reject(new Error(`Falha ao iniciar o processo do Gemini: ${err.message}`)); });
            geminiProcess.stdin.write(promptTemplate);
            geminiProcess.stdin.end();
        });
        console.log('Análise do Gemini concluída.');

        const outerJsonMatch = geminiResult.match(/\{[\s\S]*\}/);
        if (!outerJsonMatch) {
            throw new Error(`Resposta da Gemini CLI não contém JSON válido. Saída recebida: ${geminiResult}`);
        }
        const analysisResult = JSON.parse(outerJsonMatch[0]);

        // ================== INÍCIO DA CORREÇÃO ==================
        if (analysisResult && typeof analysisResult.response === 'string') {
            const innerResponseString = analysisResult.response;
            
            // Procura pelo JSON dentro da string de resposta, ignorando o ```json
            const innerJsonMatch = innerResponseString.match(/\{[\s\S]*\}/);

            if (innerJsonMatch) {
                try {
                    // Faz o parse do JSON que foi encontrado
                    return JSON.parse(innerJsonMatch[0]);
                } catch (e) {
                    console.error("A resposta interna parecia JSON mas falhou no parse:", e.message);
                    return {
                        status: "ERRO_DE_ANALISE",
                        feedback: `A IA retornou um JSON mal formatado. Resposta bruta: ${innerResponseString}`
                    };
                }
            } else {
                 // Se não encontrou nem mesmo um padrão de JSON
                 return {
                    status: "ERRO_DE_ANALISE",
                    feedback: `A IA retornou um formato inesperado (não JSON). Resposta bruta: ${innerResponseString}`
                };
            }
        }
        // =================== FIM DA CORREÇÃO ===================
        
        return analysisResult;

    } catch (error) {
        console.error('Ocorreu um erro durante a execução da correção:', error.message);
        const stderr = error.stderr ? error.stderr.trim() : 'N/A';
        throw new Error(`Falha na correção: ${error.message}. Detalhes do erro (stderr): ${stderr}`);
    } finally {
        await fs.rm(WORKSPACE_DIR, { recursive: true, force: true }).catch(err => {
            console.error(`Aviso: Erro não fatal ao limpar o diretório ${WORKSPACE_DIR}:`, err.message);
        });
        console.log(`Limpeza final do diretório de workspace concluída.`);
    }
}

app.listen(PORT, () => {
    console.log(`Servidor de correção rodando na porta ${PORT}`);
});