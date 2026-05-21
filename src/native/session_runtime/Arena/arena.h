#ifndef ARENA_H
#define ARENA_H

#include <stdint.h>
#include <stddef.h>
#include "containers.h"

// do not change these values
// optimize for these values only
#define MAX_CONTAINER 255
#define ARENA_BITMAP_WORDS ((MAX_CONTAINER + 63) / 64)
typedef uint32_t ArenaHandle;


// each arena takes 2080 bytes on linux x86_64
typedef struct
{
    uint64_t container_bitmap[ARENA_BITMAP_WORDS];
    uint8_t summary_bitmap;

    uint16_t slot_size;
    Container* containers[MAX_CONTAINER];

} Arena;


Arena* arena_create(
    uint16_t slot_size
);


void arena_destroy(
    Arena* arena
);


ArenaHandle arena_alloc(
    Arena* arena
);


void* arena_access(
    Arena* arena,
    ArenaHandle handle
);


void arena_free(
    Arena* arena,
    ArenaHandle handle
);

#endif