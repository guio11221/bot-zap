import {comandosInfo, verificarComandoExiste} from '../comandos/comandos.js'
import {consoleErro, criarTexto, corTexto} from '../lib/util.js'
import {Bot} from '../modelos/Bot.js'
import {UsuarioControle} from '../controles/UsuarioControle.js'
import moment from "moment-timezone"
import * as socket from '../baileys/socket.js'
import {obterTipoDeMensagem} from '../baileys/mensagem.js'


export class BotControle{
    constructor(){
        this.bot = new Bot()
    }

    obterCaminhoJSON(){
        return this.bot.caminhoJSON
    }

    async inicializarBot(c, botInfo){
        try{
            let bot = botInfo
            bot.iniciado = moment.now()
            bot.numero_bot = await socket.obterNumeroHost(c)
            await this.bot.atualizarDados(bot)
            console.log("[BOT]", corTexto(comandosInfo(bot).outros.dados_bot))
        }catch(err){
            err.message = `botStart - ${err.message}`
            throw err
        }
    }

    async criarArquivo(){
        const bot = {
            iniciado: 0,
            nome_bot: "{Guii}",
            nome_adm: "Guii Santos",
            nome_pack: "Guizinho Stickers",
            prefixo: "!",
            cmds_executados:0,
            autosticker: false,
            autorevelar: false,
            bloqueio_cmds:[],
            limite_diario:{
                status: false,
                expiracao: 0,
                limite_tipos: {
                    comum : {
                        titulo: '👤 Comum',
                        comandos: 50
                    },
                    premium : {
                        titulo: '🌟 Premium',
                        comandos: 100,
                    },
                    vip : {
                        titulo: '🎖️ VIP',
                        comandos: null
                    },
                    dono : {
                        titulo: '💻 Dono',
                        comandos: null
                    }
                }
            },
            limitecomandos:{
                status: false,
                cmds_minuto_max: 5,
                tempo_bloqueio: 60,
                usuarios: [],
                usuarios_limitados: []
            },
            pvliberado: true
        }

        await this.bot.atualizarDados(bot)
    }

    async atualizarComandosFeitos(){
        await this.bot.atualizarComandos()
    }

    async obterInformacoesBot(){
        try{
            return await this.bot.obterDados()
        }catch{
            await this.criarArquivo()
            return await this.bot.obterDados()
        }
    }

