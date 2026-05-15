#ifndef ARENA_STORAGE_H
#define ARENA_STORAGE_H

#include <stdint.h>
#include <stddef.h>


// container
typedef struct
{
    uint8_t* memory;
    uint32_t slot_size;
    uint32_t capacity;
    uint32_t* free_slots;
    uint32_t free_top;
    uint8_t* bitmap;

} Container;


typedef struct
{
    Container** containers;

    uint16_t max_containers;
    uint16_t free_container_index;

    uint32_t slot_size;
    uint32_t container_capacity;

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


/*
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