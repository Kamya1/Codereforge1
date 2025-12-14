/**
 * Fixed version of append_str using the safe realloc pattern
 * 
 * This is the CORRECT implementation that should be recommended by the AI fixer.
 * It uses a temporary pointer to avoid losing the original pointer on realloc failure.
 */

#include <stdlib.h>
#include <string.h>

char *append_str(const char *base, const char *add) {
    size_t a = strlen(base);
    size_t b = strlen(add);

    char *buf = (char*)malloc(a + 1);
    if (!buf) return NULL;
    memcpy(buf, base, a + 1);

    // Use temporary pointer to avoid losing original on failure
    char *tmp = (char*)realloc(buf, a + b + 1);
    if (!tmp) {
        // realloc failed: free old buffer and return NULL (or handle differently)
        free(buf);
        return NULL;
    }
    buf = tmp;

    memcpy(buf + a, add, b + 1);
    return buf;
}

