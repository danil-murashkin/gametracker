# Blockly Block Factory (локально)

Официальный **Blockly Developer Tools / Block Factory** из [blockly-samples](https://github.com/RaspberryPiFoundation/blockly-samples/tree/main/examples/developer-tools).

Визуально создаёте свои блоки Blockly: поля, входы, цвет, превью и готовый код (JSON/JS definition + generator stub).

## Запуск

```powershell
cd editor/block-factory
.\start.ps1
```

Скрипт откроет браузер: http://localhost:8082

Первый запуск выполнит `npm install` (нужен интернет). Дальше работает офлайн.

## Использование

1. В рабочей области — блок **Block configuration** (базовый шаблон).
2. Из панели слева перетащите **Fields** и **Inputs** на блок.
3. Справа — **Preview** и сгенерированный код (Block Definition, Generator Stub).
4. Кнопки **Create new block** / **Load block** — сохранение в localStorage браузера.

Скопируйте код в `editor/blockly/blocks.js` или свой проект.

## Связанные инструменты

| Порт | Инструмент |
|------|------------|
| 8081 | [FSM редактор](../blockly/) → `common/rules/rules.json` |
| 8082 | Block Factory (этот каталог) |

Исходники: Apache 2.0, Blockly Team.
