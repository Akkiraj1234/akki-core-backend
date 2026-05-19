#ifndef ARENA_STORAGE_H
#define ARENA_STORAGE_H

#include <stdint.h>
#include <stddef.h>

// do not change these value everything 
// optimize for these value only
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
Create the arena object
*/
Arena* arena_create(
    uint16_t slot_size
);


/*
Destroy the arena object
*/
void arena_destroy(
    Arena* arena
);


/*max_containers
Insert data into arena.

Returns:
    index
*/
uint32_t arena_insert(
    Arena* arena,
    const void* data
);


/*
Remove data using handle
*/
void arena_remove(
    Arena* arena,
    uint32_t index
);


/*
Get pointer to stored object
*/
void* arena_get(
    Arena* arena,
    uint32_t index
);

#endif