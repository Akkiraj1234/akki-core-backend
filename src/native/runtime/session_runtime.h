#ifndef SESSION_RUNTIME_H
#define SESSION_RUNTIME_H

#include <stdint.h>

typedef struct 
{
    uint32_t next_check;
    uint16_t cycle;
    uint8_t active;
} Session;

void create_session(uint32_t id);

int validate_session(uint32_t id);

void touch_session(uint32_t id);

#endif