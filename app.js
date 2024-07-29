// REQUERINDO MÓDULOS
import { makeWASocket, useMultiFileAuthState, fetchLatestWaWebVersion } from '@whiskeysockets/baileys';
import * as eventosSocket from './bot/baileys/eventosSocket.js';
import { BotControle } from './bot/controles/BotControle.js';
import { MensagemControle } from './bot/controles/MensagemControle.js';
import configSocket from './bot/baileys/configSocket.js';
import moment from "moment-timezone";
import NodeCache from 'node-cache';
moment.tz.setDefault('America/Sao_Paulo');

// Cache de tentativa de envios
const cacheTentativasEnvio = new NodeCache();

async function connectToWhatsApp() {
    let inicializacaoCompleta = false, eventosEsperando = [];
    const { state: estadoAuth, saveCreds } = await useMultiFileAuthState('sessao');
    let { version: versaoWaWeb } = await fetchLatestWaWebVersion();
    const c = makeWASocket(configSocket(estadoAuth, cacheTentativasEnvio, versaoWaWeb));
    const bot = new BotControle();

    // Limpando mensagens armazenadas da sessão anterior
    await new MensagemControle().limparMensagensArmazenadas();
    
    // Escutando novos eventos
    c.ev.process(async (events) => {
        // Obtendo dados do bot
        const botInfo = await bot.obterInformacoesBot();

        // Atualização na conexão
        if (events['connection.update']) {
            const update = events['connection.update'];
            const { connection } = update;
            let necessarioReconectar = false;
            if (connection === 'open') {
                await eventosSocket.conexaoAberta(c, botInfo);
                inicializacaoCompleta = await eventosSocket.atualizacaoDadosGrupos(c, botInfo);
                await eventosSocket.realizarEventosEspera(c, eventosEsperando);
            } else if (connection === 'close') {
                necessarioReconectar = await eventosSocket.conexaoEncerrada(update, botInfo);
            }
            if (necessarioReconectar) connectToWhatsApp();
        }

        // Atualização nas credenciais
        if (events['creds.update']) {
            await saveCreds();
        }

        // Ao receber novas mensagens
        if (events['messages.upsert']) {
            const m = events['messages.upsert'];
            if (inicializacaoCompleta) await eventosSocket.receberMensagem(c, m, botInfo);
            else eventosEsperando.push({ evento: 'messages.upsert', dados: m });
        }

        // Ao haver mudanças nos participantes de um grupo
        if (events['group-participants.update']) {
            const atualizacao = events['group-participants.update'];
            if (inicializacaoCompleta) await eventosSocket.atualizacaoParticipantesGrupo(c, atualizacao, botInfo);
            else eventosEsperando.push({ evento: 'group-participants.update', dados: atualizacao });
        }

        // Ao ser adicionado em novos grupos
        if (events['groups.upsert']) {
            const grupo = events['groups.upsert'];
            if (inicializacaoCompleta) await eventosSocket.adicionadoEmGrupo(c, grupo, botInfo);
            else eventosEsperando.push({ evento: 'groups.upsert', dados: grupo });
        }

        // Ao atualizar dados do grupo
        if (events['groups.update']) {
            const grupos = events['groups.update'];
            if (grupos.length === 1 && grupos[0].participants === undefined) {
                if (inicializacaoCompleta) await eventosSocket.atualizacaoDadosGrupo(grupos[0]);
                else eventosEsperando.push({ evento: 'groups.update', dados: grupos });
            }
        }

        // Todos os outros eventos possíveis
        // if (events['chats.upsert']) {
        //     const chats = events['chats.upsert'];
        //     if (inicializacaoCompleta) await eventosSocket.chatsUpsert(c, chats, botInfo);
        //     else eventosEsperando.push({ evento: 'chats.upsert', dados: chats });
        // }

        // if (events['chats.update']) {
        //     const updates = events['chats.update'];
        //     if (inicializacaoCompleta) await eventosSocket.chatsUpdate(c, updates, botInfo);
        //     else eventosEsperando.push({ evento: 'chats.update', dados: updates });
        // }

        // if (events['chats.delete']) {
        //     const ids = events['chats.delete'];
        //     if (inicializacaoCompleta) await eventosSocket.chatsDelete(c, ids, botInfo);
        //     else eventosEsperando.push({ evento: 'chats.delete', dados: ids });
        // }

        // if (events['contacts.upsert']) {
        //     const contacts = events['contacts.upsert'];
        //     if (inicializacaoCompleta) await eventosSocket.contactsUpsert(c, contacts, botInfo);
        //     else eventosEsperando.push({ evento: 'contacts.upsert', dados: contacts });
        // }

        // if (events['contacts.update']) {
        //     const contacts = events['contacts.update'];
        //     if (inicializacaoCompleta) await eventosSocket.contactsUpdate(c, contacts, botInfo);
        //     else eventosEsperando.push({ evento: 'contacts.update', dados: contacts });
        // }

        // if (events['messages.delete']) {
        //     const data = events['messages.delete'];
        //     if (inicializacaoCompleta) await eventosSocket.messagesDelete(c, data, botInfo);
        //     else eventosEsperando.push({ evento: 'messages.delete', dados: data });
        // }

        // if (events['messages.update']) {
        //     const updates = events['messages.update'];
        //     if (inicializacaoCompleta) await eventosSocket.messagesUpdate(c, updates, botInfo);
        //     else eventosEsperando.push({ evento: 'messages.update', dados: updates });
        // }

        // if (events['messages.media-update']) {
        //     const updates = events['messages.media-update'];
        //     if (inicializacaoCompleta) await eventosSocket.messagesMediaUpdate(c, updates, botInfo);
        //     else eventosEsperando.push({ evento: 'messages.media-update', dados: updates });
        // }

        // if (events['messages.reaction']) {
        //     const reactions = events['messages.reaction'];
        //     if (inicializacaoCompleta) await eventosSocket.messagesReaction(c, reactions, botInfo);
        //     else eventosEsperando.push({ evento: 'messages.reaction', dados: reactions });
        // }

        // if (events['message-receipt.update']) {
        //     const updates = events['message-receipt.update'];
        //     if (inicializacaoCompleta) await eventosSocket.messageReceiptUpdate(c, updates, botInfo);
        //     else eventosEsperando.push({ evento: 'message-receipt.update', dados: updates });
        // }

        // if (events['presence.update']) {
        //     const presence = events['presence.update'];
        //     if (inicializacaoCompleta) await eventosSocket.presenceUpdate(c, presence, botInfo);
        //     else eventosEsperando.push({ evento: 'presence.update', dados: presence });
        // }

        // if (events['call']) {
        //     const calls = events['call'];
        //     if (inicializacaoCompleta) await eventosSocket.call(c, calls, botInfo);
        //     else eventosEsperando.push({ evento: 'call', dados: calls });
        // }

        // if (events['blocklist.set']) {
        //     const data = events['blocklist.set'];
        //     if (inicializacaoCompleta) await eventosSocket.blocklistSet(c, data, botInfo);
        //     else eventosEsperando.push({ evento: 'blocklist.set', dados: data });
        // }

        // if (events['blocklist.update']) {
        //     const data = events['blocklist.update'];
        //     if (inicializacaoCompleta) await eventosSocket.blocklistUpdate(c, data, botInfo);
        //     else eventosEsperando.push({ evento: 'blocklist.update', dados: data });
        // }

        // if (events['labels.edit']) {
        //     const label = events['labels.edit'];
        //     if (inicializacaoCompleta) await eventosSocket.labelsEdit(c, label, botInfo);
        //     else eventosEsperando.push({ evento: 'labels.edit', dados: label });
        // }

        // if (events['labels.association']) {
        //     const association = events['labels.association'];
        //     if (inicializacaoCompleta) await eventosSocket.labelsAssociation(c, association, botInfo);
        //     else eventosEsperando.push({ evento: 'labels.association', dados: association });
        // }

        // if (events['group.join-request']) {
        //     const request = events['group.join-request'];
        //     if (inicializacaoCompleta) await eventosSocket.groupJoinRequest(c, request, botInfo);
        //     else eventosEsperando.push({ evento: 'group.join-request', dados: request });
        // }
    });
}

// Execução principal
connectToWhatsApp();
