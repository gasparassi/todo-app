-- init.sql — executado automaticamente na primeira inicialização do MySQL
USE todo_db;

CREATE TABLE IF NOT EXISTS tasks (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    title      VARCHAR(255) NOT NULL,
    done       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tarefas de exemplo
INSERT INTO tasks (title, done, created_at, updated_at) VALUES
    ('Instalar o Docker no Linux Mint', TRUE, NOW(), NOW()),
    ('Subir os containers com docker compose', FALSE, NOW(), NOW()),
    ('Escrever o relatório da atividade', FALSE, NOW(), NOW());
