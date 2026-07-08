## `common/ui_generated/`

Сюда кладутся `ui.c`, `ui.h`, `ui_events.*`, `ui_logic.*`, **сгенерированные** в `editor/` (вкладка **Code**).

### Симулятор

Собрать и запустить:

```powershell
cd simulator
.\build.ps1 -GeneratedUI
.\build\simulator.exe
```

### Примечания

- Эти файлы **перезаписываются** при каждом экспорте из редактора.
- В репозитории лежит минимальный пример (таймер + счётчик) как «smoke test».

