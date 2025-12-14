/**
 * BUGGY version of append_str - demonstrates the realloc misuse pattern
 * 
 * This code has a critical bug: ptr = realloc(ptr, ...)
 * If realloc fails, the original pointer is lost, causing a memory leak.
 * 
 * This is what the static analyzer should detect and flag.
 */

#include <stdlib.h>
#include <string.h>

char *append_str(const char *base, const char *add) {
    size_t a = strlen(base);
    size_t b = strlen(add);

    char *buf = (char*)malloc(a + 1);
    if (!buf) return NULL;
    memcpy(buf, base, a + 1);

    // BUG: Direct assignment - if realloc fails, original pointer is lost!
    buf = (char*)realloc(buf, a + b + 1);
    if (!buf) {
        // Memory leak: original buf pointer is already lost!
        return NULL;
    }

    memcpy(buf + a, add, b + 1);
    return buf;
}

