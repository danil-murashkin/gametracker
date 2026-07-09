# Platform-independent sources (firmware).
# Included from both CMakeLists — keep in sync.

set(COMMON_APP_SOURCES
    "${COMMON_DIR}/app/app_counter.c"
)

set(COMMON_UI_SOURCES
    "${COMMON_DIR}/ui/ui_counter.c"
)

set(COMMON_INCLUDE_DIRS
    "${COMMON_DIR}/app"
    "${COMMON_DIR}/ui"
    "${COMMON_DIR}/hal"
)
