# Ferramentas — Else_chat

Manual dos comandos deste repositório. O `./tools.sh` lê os blocos `<!-- ferramenta -->` abaixo e monta o menu navegável com as setas.

No menu: seta para cima e para baixo mudam o item, Enter executa, seta para a esquerda volta.

## Git

### Ver o que mudou

Mostra quais arquivos foram criados, alterados ou apagados e se ainda falta salvar ou enviar.

Comando: `git status`

### Ver a diferença linha a linha

Mostra o texto que mudou nos arquivos, antes de salvar no histórico.

Comando: `git diff`

### Ver os últimos salvamentos

Lista os 15 últimos pontos salvos no histórico, do mais novo para o mais antigo.

Comando: `git log --oneline -15`

### Salvar as alterações neste computador

Junta tudo que mudou nesta pasta e grava um ponto no histórico local. Ainda não envia para a nuvem.

Comando: `git add -A && git commit -m "$RESPOSTA"`

### Baixar o que está na nuvem

Traz para este computador os commits que já estão no GitHub.

Comando: `git pull`

### Enviar para a nuvem

Envia os salvamentos locais da branch atual para o GitHub.

Comando: `git push -u origin HEAD`

<!-- ferramenta
categoria: Git
titulo: Ver o que mudou
comando: git status
explica: Mostra quais arquivos foram criados, alterados ou apagados e se ainda falta salvar ou enviar.
confirma: nao
pergunta: 
-->

<!-- ferramenta
categoria: Git
titulo: Ver a diferença linha a linha
comando: git diff
explica: Mostra o texto que mudou nos arquivos, antes de salvar no histórico.
confirma: nao
pergunta: 
-->

<!-- ferramenta
categoria: Git
titulo: Ver os últimos salvamentos
comando: git log --oneline -15
explica: Lista os 15 últimos pontos salvos no histórico, do mais novo para o mais antigo.
confirma: nao
pergunta: 
-->

<!-- ferramenta
categoria: Git
titulo: Salvar as alterações neste computador
comando: git add -A && git commit -m "$RESPOSTA"
explica: Junta tudo que mudou nesta pasta e grava um ponto no histórico local. Ainda não envia para a nuvem.
confirma: sim
pergunta: Mensagem curta do que você mudou
-->

<!-- ferramenta
categoria: Git
titulo: Baixar o que está na nuvem
comando: git pull
explica: Traz para este computador os commits que já estão no GitHub.
confirma: sim
pergunta: 
-->

<!-- ferramenta
categoria: Git
titulo: Enviar para a nuvem
comando: git push -u origin HEAD
explica: Envia os salvamentos locais da branch atual para o GitHub.
confirma: sim
pergunta: 
-->


## Docker

### Subir o ambiente

Liga os serviços deste projeto em segundo plano. Arquivo usado: codatendechat-main/docker-compose.yml. Outros arquivos encontrados: codatendechat-main/docker-compose.yml, codatendechat-main/backend/docker-compose.databases.yml, codatendechat-main/backend/docker-compose.yml.

Comando: `docker compose -f "codatendechat-main/docker-compose.yml" up -d`

### Ver o que está ligado

Lista os containers deste projeto e se estão rodando ou parados.

Comando: `docker compose -f "codatendechat-main/docker-compose.yml" ps`

### Ver os logs ao vivo

Acompanha o que os containers estão escrevendo. Para sair dos logs, pressione Ctrl+C. O menu volta em seguida.

Comando: `docker compose -f "codatendechat-main/docker-compose.yml" logs -f --tail 80`

### Reiniciar os serviços

Desliga e liga de novo os containers, sem apagar os dados dos volumes.

Comando: `docker compose -f "codatendechat-main/docker-compose.yml" restart`

### Desligar o ambiente

Para e remove os containers deste projeto. Volumes nomeados em geral permanecem.

Comando: `docker compose -f "codatendechat-main/docker-compose.yml" down`

<!-- ferramenta
categoria: Docker
titulo: Subir o ambiente
comando: docker compose -f "codatendechat-main/docker-compose.yml" up -d
explica: Liga os serviços deste projeto em segundo plano. Arquivo usado: codatendechat-main/docker-compose.yml. Outros arquivos encontrados: codatendechat-main/docker-compose.yml, codatendechat-main/backend/docker-compose.databases.yml, codatendechat-main/backend/docker-compose.yml.
confirma: sim
pergunta: 
-->

<!-- ferramenta
categoria: Docker
titulo: Ver o que está ligado
comando: docker compose -f "codatendechat-main/docker-compose.yml" ps
explica: Lista os containers deste projeto e se estão rodando ou parados.
confirma: nao
pergunta: 
-->

<!-- ferramenta
categoria: Docker
titulo: Ver os logs ao vivo
comando: docker compose -f "codatendechat-main/docker-compose.yml" logs -f --tail 80
explica: Acompanha o que os containers estão escrevendo. Para sair dos logs, pressione Ctrl+C. O menu volta em seguida.
confirma: nao
pergunta: 
-->

<!-- ferramenta
categoria: Docker
titulo: Reiniciar os serviços
comando: docker compose -f "codatendechat-main/docker-compose.yml" restart
explica: Desliga e liga de novo os containers, sem apagar os dados dos volumes.
confirma: sim
pergunta: 
-->

<!-- ferramenta
categoria: Docker
titulo: Desligar o ambiente
comando: docker compose -f "codatendechat-main/docker-compose.yml" down
explica: Para e remove os containers deste projeto. Volumes nomeados em geral permanecem.
confirma: sim
pergunta: 
-->


## Deploy

### Sem script de deploy nesta pasta

Não há deploy.sh na raiz nem em scripts/. Publicar, se existir, está em outro lugar ou ainda não foi automatizado.

<!-- ferramenta
categoria: Deploy
titulo: Sem script de deploy nesta pasta
comando: 
explica: Não há deploy.sh na raiz nem em scripts/. Publicar, se existir, está em outro lugar ou ainda não foi automatizado.
confirma: nao
pergunta: 
-->