    async verificarLimiteComando(usuario_id, tipo_usuario, isAdmin, botInfo){
        let bot = botInfo
        let resposta = {}
        const timestamp_atual = Math.round(new Date().getTime()/1000)
        const comandos_info = comandosInfo(bot)
        
        //VERIFICA OS USUARIOS LIMITADOS QUE JÁ ESTÃO EXPIRADOS E REMOVE ELES DA LISTA
        for (let i = 0; i < bot.limitecomandos.usuarios_limitados.length; i++){
            if(bot.limitecomandos.usuarios_limitados[i].horario_liberacao <= timestamp_atual) bot.limitecomandos.usuarios_limitados.splice(i,1)
        }

        //VERIFICA OS USUARIOS QUE JÁ ESTÃO COM COMANDO EXPIRADOS NO ULTIMO MINUTO
        for (let i = 0; i < bot.limitecomandos.usuarios.length; i++){
            if(bot.limitecomandos.usuarios[i].expiracao <= timestamp_atual) bot.limitecomandos.usuarios.splice(i,1)
        }

        //SE NÃO FOR UM USUARIO DO TIPO DONO OU FOR ADMINISTRADOR DO GRUPO , NÃO FAÇA A CONTAGEM.
            if(tipo_usuario == "dono" || isAdmin){
            resposta = {comando_bloqueado : false}
        } else {
            //VERIFICA SE O USUARIO ESTÁ LIMITADO
            let usuarioIndexLimitado = bot.limitecomandos.usuarios_limitados.findIndex(usuario=> usuario.usuario_id == usuario_id)
            if(usuarioIndexLimitado != -1) {
                resposta = {comando_bloqueado : true}
            } else {
                //OBTEM O INDICE DO USUARIO NA LISTA DE USUARIOS
                let usuarioIndex = bot.limitecomandos.usuarios.findIndex(usuario=> usuario.usuario_id == usuario_id)
                //VERIFICA SE O USUARIO ESTÁ NA LISTA DE USUARIOS
                if(usuarioIndex != -1){
                    bot.limitecomandos.usuarios[usuarioIndex].cmds++ //ADICIONA A CONTAGEM DE COMANDOS ATUAIS
                    if(bot.limitecomandos.usuarios[usuarioIndex].cmds >= bot.limitecomandos.cmds_minuto_max){ //SE ATINGIR A QUANTIDADE MAXIMA DE COMANDOS POR MINUTO
                        //ADICIONA A LISTA DE USUARIOS LIMITADOS
                        bot.limitecomandos.usuarios_limitados.push({usuario_id, horario_liberacao: timestamp_atual + bot.limitecomandos.tempo_bloqueio})
                        bot.limitecomandos.usuarios.splice(usuarioIndex,1)
                        resposta = {
                            comando_bloqueado: true,
                            msg: criarTexto(comandos_info.admin.taxacomandos.msgs.resposta_usuario_limitado, bot.limitecomandos.tempo_bloqueio)
                        }
                    } else { //SE NÃO ATINGIU A QUANTIDADE MÁXIMA DE COMANDOS
                        resposta = {comando_bloqueado: false}
                    }
                } else {//SE NÃO EXISTIR NA LISTA
                    bot.limitecomandos.usuarios.push({usuario_id, cmds: 1, expiracao: timestamp_atual+60})
                    resposta = {comando_bloqueado: false} 
                }
            }
        }
    
        await this.bot.atualizarDados(bot) //ATUALIZA OS DADOS NO ARQUIVO E RETORNO
        return resposta
    }

    async verificarExpiracaoLimite(botInfo){
        let bot = botInfo
        let timestamp_atual = Math.round(new Date().getTime()/1000)
        if(timestamp_atual >= bot.limite_diario.expiracao){
            await new UsuarioControle().resetarComandosDia()
            bot.limite_diario.expiracao = timestamp_atual + 86400
            await this.bot.atualizarDados(bot)
        } 
    }

    async bloquearComandos(comandos, botInfo){
        let bot = botInfo
        for(let cmd of comandos){
            bot.bloqueio_cmds.push(cmd)
        }
        await this.bot.atualizarDados(bot)
    }

    async desbloquearComandos(comandos, botInfo){
        let bot = botInfo
        for(let cmd of comandos){
            let index = bot.bloqueio_cmds.findIndex(cmd_block=> cmd_block == cmd)
            if(index != -1){
                bot.bloqueio_cmds.splice(index,1)
            }
        }
        await this.bot.atualizarDados(bot)
    }

    async bloquearComandosGlobal(usuarioComandos, botInfo){
        const comandos_info = comandosInfo(botInfo)
        const {prefixo} = botInfo
        let comandosBloqueados = []
        let respostaBloqueio = comandos_info.admin.bcmdglobal.msgs.resposta_titulo
        let categorias = ['figurinhas', 'utilidades', 'downloads', 'diversao']

        if(categorias.includes(usuarioComandos[0])) usuarioComandos = Object.keys(comandos_info[usuarioComandos[0]]).map(comando => prefixo+comando)

        for(let comando of usuarioComandos){
            if(verificarComandoExiste(botInfo, comando, 'utilidades') || verificarComandoExiste(botInfo, comando, 'diversao') || verificarComandoExiste(botInfo, comando, 'figurinhas') || verificarComandoExiste(botInfo, comando, 'downloads')){
                if(botInfo.bloqueio_cmds.includes(comando.replace(prefixo, ''))){
                    respostaBloqueio += criarTexto(comandos_info.admin.bcmdglobal.msgs.resposta_variavel.ja_bloqueado, comando)
                } else {
                    comandosBloqueados.push(comando.replace(prefixo, ''))
                    respostaBloqueio += criarTexto(comandos_info.admin.bcmdglobal.msgs.resposta_variavel.bloqueado_sucesso, comando)
                }
            } else if (verificarComandoExiste(botInfo, comando, 'grupo') || verificarComandoExiste(botInfo, comando, 'admin') || verificarComandoExiste(botInfo, comando, 'info') ){
                respostaBloqueio += criarTexto(comandos_info.admin.bcmdglobal.msgs.resposta_variavel.erro, comando)
            } else {
                respostaBloqueio += criarTexto(comandos_info.admin.bcmdglobal.msgs.resposta_variavel.nao_existe, comando)
            }
        }
        

        if(comandosBloqueados.length != 0) await this.bloquearComandos(comandosBloqueados, botInfo)
        return respostaBloqueio
    }

