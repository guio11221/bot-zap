import moment from "moment-timezone";
import { comandosInfo } from '../comandos/comandos.js';
import chalk from 'chalk';
import { BotControle } from '../controles/BotControle.js';
import { UsuarioControle } from "../controles/UsuarioControle.js";
import path from 'node:path';
import fs from 'fs-extra';

export const erroComandoMsg = (comando, botInfo) => {
    const comandos_info = comandosInfo(botInfo);
    return criarTexto(comandos_info.outros.cmd_erro, comando, comando);
};

export const versaoAtual = () => {
    return JSON.parse(fs.readFileSync(path.resolve('package.json'))).version;
};

export const corTexto = (texto, cor) => {
    return cor ? chalk.hex(cor)(texto) : chalk.green(texto);
};

export const criarTexto = (texto, ...params) => {
    params.forEach((param, i) => {
        texto = texto.replace(`{p${i + 1}}`, param);
    });
    return texto;
};

export const timestampParaData = (timestampMsg) => {
    return moment(timestampMsg).format('DD/MM HH:mm:ss');
};

export const dataHoraAtual = () => {
    return moment(Date.now()).format('DD/MM HH:mm:ss');
};

export const obterTempoRespostaSeg = (timestampMensagem) => {
    const tResposta = moment.now() - timestampMensagem;
    return (tResposta / 1000).toFixed(2);
};

export const consoleComando = (isGroup, categoria, comando, hex, timestampMsg, nomeUsuario, nomeChat) => {
    const tMensagem = timestampParaData(timestampMsg);
    const tResposta = obterTempoRespostaSeg(timestampMsg);
    const logMsg = isGroup
        ? `[GRUPO - ${categoria}] ${tMensagem} ${comando} de ${nomeUsuario} em ${nomeChat} (${tResposta}s)`
        : `[PRIVADO - ${categoria}] ${tMensagem} ${comando} de ${nomeUsuario} (${tResposta}s)`;
    
    console.log('\x1b[1;31m~\x1b[1;37m>', corTexto(logMsg, hex));
};

export const primeiraLetraMaiuscula = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

export const removerNegritoComando = (comando) => {
    return comando.replace(/\*/gm, "").trim();
};

export const obterNomeAleatorio = (ext = '') => {
    return `${Math.floor(Math.random() * 10000)}${ext}`;
};

export const delayAleatorio = (minDelayMs, maxDelayMs) => {
    return new Promise((resolve) => {
        const delay = Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
        setTimeout(resolve, delay);
    });
};

export const consoleErro = (msg, tipo_erro = "API") => {
    console.error(corTexto(`[${tipo_erro}]`, "#d63e3e"), msg);
};

export const criacaoEnv = async () => {
    const envContent = `
# CONFIGURAÇÃO DE API KEYS PARA COMANDOS

# ACRCLOUD - Coloque abaixo suas chaves do ACRCloud (Reconhecimento de Músicas)
acr_host=??????
acr_access_key=??????
acr_access_secret=??????

# DEEPGRAM - Coloque abaixo sua chave do DEEPGRAM (Transcrição de aúdio para texto)
dg_secret_key=??????
    `;
    await fs.writeFile(path.resolve('.env'), envContent.trim(), 'utf8');
};

export const verificarEnv = async () => {
    try {
        const respostas = {
            acrcloud: {
                resposta: process.env.acr_host?.trim() === "??????" || process.env.acr_access_key?.trim() === "??????" || process.env.acr_access_secret?.trim() === "??????"
                    ? "A API do ACRCloud ainda não foi configurada corretamente"
                    : "✓ API ACRCloud configurada.",
                cor_resposta: process.env.acr_host?.trim() === "??????" || process.env.acr_access_key?.trim() === "??????" || process.env.acr_access_secret?.trim() === "??????"
                    ? "#d63e3e"
                    : false
            },
            deepgram: {
                resposta: process.env.dg_secret_key?.trim() === "??????"
                    ? "A API do DEEPGRAM ainda não foi configurada"
                    : "✓ API DEEPGRAM configurada.",
                cor_resposta: process.env.dg_secret_key?.trim() === "??????"
                    ? "#d63e3e"
                    : false
            }
        };

        console.log("[ENV]", corTexto(respostas.acrcloud.resposta, respostas.acrcloud.cor_resposta));
        console.log("[ENV]", corTexto(respostas.deepgram.resposta, respostas.deepgram.cor_resposta));
    } catch (err) {
        err.message = `verificarEnv - ${err.message}`;
        throw err;
    }
};

export const verificarNumeroDono = async () => {
    const numero_dono = await new UsuarioControle().obterIdDono();
    const resposta = numero_dono
        ? "✓ Número do DONO configurado."
        : "O número do DONO ainda não foi configurado, digite !admin para cadastrar seu número como dono.";
    const cor_resposta = numero_dono ? false : "#d63e3e";

    console.log("[DONO]", corTexto(resposta, cor_resposta));
};

export const criarArquivosNecessarios = async () => {
    try {
        const bot = new BotControle();
        const existePastaDados = fs.pathExistsSync(path.resolve("dados"));
        const existeBotJson = fs.existsSync(bot.obterCaminhoJSON());
        const existeEnv = fs.existsSync(path.resolve('.env'));

        if (!existePastaDados) fs.mkdirSync(path.resolve("dados"), { recursive: true });
        if (!existeBotJson) await bot.criarArquivo();
        if (!existeEnv) await criacaoEnv();
    } catch (err) {
        throw new Error(err);
    }
};
