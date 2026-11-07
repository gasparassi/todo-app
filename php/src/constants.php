<?php

declare(strict_types=1);

/**
 * Constantes para o gerenciamento de tarefas
 */
define('MAX_TITLE_LENGTH', 255);

define('MIN_TITLE_LENGTH', 1);

define('DEFAULT_TITLE', 'Nova Tarefa');

define('DEFAULT_DONE', false);

define('DEFAULT_CREATED_AT', date('Y-m-d H:i:s'));

define('DEFAULT_UPDATED_AT', date('Y-m-d H:i:s'));

/**
 * Códigos de status HTTP
 */
define('HTTP_OK', 200);
define('HTTP_CREATED', 201);
define('HTTP_NO_CONTENT', 204);
define('HTTP_BAD_REQUEST', 400);
define('HTTP_NOT_FOUND', 404);
define('HTTP_METHOD_NOT_ALLOWED', 405);