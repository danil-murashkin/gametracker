# Blockly (локально)

Визуальный редактор FSM → `common/rules/rules.json`.  
Копия [Blockly](https://github.com/RaspberryPiFoundation/blockly) 10.x из npm, без CDN.

## Запуск

```powershell
cd editor/blockly
.\start.ps1
```

Скрипт сам откроет браузер: http://localhost:8081

**Не открывайте `index.html` двойным щелчком** — Blockly не загрузится без сервера.

Нужен **Node.js** (`winget install OpenJS.NodeJS.LTS`) или portable Node в `../../.tools/node`.

## Использование

1. **Демо FSM** — загрузить пример (3 состояния, как в `common/rules/rules.json`)
2. **Проверить** — валидация блоков
3. **Скачать** / **Копировать** — сохранить JSON в `common/rules/rules.json`

Порт **8081** (чтобы не конфликтовать с другими сервисами на 8080).

**Block Factory** (создание своих блоков): [../block-factory/](../block-factory/) — порт **8082**.

## Файлы

| Файл | Роль |
|------|------|
| `blocks.js` | Блоки FSM (states, transitions) |
| `export.js` | Сборка и проверка `rules.json` |
| `app.js` | Workspace, UI |
| `server.js` | Статический сервер + `node_modules/blockly` |
