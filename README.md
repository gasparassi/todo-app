# Aplicação ToDo — Ambiente Docker (Nginx + PHP-FPM + MySQL + Front-end)

Ambiente virtual cliente/servidor para desenvolvimento web, montado só com softwares livres e orquestrado com Docker Compose. A aplicação de exemplo é uma lista de tarefas (ToDo) com interface em Bootstrap e uma API REST em PHP.

## Arquitetura

```
Navegador (cliente)
      │  http://localhost:8080
      ▼
┌──────────────┐   /        ┌──────────────┐
│    nginx     │──────────▶│   frontend   │  (HTML/CSS/JS + Bootstrap)
│ (porta 8080) │            └──────────────┘
│              │   /api/*   ┌──────────────┐        ┌──────────────┐
│              │──────────▶│   php-fpm    │──────▶│    mysql     │
└──────────────┘  FastCGI   │  (porta 9000)│  PDO   │ (porta 3306) │
                            └──────────────┘        └──────────────┘
          Todos na rede Docker "todo-network" (bridge)
```

| Serviço | Imagem base | Função |
|---|---|---|
| nginx | nginx:1.31-alpine | Ponto de entrada; encaminha `/` ao front-end e `/api` ao PHP |
| php | php:8.5-fpm-alpine | API REST em PHP com PDO |
| mysql | mysql:8.1 | Armazena as tarefas (volume persistente `mysql_data`) |
| frontend | nginx:1.31-alpine | Serve a interface ToDo (HTML/CSS/JS) |

Só o contêiner `nginx` fica exposto ao computador (porta 8080). Os demais se comunicam pela rede interna, usando o nome do serviço como endereço.

## Estrutura de arquivos

```
todo-app/
├── docker-compose.yml        # define serviços, rede e volume
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf            # proxy reverso: / → frontend, /api → php
├── php/
│   ├── Dockerfile            # PHP-FPM + extensões pdo e pdo_mysql
│   └── src/                  # montado no contêiner (bind mount)
│       ├── constants.php     # limites do título e códigos HTTP
│       ├── db.php            # conexão PDO (lê variáveis de ambiente)
│       └── index.php         # rotas da API
├── mysql/
│   └── init.sql              # cria a tabela e insere tarefas de exemplo
└── frontend/
    ├── Dockerfile            # copia os arquivos para dentro da imagem
    ├── index.html
    ├── style.css
    └── app.js
```

## 1. Instalar o Docker em uma distribuição baseada no Debian

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER
```

Depois, **encerre a sessão e entre novamente** (ou execute `newgrp docker`) para usar o Docker sem `sudo`.

Verifique:

```bash
docker --version
docker compose version
```

> Se o pacote `docker-compose-v2` não for encontrado, instale o Docker pelo repositório oficial (docs.docker.com/engine/install/ubuntu/), usando `noble` no lugar do codinome do Mint.

## 2. Subir o ambiente

Dentro da pasta `todo-app`:

```bash
docker compose up -d --build
```

Na primeira execução, o Docker baixa as imagens base (a do MySQL tem cerca de 800 MB) e constrói as imagens do projeto. Acompanhe o status:

```bash
docker compose ps
```

O MySQL leva cerca de 30 s para ficar `healthy`. O contêiner `php` só é iniciado depois disso. Então acesse no navegador: **http://localhost:8080**

Na primeira execução, o `init.sql` cria a tabela `tasks` e insere 3 tarefas de exemplo.

> O navegador precisa de internet para carregar o Bootstrap e os ícones, que vêm de CDN (jsDelivr).

## 3. Interface web

A interface (pasta `frontend/`) usa **Bootstrap 5.3** e **Bootstrap Icons**. Recursos:

- formulário com validação e contador de caracteres (máx. 255);
- barra de progresso com o percentual de tarefas concluídas;
- filtros **Todas / Pendentes / Concluídas**, com contadores;
- data de criação e etiqueta de situação em cada tarefa;
- janela de confirmação antes de excluir;
- notificações (toasts) de sucesso e de erro;
- tema claro/escuro, com a escolha salva no navegador;
- painel com 80% da largura da tela (100% no celular).

Os arquivos do front-end são **copiados para dentro da imagem** na build. Por isso, depois de alterar `index.html`, `app.js` ou `style.css`, reconstrua o contêiner:

```bash
docker compose up -d --build frontend
```

Em `index.html`, os arquivos são carregados com um número de versão (`app.js?v=2`, `style.css?v=2`). **Aumente esse número** sempre que alterar `app.js` ou `style.css`, para o navegador não usar a cópia antiga em cache.

Já os arquivos PHP chegam ao contêiner por *bind mount*: alterações em `php/src/` valem na hora, sem reconstruir.

## 4. API REST

| Método | Rota | Ação | Resposta de sucesso |
|---|---|---|---|
| GET | `/api/tasks` | Lista as tarefas (mais recentes primeiro) | `200` + lista em JSON |
| POST | `/api/tasks` | Cria uma tarefa (`{"title": "..."}`) | `201` + tarefa criada |
| PUT | `/api/tasks/{id}` | Alterna entre concluída e pendente | `204` |
| DELETE | `/api/tasks/{id}` | Exclui a tarefa | `204` |

Respostas de erro (corpo `{"error": "..."}`):

| Código | Quando |
|---|---|
| `400` | Título vazio ou com mais de 255 caracteres; ID ausente |
| `404` | Rota inexistente ou tarefa não encontrada |
| `405` | Método HTTP não suportado |
| `500` | Falha de conexão com o banco |

Exemplo de tarefa retornada:

```json
{ "id": 1, "title": "Instalar o Docker no Linux Mint", "done": true,
  "created_at": "2026-11-07 14:00:00", "updated_at": "2026-11-07 14:05:00" }
