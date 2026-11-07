FROM php:8.5-fpm-alpine
# Instala extensão PDO para conexão com MySQL
RUN docker-php-ext-install pdo pdo_mysql
# Os arquivos PHP vêm via bind mount em tempo de execução (ver docker-compose.yml)
