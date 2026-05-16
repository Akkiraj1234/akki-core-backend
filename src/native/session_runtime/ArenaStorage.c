#include "ArenaStorage.h"
#include <stdlib.h>
#define MAX_CONTAINER 1024
#define MAX_CONTAINER_SIZE (1024*1024*5)


static Container* _create_container(
    uint32_t slot_size,
    uint32_t capacity
)
{
    // Initializing
    // since uint8_t is 8byte == 1bytes
    uint8_t* memory = malloc( slot_size * capacity );
    uint32_t* free_slots = malloc(capacity * sizeof(uint32_t));
    uint8_t* bitmap = calloc((capacity + 7) / 8);
    Container* container = malloc(sizeof(Container));

    if (
        memory == NULL ||
        free_slots == NULL ||
        bitmap == NULL ||
        container == NULL 
    ){
        free(memory);
        free(free_slots);
        free(bitmap);
        free(container);
        return NULL;
    }

    // creating object 
    container -> memory = memory;
    container -> free_slots = free_slots;
    container -> free_top = NULL;
    container -> bitmap = bitmap;
    container -> slot_size = slot_size;
    container -> capacity = capacity;
    return container;
}

static void _destroy_container(Container* container){
    // delete logic here
}


Arena* arena_create(
    uint32_t slot_size,
    uint32_t container_capacity,
    uint32_t max_container
)
{
    if (max_container > MAX_CONTAINER){
        return NULL;
    }

    if (slot_size * container_capacity > MAX_CONTAINER_SIZE ){
        return NULL;
    }

    // creating container here
    Container** containers = malloc( 
        sizeof(Container*) * max_container 
    );
    // i think its wrong i should create container object
    // directly inside containers right not copy it? 
    // how to do that
    Container* container = _create_container(
        slot_size,
        container_capacity
    );  
    Arena* arena = malloc(sizeof(Arena));

    if (
        containers == NULL ||
        container == NULL ||
        arena == NULL
    ){
        _destroy_container(container);
        free(containers);
        free(arena);
        return NULL;
    }

    for (uint32_t i = 0; i < max_container; i++)
    {
        containers[i] = NULL;
    }

    containers[0] = container;
    arena -> containers = containers;
    arena -> max_containers = max_container;
    arena -> free_container_index = 0;
    arena -> slot_size = slot_size;
    arena -> container_capacity = container_capacity;
    return arena;
}

