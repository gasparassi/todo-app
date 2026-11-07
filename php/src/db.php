<?php
/**
 * db.php — Conexão com o banco de dados via PDO
 * Lê credenciais das variáveis de ambiente definidas no docker-compose.yml
 */

$host   = getenv('DB_HOST') ?: 'mysql';
$dbname = getenv('DB_NAME') ?: 'todo_db';
$user   = getenv('DB_USER') ?: 'todo_user';
$pass   = getenv('DB_PASS') ?: 'todo_pass';

try {
    $pdo = new PDO(
        "mysql:host={$host};dbname={$dbname};charset=utf8mb4",
        $user,
        $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    http_response_code(500);  // Erro de conexão com o banco de dados
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Erro de conexão com o banco de dados']);
    exit;
}
