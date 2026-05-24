#ifndef SessionTracker_h
#define SessionTracker_h

#include <stdint.h>

typedef struct 
{
    void* memory;
    uint32_t slot_size; 
    uint32_t capacity;         
    uint16_t* free_slots;       
    uint16_t free_last_index;

} Container;


typedef struct 
{
    Container* containers[10];  // always store 10 container limit
    uint8_t current_container;  // index value never cross 10 so

} Arena;


Arena* arena_create
(
    uint32_t slot_size,
    uint32_t capacity
);


uint32_t arena_alloc(
    Arena* arena
);

void arena_free(
    Arena* arena,
    uint32_t index
);


#endif