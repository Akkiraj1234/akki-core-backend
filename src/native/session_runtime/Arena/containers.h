#ifndef CONTAINERS_H
#define CONTAINERS_H

#include <stdint.h>
#include <stddef.h>

// do not change these values
// optimize for these values only
#define MAX_SLOT_SIZE 320
#define MAX_SLOT 8192
#define BITMAP_WORD_COUNT ((MAX_SLOT + 63) / 64)
#define WORD_BITMAP_WORDS ((BITMAP_WORD_COUNT + 31) / 32)


// each container takes 1064 bytes
typedef struct
{
    uint64_t slot_bitmap[BITMAP_WORD_COUNT];
    uint32_t word_bitmap[WORD_BITMAP_WORDS];
    uint8_t summary_bitmap;

    uint8_t* memory;
    uint16_t slot_size;

} Container;


Container* container_create(
    uint16_t slot_size
);


void container_destroy(
    Container* container
);


uint16_t container_alloc(
    Container* container,
    uint8_t* full
);


void* container_access(
    Container* container,
    uint16_t index
);


void container_free(
    Container* container,
    uint16_t index
);


#endif