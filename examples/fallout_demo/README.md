# Fallout Demo — данные для симулятора

Сценарий для [`engine/`](../../engine/): формат [`docs/game_data_format.md`](../../docs/game_data_format.md), логика препаратов из [`docs/old_system/preparates.md`](../../docs/old_system/preparates.md).

| Файл | Содержание |
|------|------------|
| [`character.json`](character.json) | Персонаж: `stats` (схема + `val`) и `inventory` |
| [`recipes.json`](recipes.json) | Рецепты сценария |

Мировая механика (`mech_*`, `pasv` без `umax`) подключается из каталога и не пишется в инвентарь.

## Запуск

```bash
cd engine
npm install
npm run dev
```
