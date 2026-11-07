<?php

declare(strict_types=1);

/**
 * index.php — API REST simples para gerenciamento de tarefas (ToDo)
 *
 * Rotas:
 *   GET    /api/tasks          → lista todas as tarefas
 *   POST   /api/tasks          → cria nova tarefa  { "title": "..." }
 *   PUT    /api/tasks/{id}     → alterna concluída/pendente
 *   DELETE /api/tasks/{id}     → remove tarefa
 *
 * Constantes:
 *   MAX_TITLE_LENGTH           → comprimento máximo do título
 *   DEFAULT_DONE               → valor padrão para o campo 'done'
 *   MIN_TITLE_LENGTH           → comprimento mínimo do título
 *   DEFAULT_CREATED_AT         → valor padrão para o campo 'created_at'
 *   DEFAULT_UPDATED_AT         → valor padrão para o campo 'updated_at'
 * 
 * Códigos de status HTTP:
 *   HTTP_OK                   → 200
 *   HTTP_CREATED              → 201
 *   HTTP_NO_CONTENT           → 204
 *   HTTP_BAD_REQUEST          → 400
 *   HTTP_NOT_FOUND            → 404
 *   HTTP_METHOD_NOT_ALLOWED   → 405
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/constants.php';

$method = $_SERVER['REQUEST_METHOD'];
$path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Extrai ID opcional de /api/tasks/{id}
if (!preg_match('#^/api/tasks(?:/(\d+))?/?$#', $path, $m)) {
    http_response_code(404);
    echo json_encode(['error' => 'Rota não encontrada']);
    exit;
}
$id = isset($m[1]) ? (int) $m[1] : null;

switch ($method) {

    case 'GET':
        $stmt = $pdo->query('SELECT id, title, done, created_at, updated_at FROM tasks ORDER BY created_at DESC');
        $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($tasks as &$t) {
            $t['id']   = (int) $t['id'];
            $t['done'] = (bool) $t['done'];
            $t['created_at'] = $t['created_at'] ?? DEFAULT_CREATED_AT;
            $t['updated_at'] = $t['updated_at'] ?? DEFAULT_UPDATED_AT;
        }
        http_response_code(HTTP_OK);
        echo json_encode($tasks);
        break;

    case 'POST':
        $title = getDataTitle();
        validateTitle($title);
        $stmt = $pdo->prepare('INSERT INTO tasks (title) VALUES (?)');
        $stmt->execute([$title]);
        http_response_code(HTTP_CREATED);
        echo json_encode(['id' => (int) $pdo->lastInsertId(), 'title' => $title, 'done' => DEFAULT_DONE, 'created_at' => DEFAULT_CREATED_AT, 'updated_at' => DEFAULT_UPDATED_AT]);
        break;

    case 'PUT':
        validateId($id);
        $stmt = $pdo->prepare('UPDATE tasks SET done = NOT done WHERE id = ?');
        $stmt->execute([$id]);
        validateTaskId($stmt->rowCount());
        http_response_code(HTTP_NO_CONTENT);
        echo json_encode(['success' => true]);
        break;

    case 'DELETE':
        validateId($id);
        $stmt = $pdo->prepare('DELETE FROM tasks WHERE id = ?');
        $stmt->execute([$id]);
        validateTaskId($stmt->rowCount());
        http_response_code(HTTP_NO_CONTENT);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(HTTP_METHOD_NOT_ALLOWED);
        echo json_encode(['error' => 'Método não permitido']);
}

function getDataTitle(): string
{
    $data  = json_decode(file_get_contents('php://input'), true);
    $title = trim($data['title'] ?? '');
    return $title;
}

function validateTitle(string $title): void
{
    if ($title === '' || mb_strlen($title) > MAX_TITLE_LENGTH || mb_strlen($title) < MIN_TITLE_LENGTH) {
        http_response_code(HTTP_BAD_REQUEST);
        echo json_encode(['error' => 'O título da tarefa é obrigatório e deve ter entre ' . MIN_TITLE_LENGTH . ' e ' . MAX_TITLE_LENGTH . ' caracteres']);
        exit;
    }
}

function validateId(?int $id): void
{
    if (!$id) {
        http_response_code(HTTP_BAD_REQUEST);
        echo json_encode(['error' => 'ID obrigatório']);
        exit;
    }
}

function validateTaskId(int $countRows): void
{
    if ($countRows === 0) {
        http_response_code(HTTP_NOT_FOUND   );
        echo json_encode(['error' => 'Tarefa não encontrada']);
        exit;
    }
}
