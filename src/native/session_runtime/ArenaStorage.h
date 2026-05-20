#ifndef ARENA_STORAGE_H
#define ARENA_STORAGE_H

#include <stdint.h>
#include <stddef.h>

// do not change these values
// optimize for these values only
#define MAX_CONTAINER 255
#define MAX_SLOT_SIZE 320
#define MAX_SLOT 8192

#define BITMAP_WORD_COUNT ((MAX_SLOT + 63) / 64)
#define WORD_BITMAP_WORDS ((BITMAP_WORD_COUNT + 31) / 32)
#define ARENA_BITMAP_WORDS ((MAX_CONTAINER + 63) / 64)


// each container takes 1064 bytes
typedef struct
{
    uint64_t slot_bitmap[BITMAP_WORD_COUNT];
    uint32_t word_bitmap[WORD_BITMAP_WORDS];
    uint8_t summary_bitmap;

    uint8_t* memory;
    uint16_t slot_size;

} Container;


// each arena takes 2080 bytes
typedef struct
{
    uint64_t container_bitmap[ARENA_BITMAP_WORDS];
    uint8_t summary_bitmap;

    uint16_t slot_size;
    Container* containers[MAX_CONTAINER];

} Arena;


/*
Create a new arena
*/
Arena* arena_create(
    uint16_t slot_size
);


/*
Destroy the arena
*/
void arena_destroy(
    Arena* arena
);


/*
Allocate a new slot

Returns:
    handle
*/
uint32_t arena_insert(
    Arena* arena
);


/*
Get readable and writable
memory using handle
*/
void* arena_access(
    Arena* arena,
    uint32_t handle
);


/*
Free slot using handle
*/
void arena_remove(
    Arena* arena,
    uint32_t handle
);

#endif