```

## 5. Banco de dados

Tabela `tasks` (banco `todo_db`):

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | INT | Chave primária, auto incremento |
| `title` | VARCHAR(255) | Obrigatório |
| `done` | BOOLEAN | Padrão `FALSE` |
| `created_at` | TIMESTAMP | Preenchido na criação |
| `updated_at` | TIMESTAMP | Atualizado automaticamente a cada alteração |

As credenciais (`todo_user` / `todo_pass`) vêm das variáveis de ambiente do `docker-compose.yml`. A API usa consultas preparadas (PDO), o que evita injeção de SQL.

## 6. Testes úteis (bons para prints do relatório)

```bash
# Listar os contêineres em execução
docker compose ps

# Testar a API diretamente
curl http://localhost:8080/api/tasks

# Criar uma tarefa pela API (espera-se o status 201 Created)
curl -i -X POST http://localhost:8080/api/tasks \
     -H "Content-Type: application/json" \
     -d '{"title":"Tarefa criada via curl"}'

# Alternar a tarefa 1 entre concluída e pendente (espera-se 204 No Content)
curl -i -X PUT http://localhost:8080/api/tasks/1

# Consultar o banco dentro do contêiner MySQL
docker exec -it todo_mysql mysql -u todo_user -ptodo_pass todo_db -e "SELECT * FROM tasks;"

# Ver os logs de um serviço
docker compose logs nginx
docker compose logs php
docker compose logs mysql
```

## 7. Parar, reiniciar e começar do zero

```bash
docker compose down        # para e remove os contêineres e a rede (dados preservados)
docker compose down -v     # remove também o volume do MySQL (APAGA todas as tarefas)
```

> O `init.sql` só roda quando o volume do MySQL está vazio. Se alterá-lo, use `docker compose down -v` antes de subir novamente.

Para simular uma **primeira execução** (apaga os dados e as imagens do projeto, e baixa o MySQL de novo):

```bash
docker compose down -v --rmi all
docker compose up -d --build
```

> `--rmi all` remove as imagens usadas pelo projeto, inclusive `mysql:8.1`. O cache de build do Docker é mantido, então a construção das imagens pode ser mais rápida que numa máquina nova.

## Solução de problemas

| Sintoma | Causa provável | Solução |
|---|---|---|
| Porta 8080 em uso | Outro serviço usa a porta | Troque `"8080:80"` por `"8081:80"` no compose |
| Erro de conexão com o banco | MySQL ainda inicializando | Aguarde e recarregue; veja `docker compose logs mysql` |
| `permission denied` no docker.sock | Usuário fora do grupo docker | `sudo usermod -aG docker $USER` e entre de novo na sessão |
| 502 Bad Gateway | Contêiner php parado | `docker compose logs php` |
| Erro 500 `Unknown column` | Tabela criada com esquema antigo | `docker compose down -v` e subir de novo (apaga os dados) |
| Página com aparência antiga ou contadores zerados | Navegador usando `app.js`/`style.css` em cache | Recarregue com **Ctrl+F5** e aumente o `?v=` em `index.html` |
| Alteração no front-end não aparece | Arquivos ficam dentro da imagem | `docker compose up -d --build frontend` |
| Página sem estilo (sem Bootstrap) | Sem acesso à internet/CDN | Verifique a conexão |

> As senhas no `docker-compose.yml` são apenas para ambiente acadêmico/local. Não use em produção.