    async desbloquearComandosGlobal(usuarioComandos, botInfo){
        const comandos_info = comandosInfo(botInfo)
        const {prefixo} = botInfo
        let comandosDesbloqueados = []
        let respostaDesbloqueio = comandos_info.admin.dcmdglobal.msgs.resposta_titulo
        let categorias = ['todos', 'figurinhas', 'utilidades', 'downloads', 'diversao']

        if(categorias.includes(usuarioComandos[0])){
            if(usuarioComandos[0] === 'todos') usuarioComandos = botInfo.bloqueio_cmds.map(comando => prefixo+comando)
            else usuarioComandos = Object.keys(comandos_info[usuarioComandos[0]]).map(comando => prefixo+comando)
        }

        for(let comando of usuarioComandos){
            if(botInfo.bloqueio_cmds.includes(comando.replace(prefixo, ''))) {
                comandosDesbloqueados.push(comando.replace(prefixo, ''))
                respostaDesbloqueio += criarTexto(comandos_info.admin.dcmdglobal.msgs.resposta_variavel.desbloqueado_sucesso, comando)
            } else {
                respostaDesbloqueio += criarTexto(comandos_info.admin.dcmdglobal.msgs.resposta_variavel.ja_desbloqueado, comando)
            }
        }
        
        if(comandosDesbloqueados.length != 0)  await this.desbloquearComandos(comandosDesbloqueados, botInfo)
        return respostaDesbloqueio
    }

    async verificarComandosBloqueadosGlobal(comando, botInfo){
        const {prefixo} = botInfo
        return botInfo.bloqueio_cmds.includes(comando.replace(prefixo, ''))
    }

    async redirecionarMensagemRevelada(c, mensagemBaileys, botInfo){
        try{
            const comandos_info = comandosInfo(botInfo)
            const {mensagem, nome_usuario : nomeUsuario, remetente, mensagem_grupo, tipo, grupo} = mensagemBaileys
            const numeroDono = await new UsuarioControle().obterIdDono()
            const numeroUsuario = remetente.replace("@s.whatsapp.net", '')
            const nomeGrupo = mensagem_grupo ? grupo.nome : '----'
            const tipoMensagem = obterTipoDeMensagem(tipo)
            let mensagemVisivel = mensagem.message
            mensagemVisivel[tipo].viewOnce = false
            const mensagemInfo = await socket.enviarTexto(c, numeroDono, criarTexto(comandos_info.admin.autorevelar.msgs.restransmissao, nomeUsuario, numeroUsuario, nomeGrupo, tipoMensagem))
            await socket.retransmitirMensagem(c, numeroDono, mensagemVisivel, mensagemInfo)
        } catch(err){
            err.message = `redirecionarMensagemRevelada - ${err.message}`
            consoleErro(err, "AUTO-REVELAR")
        }
    }

    async obterNumeroBot(){
        let {numero_bot} = await this.obterInformacoesBot()
        return numero_bot
    }

    async obterNumeroDono(){
        let {numero_dono} = await this.obterInformacoesBot()
        return numero_dono
    }

