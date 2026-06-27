#include "rules_embed.h"

#include <stdbool.h>
#include <string.h>

extern const uint8_t _binary_rules_json_start[] asm("_binary_rules_json_start");
extern const uint8_t _binary_rules_json_end[] asm("_binary_rules_json_end");

static char s_rules_buf[4096];
static bool s_rules_ready;

static void rules_embed_prepare(void)
{
    if (s_rules_ready) {
        return;
    }

    size_t len = (size_t)(_binary_rules_json_end - _binary_rules_json_start);
    if (len >= sizeof(s_rules_buf)) {
        len = sizeof(s_rules_buf) - 1;
    }

    memcpy(s_rules_buf, _binary_rules_json_start, len);
    s_rules_buf[len] = '\0';
    s_rules_ready = true;
}

const char *rules_embed_get_json(void)
{
    rules_embed_prepare();
    return s_rules_buf;
}

size_t rules_embed_get_length(void)
{
    rules_embed_prepare();
    return strlen(s_rules_buf);
}
