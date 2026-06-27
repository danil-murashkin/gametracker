# Simulator

LVGL 8.3 + SDL2. **Тот же код**, что на ESP32: `common/app/app_counter.c` + `common/ui/ui_counter.c` (см. [`../common/common_sources.cmake`](../common/common_sources.cmake)).

## Требования (Windows)

- **MinGW-w64** с CMake и Ninja — один пакет:
  ```powershell
  winget install BrechtSanders.WinLibs.POSIX.MSVCRT
  ```
- Git (для загрузки LVGL/SDL/lv_drivers при первой сборке)

Альтернатива: Visual Studio Build Tools + отдельно [CMake](https://cmake.org/download/) и Ninja.

## Сборка

В **новом** терминале PowerShell:

```powershell
cd simulator
. .\activate-build.ps1
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build
.\build\simulator.exe
```

Или одной командой:

```powershell
cd simulator
.\build.ps1
```

`activate-build.ps1` добавляет в PATH MinGW из WinGet (если `cmake` не находится после установки).

При первой сборке CMake скачает SDL2, LVGL 8.3.11 и lv_drivers — это может занять несколько минут.

## Управление

| Клавиша | Действие |
|---------|----------|
| ↑ / + / Num+ | +1 |
| ↓ / − / Num− | −1 |
| Esc / Q | выход |

Окно 240×320 (масштаб ×2). На экране — синий квадрат с белым числом, как на дисплее ESP32.
