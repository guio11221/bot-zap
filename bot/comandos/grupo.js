//REQUERINDO MODULOS
import {criarTexto, erroComandoMsg, consoleErro} from '../lib/util.js'
import {GrupoControle} from '../controles/GrupoControle.js'
import * as socket from '../baileys/socket.js'
import {tiposMensagem} from '../baileys/mensagem.js'
import {downloadMediaMessage} from '@whiskeysockets/baileys'
import {comandosInfo} from '../comandos/comandos.js'


export const grupo = async(c, mensagemBaileys, botInfo) => {
    //Atribuição de valores
    const grupos = new GrupoControle()
    const comandos_info = comandosInfo(botInfo)
    const {prefixo, nome_bot, numero_bot} = botInfo
    const { 
        comando,
        args,
        texto_recebido,
        mensagem,
        id_chat,
        remetente,
        mensagem_grupo,
        nome_usuario,
        tipo,
        mensagem_midia,
        mensagem_citada,
        midia,
        grupo,
        citacao,
        mencionados,
    } = mensagemBaileys
    const {mimetype} = {...midia}
    const {id_grupo, dono, participantes, admins, usuario_admin, bot_admin} = {...grupo}
    const comandoSemPrefixo = comando.replace(prefixo, "")

    // Verificação se é mensagem do grupo
    if (!mensagem_grupo) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.grupo, mensagem)
    
    // Comandos de grupo
    try{
        switch(comandoSemPrefixo){
            case 'regras':
                try{
                    let grupoDescricao = grupo.descricao || comandos_info.grupo.regras.msgs.sem_descrição
                    await socket.obterFotoPerfil(c, id_grupo).then(async (grupoFoto)=>{
                        await socket.responderArquivoUrl(c, tiposMensagem.imagem, id_chat, grupoFoto, grupoDescricao, mensagem)
                    }).catch(async ()=>{
                        await socket.responderTexto(c, id_chat, grupoDescricao, mensagem)
                    })
                } catch(err){
                    throw err
                }
                break

            case "fotogrupo":
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin , mensagem)
                    if (!bot_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.bot_admin, mensagem)
                    if(mensagem_midia || mensagem_citada){
                        let dadosMensagem = {
                            tipo : (mensagem_midia) ? tipo : citacao.tipo,
                            mimetype : (mensagem_midia)? mimetype : citacao.mimetype,
                            mensagem: (mensagem_midia) ? mensagem : citacao.mensagem
                        }
                        if(dadosMensagem.tipo == tiposMensagem.imagem){
                            let fotoBuffer = await downloadMediaMessage(dadosMensagem.mensagem, "buffer")
                            await socket.alterarFotoPerfil(c, id_chat, fotoBuffer)
                            await socket.responderTexto(c, id_chat, comandos_info.grupo.fotogrupo.msgs.sucesso, mensagem)
                        } else {
                            return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo) , mensagem)
                        }
                    } else {
                        return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo) , mensagem)
                    }
                } catch(err){
                    throw err
                }
                break
                
            
            case 'status':
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin , mensagem)
                    let resposta = comandos_info.grupo.status.msgs.resposta_titulo
                    //Bem-vindo
                    resposta += (grupo.bemvindo.status) ? comandos_info.grupo.status.msgs.resposta_variavel.bemvindo.on : comandos_info.grupo.status.msgs.resposta_variavel.bemvindo.off
                    //Mutar
                    resposta += (grupo.mutar) ? comandos_info.grupo.status.msgs.resposta_variavel.mutar.on : comandos_info.grupo.status.msgs.resposta_variavel.mutar.off
                    //Auto-Sticker
                    resposta += (grupo.autosticker) ? comandos_info.grupo.status.msgs.resposta_variavel.autosticker.on : comandos_info.grupo.status.msgs.resposta_variavel.autosticker.off
                    //Anti-Link
                    resposta += (grupo.antilink) ? comandos_info.grupo.status.msgs.resposta_variavel.antilink.on : comandos_info.grupo.status.msgs.resposta_variavel.antilink.off
                    //Anti-fake
                    resposta += (grupo.antifake.status) ? criarTexto(comandos_info.grupo.status.msgs.resposta_variavel.antifake.on, grupo.antifake.ddi_liberados.toString()) : comandos_info.grupo.status.msgs.resposta_variavel.antifake.off
                    //Anti-flood
                    resposta += (grupo.antiflood.status) ? criarTexto(comandos_info.grupo.status.msgs.resposta_variavel.antiflood.on, grupo.antiflood.max, grupo.antiflood.intervalo) : comandos_info.grupo.status.msgs.resposta_variavel.antiflood.off 
                    //Contador
                    resposta += (grupo.contador.status) ? criarTexto(comandos_info.grupo.status.msgs.resposta_variavel.contador.on, grupo.contador.inicio) : comandos_info.grupo.status.msgs.resposta_variavel.contador.off
                    //Bloqueio de CMDS
                    let comandosBloqueados = []
                    for (let comandoBloqueado of grupo.block_cmds){
                        comandosBloqueados.push(prefixo+comandoBloqueado)
                    }
                    resposta += (grupo.block_cmds.length != 0) ? criarTexto(comandos_info.grupo.status.msgs.resposta_variavel.bloqueiocmds.on, comandosBloqueados.toString()) : comandos_info.grupo.status.msgs.resposta_variavel.bloqueiocmds.off
                    //Lista Negra
                    resposta += criarTexto(comandos_info.grupo.status.msgs.resposta_variavel.listanegra, grupo.lista_negra.length)
                    await socket.enviarTexto(c, id_chat, resposta)
                } catch(err){
                    throw err
                }
                break
            
            case 'bv':
                try{
                    if (!usuario_admin) return socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin , mensagem)
                    let estadoNovo = !grupo.bemvindo.status
                    if (estadoNovo) {
                        let usuarioMensagem = texto_recebido
                        await grupos.alterarBemVindo(id_grupo, true, usuarioMensagem)
                        await socket.responderTexto(c, id_chat, comandos_info.grupo.bv.msgs.ligado, mensagem)
                    } else {
                        await grupos.alterarBemVindo(id_grupo, false)
                        await socket.responderTexto(c, id_chat, comandos_info.grupo.bv.msgs.desligado, mensagem)
                    }
                } catch(err){
                    throw err
                }
                
                break

            case "addlista":
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin , mensagem)
                    if (!bot_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.bot_admin, mensagem)
                    let blista_numero
                    if(mensagem_citada) blista_numero = citacao.remetente
                    else if(mencionados.length) blista_numero = mencionados[0]
                    else if(args.length) blista_numero = texto_recebido.replace(/\W+/g,"")+"@s.whatsapp.net"
                    else return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    if(blista_numero == numero_bot) return await socket.responderTexto(c, id_chat, comandos_info.grupo.addlista.msgs.bot_erro , mensagem)
                    else if(admins.includes(blista_numero)) return await socket.responderTexto(c, id_chat, comandos_info.grupo.addlista.msgs.admin_erro , mensagem)
                    let blista_grupo_lista = await grupos.obterListaNegra(id_grupo)
                    if(blista_grupo_lista.includes(blista_numero)) return await socket.responderTexto(c, id_chat, comandos_info.grupo.addlista.msgs.ja_listado, mensagem)
                    await grupos.adicionarUsuarioListaNegra(id_grupo, blista_numero)
                    await socket.responderTexto(c, id_chat, comandos_info.grupo.addlista.msgs.sucesso, mensagem)
                    if(participantes.includes(blista_numero)) await socket.removerParticipante(c, id_chat, blista_numero)
                } catch(err){
                    throw err
                }
                break
            
            case "remlista":
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin , mensagem)
                    if (!bot_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.bot_admin, mensagem)
                    if(!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    let dlista_numero = texto_recebido.replace(/\W+/g,"")+"@s.whatsapp.net"
                    let dlista_grupo_lista = await grupos.obterListaNegra(id_grupo)
                    if(!dlista_grupo_lista.includes(dlista_numero)) return await socket.responderTexto(c, id_chat, comandos_info.grupo.remlista.msgs.nao_listado, mensagem)
                    await grupos.removerUsuarioListaNegra(id_grupo, dlista_numero)
                    await socket.responderTexto(c, id_chat, comandos_info.grupo.remlista.msgs.sucesso, mensagem)
                } catch(err){
                    throw err
                }
                break
            
            case "listanegra":
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin , mensagem)
                    if (!bot_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.bot_admin, mensagem)
                    let lista_negra_grupo = await grupos.obterListaNegra(id_grupo), resposta_listanegra = comandos_info.grupo.listanegra.msgs.resposta_titulo
                    if(lista_negra_grupo.length == 0) return await socket.responderTexto(c, id_chat, comandos_info.grupo.listanegra.msgs.lista_vazia, mensagem)
                    for(let usuario_lista of lista_negra_grupo){
                        resposta_listanegra += criarTexto(comandos_info.grupo.listanegra.msgs.resposta_itens, usuario_lista.replace(/@s.whatsapp.net/g, ''))
                    }
                    resposta_listanegra += `╠\n╚═〘 ${nome_bot?.trim()}®〙`
                    await socket.enviarTexto(c, id_chat, resposta_listanegra)
                } catch(err){
                    throw err
                }
                break

            case 'alink':
                try{
                    if (!usuario_admin) return await socket.responderTexto(c,id_chat, comandos_info.outros.permissao.apenas_admin , mensagem)
                    if (!bot_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.bot_admin, mensagem)
                    let estadoNovo = !grupo.antilink
                    if (estadoNovo) {
                        await grupos.alterarAntiLink(id_grupo, true)
                        await socket.responderTexto(c, id_chat, comandos_info.grupo.alink.msgs.ligado, mensagem)
                    } else {
                        await grupos.alterarAntiLink(id_grupo, false)
                        await socket.responderTexto(c, id_chat, comandos_info.grupo.alink.msgs.desligado, mensagem)
                    }
                } catch(err){
                    throw err
                }
                break

            case 'autosticker':
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin , mensagem)
                    let estadoNovo = !grupo.autosticker
                    if (estadoNovo) {
                        await grupos.alterarAutoSticker(id_grupo, true)
                        await socket.responderTexto(c, id_chat, comandos_info.grupo.autosticker.msgs.ligado, mensagem)
                    } else {
                        await grupos.alterarAutoSticker(id_grupo, false)
                        await socket.responderTexto(c, id_chat, comandos_info.grupo.autosticker.msgs.desligado, mensagem)
                    }
                } catch(err){
                    throw err
                }
                break

            case "revelar":
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin , mensagem)
                    if(!mensagem_citada && !citacao.mensagem_vunica) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo) , mensagem)
                    let mensagemVisivel = citacao.mensagem.message
                    mensagemVisivel[citacao.tipo].viewOnce = false
                    await socket.retransmitirMensagem(c, id_chat, mensagemVisivel, mensagem)
                } catch(err){
                    throw err
                }
                break
                    
            case 'rlink':
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin , mensagem)
                    if (!bot_admin) return await socket.responderTexto(c, id_chat,comandos_info.outros.permissao.bot_admin, mensagem)
                    await socket.revogarLinkGrupo(c, id_grupo).then(async ()=>{
                        await socket.responderTexto(c, id_chat, comandos_info.grupo.rlink.msgs.sucesso ,mensagem)}
                    ).catch(async ()=>{
                        await socket.responderTexto(c, id_chat, comandos_info.grupo.rlink.msgs.erro ,mensagem)
                    })
                } catch(err){
                    throw err
                }
                break        

            case 'afake':
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin , mensagem)
                    if (!bot_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.bot_admin, mensagem)
                    let estadoNovo = !grupo.antifake.status
                    if (estadoNovo) {
                        let DDIAutorizados = !args.length ? ["55"] : args
                        await grupos.alterarAntiFake(id_grupo, true, DDIAutorizados)
                        await socket.responderTexto(c, id_chat,  comandos_info.grupo.afake.msgs.ligado, mensagem)
                    } else {
                        await grupos.alterarAntiFake(id_grupo, false)
                        await socket.responderTexto(c, id_chat,  comandos_info.grupo.afake.msgs.desligado, mensagem)
                    } 
                } catch(err){
                    throw err
                }
                break

            case "mutar":
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin , mensagem)
                    let estadoNovo = !grupo.mutar
                    if (estadoNovo) {
                        await grupos.alterarMutar(id_grupo)
                        await socket.responderTexto(c, id_chat, comandos_info.grupo.mutar.msgs.ligado, mensagem)
                    } else {
                        await grupos.alterarMutar(id_grupo,false)
                        await socket.responderTexto(c, id_chat, comandos_info.grupo.mutar.msgs.desligado, mensagem)
                    }
                } catch(err){
                    throw err
                }
                break
                    
            case 'contador':
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin , mensagem)
                    let estadoNovo = !grupo.contador.status
                    let membrosAtuais = grupo.participantes
                    if (estadoNovo) {
                        await grupos.alterarContador(id_grupo)
                        await grupos.registrarContagemGrupo(id_grupo, membrosAtuais)
                        await socket.responderTexto(c, id_chat, comandos_info.grupo.contador.msgs.ligado, mensagem)
                    } else {
                        await grupos.alterarContador(id_grupo, false)
                        await grupos.removerContagemGrupo(id_grupo)
                        await socket.responderTexto(c, id_chat, comandos_info.grupo.contador.msgs.desligado, mensagem)
                    } 
                } catch(err){
                    throw err
                }
                break

            case "atividade":
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin, mensagem)
                    if(!grupo.contador.status) return await socket.responderTexto(c, id_chat, comandos_info.grupo.atividade.msgs.erro_contador, mensagem)
                    let atividadeUsuario
                    if(mensagem_citada){
                        atividadeUsuario = await grupos.obterAtividadeParticipante(id_grupo, citacao.remetente)
                        if(!atividadeUsuario) return await socket.responderTexto(c, id_chat, comandos_info.grupo.atividade.msgs.fora_grupo, mensagem)
                    } else if (mencionados.length === 1){
                        atividadeUsuario = await grupos.obterAtividadeParticipante(id_grupo, mencionados[0])
                        if(!atividadeUsuario) return await socket.responderTexto(c, id_chat, comandos_info.grupo.atividade.msgs.fora_grupo, mensagem)
                    } else {
                        return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    }
                    let atividadeResposta = criarTexto(comandos_info.grupo.atividade.msgs.resposta, atividadeUsuario.msg, atividadeUsuario.texto, atividadeUsuario.imagem, atividadeUsuario.video, atividadeUsuario.sticker, atividadeUsuario.audio, atividadeUsuario.outro)
                    await socket.responderTexto(c, id_chat, atividadeResposta, mensagem)
                } catch(err){
                    throw err
                }
                break

            case "imarcar":
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin , mensagem)
                    if(!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo) , mensagem)
                    let qtdMensagem = texto_recebido
                    if(isNaN(qtdMensagem)) return await socket.responderTexto(c, id_chat, comandos_info.grupo.imarcar.msgs.erro_qtd , mensagem)
                    if(qtdMensagem < 1 || qtdMensagem > 50) return await socket.responderTexto(c, id_chat, comandos_info.grupo.imarcar.msgs.limite_qtd, mensagem)
                    if(!grupo.contador.status) return await socket.responderTexto(c, id_chat, comandos_info.grupo.imarcar.msgs.erro_contador, mensagem)
                    let usuariosInativos = await grupos.obterParticipantesInativos(id_grupo, qtdMensagem)
                    let qtdInativos = usuariosInativos.length
                    if(qtdInativos > 0){
                        let mencionarUsuarios = []
                        let inativosResposta = criarTexto(comandos_info.grupo.imarcar.msgs.resposta_titulo, qtdMensagem, qtdInativos)
                        inativosResposta += `═════════════════\n╠\n`
                        for(let usuario of usuariosInativos){
                            inativosResposta += criarTexto(comandos_info.grupo.imarcar.msgs.resposta_itens, usuario.id_usuario.replace(/@s.whatsapp.net/g, ''), usuario.msg)
                            mencionarUsuarios.push(usuario.id_usuario)
                        }
                        inativosResposta += `╠\n╚═〘 ${nome_bot?.trim()}® 〙`
                        await socket.enviarTextoComMencoes(c, id_chat, inativosResposta, mencionarUsuarios)
                    } else {
                        await socket.responderTexto(c, id_chat, comandos_info.grupo.imarcar.msgs.sem_inativo, mensagem)
                    }
                } catch(err){
                    throw err
                }
                break
                
            case "ibanir":
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin , mensagem)
                    if(!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    let qtdMensagem = texto_recebido
                    if(isNaN(qtdMensagem)) return await socket.responderTexto(c, id_chat, comandos_info.grupo.ibanir.msgs.erro_qtd , mensagem)
                    if(qtdMensagem < 1 || qtdMensagem > 50) return await socket.responderTexto(c, id_chat, comandos_info.grupo.ibanir.msgs.limite_qtd, mensagem)
                    if(!grupo.contador.status) return await socket.responderTexto(c, id_chat, comandos_info.grupo.ibanir.msgs.erro_contador , mensagem)
                    let usuariosInativos = await grupos.obterParticipantesInativos(id_grupo, qtdMensagem), usuariosBanidos = 0
                    if(usuariosInativos.length){
                        for(let usuario of usuariosInativos){
                            if(!admins.includes(usuario.id_usuario) && usuario.id_usuario != numero_bot){
                                await socket.removerParticipante(c, id_chat, usuario.id_usuario)
                                usuariosBanidos++
                            }
                        }
                    } 
                    if(usuariosBanidos) await socket.responderTexto(c, id_chat, criarTexto(comandos_info.grupo.ibanir.msgs.sucesso, usuariosBanidos, qtdMensagem), mensagem)
                    else await socket.responderTexto(c, id_chat, comandos_info.grupo.ibanir.msgs.sem_inativo, mensagem)
                } catch(err){
                    throw err
                }
                break

            case "topativos":
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin , mensagem)
                    if(!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo) , mensagem)
                    let qtdUsuarios = texto_recebido
                    if(isNaN(qtdUsuarios)) return await socket.responderTexto(c, id_chat, comandos_info.grupo.topativos.msgs.erro_qtd , mensagem)
                    if(qtdUsuarios < 1 || qtdUsuarios > 50) return await socket.responderTexto(c, id_chat, comandos_info.grupo.topativos.msgs.limite_qtd , mensagem)
                    if(!grupo.contador.status) return await socket.responderTexto(c, id_chat, comandos_info.grupo.topativos.msgs.erro_contador , mensagem)
                    let usuariosAtivos = await grupos.obterParticipantesAtivos(id_grupo, qtdUsuarios)
                    let usuariosMencionados = []
                    let respostaTop = criarTexto(comandos_info.grupo.topativos.msgs.resposta_titulo, qtdUsuarios)
                    for (let i = 0 ; i < usuariosAtivos.length ; i++){
                        let medalha = ''
                        switch(i+1){
                            case 1:
                                medalha = '🥇'
                            break
                            case 2:
                                medalha = '🥈'
                            break
                            case 3:
                                medalha = '🥉'
                            break
                            default:
                                medalha = ''
                        }
                        respostaTop += criarTexto(comandos_info.grupo.topativos.msgs.resposta_itens, medalha, i+1, usuariosAtivos[i].id_usuario.replace(/@s.whatsapp.net/g, ''), usuariosAtivos[i].msg)
                        usuariosMencionados.push(usuariosAtivos[i].id_usuario)   
                    }
                    respostaTop += `╠\n╚═〘 ${nome_bot?.trim()}® 〙`
                    await socket.enviarTextoComMencoes(c, id_chat, respostaTop, usuariosMencionados)
                } catch(err){
                    throw err
                }
                break
            
            case "enquete":
                try{
                    if(!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo) , mensagem)
                    let [enquetePergunta, ...enqueteOpcoes] = texto_recebido.split(",")
                    if(enqueteOpcoes.length < 2) return await socket.responderTexto(c, id_chat, comandos_info.grupo.enquete.msgs.min_opcao , mensagem)
                    await socket.enviarEnquete(c, id_chat, enquetePergunta, enqueteOpcoes)
                } catch(err){
                    throw err
                }
                break
          
            case 'aflood':
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin , mensagem)
                    if (!bot_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.bot_admin, mensagem)
                    let intervalo = 10, maxMensagem = 10, estadoNovo = !grupo.antiflood.status
                    
                    if(args.length == 2) [maxMensagem, intervalo] = args
                    else if (args.length == 1) [maxMensagem] = args

                    //Filtro - intervalo
                    if(isNaN(intervalo) || intervalo < 10 || intervalo > 60){
                        return await socket.responderTexto(c, id_chat, comandos_info.grupo.aflood.msgs.intervalo,mensagem)
                    }
                    //Filtro - maxMensagem
                    if(isNaN(maxMensagem) || maxMensagem < 5 || maxMensagem > 20){
                        return socket.responderTexto(c, id_chat, comandos_info.grupo.aflood.msgs.max,mensagem)
                    }

                    if(estadoNovo) {
                        await grupos.alterarAntiFlood(id_grupo, true, maxMensagem, intervalo)
                        await socket.responderTexto(c, id_chat, criarTexto(comandos_info.grupo.aflood.msgs.ligado, maxMensagem, intervalo), mensagem)
                    } else {
                        await grupos.alterarAntiFlood(id_grupo, false)
                        await socket.responderTexto(c, id_chat,  comandos_info.grupo.aflood.msgs.desligado, mensagem)
                    }
                } catch(err){
                    throw err
                }
                break
            
            case "bcmd":
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin , mensagem)
                    if(!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo) ,mensagem)
                    let usuarioComandos = args, respostaBloqueio = await grupos.bloquearComandosGrupo(usuarioComandos, id_grupo, botInfo)
                    await socket.responderTexto(c, id_chat, respostaBloqueio, mensagem)
                } catch(err){
                    throw err
                }   
                break
            
            case "dcmd":
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin , mensagem)
                    if(!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo),mensagem)
                    let usuarioComandos = args, respostaDesbloqueio = await grupos.desbloquearComandosGrupo(usuarioComandos, id_grupo, botInfo)
                    await socket.responderTexto(c, id_chat, respostaDesbloqueio, mensagem)
                } catch(err){
                    throw err
                }
                break

            case 'link':
                try{
                    if (!bot_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.bot_admin, mensagem)
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin , mensagem)
                    let linkConvite = await socket.obterLinkGrupo(c, id_grupo)
                    let nome = grupo.nome
                    await socket.enviarLinkComPrevia(c, id_chat, criarTexto(comandos_info.grupo.link.msgs.resposta, nome, linkConvite))
                } catch(err){
                    throw err
                }
                break

            case 'adms':
                try{
                    let usuarioTexto = texto_recebido
                    let respostaMarcar = criarTexto(comandos_info.grupo.adms.msgs.resposta_titulo, admins.length)
                    if(usuarioTexto.length > 0) respostaMarcar += criarTexto(comandos_info.grupo.adms.msgs.mensagem, usuarioTexto)
                    for (let adm of admins) {
                        respostaMarcar += criarTexto(comandos_info.grupo.adms.msgs.resposta_itens, adm.replace(/@s.whatsapp.net/g, ''))
                    }
                    let mensagemAlvo = mensagem_citada ? citacao.mensagem : mensagem
                    await socket.responderComMencoes(c, id_chat, respostaMarcar, admins, mensagemAlvo)
                } catch(err){
                    throw err
                }
                break

            case "dono":
                try{
                    if(dono) await socket.responderComMencoes(c, id_chat, criarTexto(comandos_info.grupo.dono.msgs.resposta, dono.replace("@s.whatsapp.net", "")), [dono], mensagem)
                    else await socket.responderTexto(c, id_chat, comandos_info.grupo.dono.msgs.sem_dono, mensagem)
                } catch(err){
                    throw err
                }
                break

            case 'mt':
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin, mensagem)
                    let usuarioTexto = texto_recebido
                    let respostaMarcar = usuarioTexto.length > 0 ? criarTexto(comandos_info.grupo.mt.msgs.resposta_motivo, participantes.length, usuarioTexto) : criarTexto(comandos_info.grupo.mt.msgs.resposta, participantes.length)
                    await socket.enviarTextoComMencoes(c, id_chat, respostaMarcar, participantes)
                } catch(err){
                    throw err
                }
                break
                
            case 'mm':
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin, mensagem)
                    let membrosMarcados = []
                    let usuarioTexto = texto_recebido
                    for(let membro of participantes){
                        if(!admins.includes(membro)) {
                            membrosMarcados.push(membro)
                        }
                    }
                    if(membrosMarcados.length == 0) return await socket.responderTexto(c, id_chat, comandos_info.grupo.mm.msgs.sem_membros, mensagem)
                    let respostaMarcar = usuarioTexto.length > 0 ? criarTexto(comandos_info.grupo.mm.msgs.resposta_motivo, membrosMarcados.length, usuarioTexto) : criarTexto(comandos_info.grupo.mm.msgs.resposta, membrosMarcados.length)
                    await socket.enviarTextoComMencoes(c, id_chat, respostaMarcar, membrosMarcados)
                } catch(err){
                    throw err
                }
                break  
            
            case 'bantodos':
                try{
                    let verificarDono = remetente == dono
                    if (!verificarDono) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_dono_grupo, mensagem)           
                    if (!bot_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.bot_admin, mensagem)
                    for(let membro of participantes){
                        if (!admins.includes(membro)) await socket.removerParticipante(c, id_grupo, membro)
                    }
                    await socket.responderTexto(c, id_chat, comandos_info.grupo.bantodos.msgs.sucesso, mensagem)
                } catch(err){
                    throw err
                }
                break  
            
            case 'add':
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin, mensagem)
                    if (!bot_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.bot_admin, mensagem)
                    if (!args.length) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    let usuarioNumeros = texto_recebido.split(",")
                    for(let numero of usuarioNumeros){
                        let numeroCompleto = numero.trim().replace(/\W+/g,"")+"@s.whatsapp.net"
                        await socket.adicionarParticipante(c, id_chat, numeroCompleto).then(async (res)=>{
                            if (res.status != 200) await socket.responderTexto(c, id_chat, criarTexto(comandos_info.grupo.add.msgs.add_erro, numeroCompleto.replace("@s.whatsapp.net", "")), mensagem)
                        })
                        .catch(async ()=>{
                            await socket.responderTexto(c, id_chat, criarTexto(comandos_info.grupo.add.msgs.numero_invalido, numeroCompleto.replace("@s.whatsapp.net", "")), mensagem)
                        })
                    }
                } catch(err){
                    throw err
                }
                break

            case 'ban':
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin, mensagem)
                    if (!bot_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.bot_admin, mensagem)
                    let usuariosSelecionados = []
                    if(mencionados.length === 0 && mensagem_citada) usuariosSelecionados.push(citacao.remetente)
                    else if(mencionados.length > 0) usuariosSelecionados = mencionados
                    else return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    let idParticipantesAtuais = participantes
                    for(let usuario of usuariosSelecionados){
                        if(idParticipantesAtuais.includes(usuario)){
                            if(!admins.includes(usuario)){
                                await socket.removerParticipante(c, id_grupo, usuario).then(async ()=>{
                                    if(usuariosSelecionados.length === 1) {
                                        await socket.enviarTextoComMencoes(c, id_chat, criarTexto(comandos_info.outros.resposta_ban, usuario.replace("@s.whatsapp.net", ""), comandos_info.grupo.ban.msgs.motivo, nome_usuario))
                                    }
                                })
                            } else {
                                if(usuariosSelecionados.length === 1) await socket.responderTexto(c, id_chat, comandos_info.grupo.ban.msgs.banir_admin, mensagem)
                            }
                        } else {
                            if(usuariosSelecionados.length === 1) await socket.responderTexto(c, id_chat, comandos_info.grupo.ban.msgs.banir_erro, mensagem)
                        }
                    }   
                } catch(err){
                    throw err
                }
                break

            case 'promover':
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin, mensagem)
                    if (!bot_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.bot_admin, mensagem)
                    let usuariosSelecionados = [], respostaUsuarios = ''
                    if(mencionados.length > 0) usuariosSelecionados = mencionados
                    else if(mensagem_citada) usuariosSelecionados.push(citacao.remetente)
                    else return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    if(usuariosSelecionados.includes(numero_bot)) usuariosSelecionados.splice(usuariosSelecionados.indexOf(numero_bot),1)
                    for(let usuario of usuariosSelecionados){
                        if(!admins.includes(usuario)) {
                            await socket.promoverParticipante(c, id_grupo, usuario)
                            respostaUsuarios += criarTexto(comandos_info.grupo.promover.msgs.sucesso_usuario, usuario.replace("@s.whatsapp.net", ""))
                        } else {
                            respostaUsuarios += criarTexto(comandos_info.grupo.promover.msgs.erro_usuario, usuario.replace("@s.whatsapp.net", ""))
                        }
                    }
                    if(!usuariosSelecionados.length) return await socket.responderTexto(c, id_chat, comandos_info.grupo.promover.msgs.erro_bot, mensagem)
                    await socket.enviarTextoComMencoes(c, id_chat, criarTexto(comandos_info.grupo.promover.msgs.resposta, respostaUsuarios), usuariosSelecionados)
                } catch(err){
                    throw err
                }
                break

            case 'rebaixar':
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin, mensagem)
                    if (!bot_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.bot_admin, mensagem)
                    let usuariosSelecionados = [], respostaUsuarios = ''
                    if(mencionados.length > 0) usuariosSelecionados = mencionados
                    else if(mensagem_citada) usuariosSelecionados.push(citacao.remetente)
                    else return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    if(usuariosSelecionados.includes(numero_bot)) usuariosSelecionados.splice(usuariosSelecionados.indexOf(numero_bot),1)
                    for(let usuario of usuariosSelecionados){
                        if(admins.includes(usuario)) {
                            await socket.rebaixarParticipante(c, id_grupo, usuario)
                            respostaUsuarios += criarTexto(comandos_info.grupo.rebaixar.msgs.sucesso_usuario, usuario.replace("@s.whatsapp.net", ""))
                        } else {
                            respostaUsuarios += criarTexto(comandos_info.grupo.rebaixar.msgs.erro_usuario, usuario.replace("@s.whatsapp.net", ""))
                        }
                    }
                    if(!usuariosSelecionados.length) return await socket.responderTexto(c, id_chat, comandos_info.grupo.rebaixar.msgs.erro_bot, mensagem)
                    await socket.enviarTextoComMencoes(c, id_chat, criarTexto(comandos_info.grupo.rebaixar.msgs.resposta, respostaUsuarios), usuariosSelecionados)
                } catch(err){
                    throw err
                }
                break

            case 'apg':
                try{
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin, mensagem)
                    if (!mensagem_citada) return await socket.responderTexto(c, id_chat, erroComandoMsg(comando, botInfo), mensagem)
                    await socket.deletarMensagem(c, mensagem, mensagem_citada)
                } catch (err){
                    throw err
                }
                break

            case 'restrito':
                try{
                    if (!bot_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.bot_admin, mensagem)
                    if (!usuario_admin) return await socket.responderTexto(c, id_chat, comandos_info.outros.permissao.apenas_admin, mensagem)
                    let estadoNovo = !grupo.restrito_msg
                    await socket.alterarRestricaoGrupo(c, id_grupo, estadoNovo)
                } catch(err){
                    throw err
                }
                break 
        }
    } catch(err){
        await socket.responderTexto(c, id_chat, criarTexto(comandos_info.outros.erro_comando_codigo, comando), mensagem)
        err.message = `${comando} - ${err.message}`
        consoleErro(err, "GRUPO")
    }
}