#ifndef ARENA_STORAGE_H
#define ARENA_STORAGE_H

// do not change these value everything 
// optimize for these value only
#define MAX_CONTAINER 255
#define MAX_SLOT_SIZE 320
#define MAX_SLOT 8192
#define BITMAP_WORD_COUNT ((MAX_SLOT + 63) / 64)
#define ARENA_BITMAP_WORDS ((MAX_CONTAINER + 63) / 64)

#include <stdint.h>
#include <stddef.h>


// container
typedef struct
{
    uint8_t free_bitmap_words[BITMAP_WORD_COUNT];
    uint64_t bitmap[BITMAP_WORD_COUNT];
    
    uint8_t* memory;

    uint16_t free_word_top;
    uint16_t slot_size;

} Container;


typedef struct
{
    uint64_t bitmap[ARENA_BITMAP_WORDS];
    uint8_t free_bitmap_words[ARENA_BITMAP_WORDS];
    uint8_t free_word_top;

    uint16_t slot_size;
    Container* containers[MAX_CONTAINER];
    
} Arena;


/*
Create the arena object
*/
Arena* arena_create(
    uint32_t slot_size,
    uint32_t container_capacity,
    uint32_t max_containers
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