    async alterarPrefixo(prefixo, botInfo){
        let bot = botInfo
        bot.prefixo = prefixo
        await this.bot.atualizarDados(bot)
    }

    async alterarComandosTipoUsuario(tipo, comandos, botInfo){
        let bot = botInfo
        let tiposAtuais = Object.keys(bot.limite_diario.limite_tipos)
        comandos = (comandos == -1) ? null : comandos
        if(!tiposAtuais.includes(tipo)) return false
        bot.limite_diario.limite_tipos[tipo].comandos = parseInt(comandos)
        await this.bot.atualizarDados(bot)
        return true
    }

    async adicionarTipoUsuario(botInfo, tipo, titulo, comandos){
        let bot = botInfo
        let tiposAtuais = Object.keys(bot.limite_diario.limite_tipos)
        let tipoInserido = tipo.toLowerCase().replaceAll(" ", '')
        if(tiposAtuais.includes(tipoInserido)) return false
        comandos = (comandos == -1) ? null : comandos
        bot.limite_diario.limite_tipos[tipoInserido] = {titulo, comandos : parseInt(comandos)}
        await this.bot.atualizarDados(bot)
        return true
    }

    async alterarTituloTipoUsuario(botInfo, tipo, titulo){
        let bot = botInfo
        let tiposAtuais = Object.keys(bot.limite_diario.limite_tipos)
        let tipoInserido = tipo.toLowerCase().replaceAll(" ", '')
        if(!tiposAtuais.includes(tipoInserido)) return false
        bot.limite_diario.limite_tipos[tipoInserido].titulo = titulo
        await this.bot.atualizarDados(bot)
        return true
    }

    async removerTipoUsuario(botInfo, tipo){
        const tiposNaoRemoviveis = ['comum', 'dono']
        let bot = botInfo
        let tiposAtuais = Object.keys(bot.limite_diario.limite_tipos)
        let tipoInserido = tipo.toLowerCase().replaceAll(" ", '')
        if(!tiposAtuais.includes(tipoInserido)) return false
        if(tiposNaoRemoviveis.includes(tipoInserido)) return false
        delete bot.limite_diario.limite_tipos[tipoInserido]
        await this.bot.atualizarDados(bot)
        return true
    }

    async alterarAutoSticker(status, botInfo){
        let bot = botInfo
        bot.autosticker = status
        await this.bot.atualizarDados(bot)
    }

    async alterarAutoRevelar(status, botInfo){
        let bot = botInfo
        bot.autorevelar = status
        await this.bot.atualizarDados(bot)
    }

    async alterarPvLiberado(status, botInfo){
        let bot = botInfo
        bot.pvliberado = status
        await this.bot.atualizarDados(bot)
    }

    async alterarLimiteDiario(status, botInfo){
        let bot = botInfo
        let timestamp_atual = Math.round(new Date().getTime()/1000)
        bot.limite_diario.expiracao = (status) ? timestamp_atual+86400 : 0
        bot.limite_diario.status = status
        await this.bot.atualizarDados(bot)
    }

    async alterarLimitador(botInfo, status= true, cmds_minuto = 5, tempo_bloqueio= 60){
        let bot = botInfo
        bot.limitecomandos.status = status
        bot.limitecomandos.cmds_minuto_max = cmds_minuto
        bot.limitecomandos.tempo_bloqueio = tempo_bloqueio
        bot.limitecomandos.usuarios = []
        bot.limitecomandos.usuarios_limitados = []
        await this.bot.atualizarDados(bot)
    }

    async alterarNomeBot(nome, botInfo){
        let bot = botInfo
        bot.nome_bot = nome
        await this.bot.atualizarDados(bot)
    }

    async alterarNomeAdm(nome, botInfo){
        let bot = botInfo
        bot.nome_adm = nome
        await this.bot.atualizarDados(bot)
    }

    async alterarNomeFigurinhas(nome, botInfo){
        let bot = botInfo
        bot.nome_pack = nome
        await this.bot.atualizarDados(bot)
    }
}