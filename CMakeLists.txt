cmake_minimum_required(VERSION 3.20)

project(akki_core_backend LANGUAGES C CXX)

# uWebSockets uses zlib internally for compression support.
find_package(ZLIB REQUIRED)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Keep the main directories in variables so the paths below stay readable.
set(NATIVE_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/src/native")
set(UWS_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/lib/uWebSockets")
set(USOCKETS_ROOT "${UWS_ROOT}/uSockets")
set(ABSEIL_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/lib/external/abseil")

# This is the app code we want in the native test server.
# I listed these files explicitly so you can see exactly what gets compiled.
set(NATIVE_TEST_SOURCES
    "${NATIVE_ROOT}/main.cpp"
    "${NATIVE_ROOT}/server/server_init.cpp"
    "${NATIVE_ROOT}/routes/native_routes.cpp"
    "${NATIVE_ROOT}/rate_limit/ip.cpp"
    "${NATIVE_ROOT}/rate_limit/login.cpp"
    "${NATIVE_ROOT}/rate_limit/token.cpp"
    "${NATIVE_ROOT}/arena/arena.c"
    "${NATIVE_ROOT}/arena/containers.c"
    "${NATIVE_ROOT}/arena/utils.c"
    "${NATIVE_ROOT}/client_state/ip_registry.c"
    "${NATIVE_ROOT}/diff/diff_engion.c"
    "${NATIVE_ROOT}/runtime/SessionTracker.c"
    "${NATIVE_ROOT}/runtime/session_runtime.c"
)

# uWebSockets is mostly headers, but it depends on low-level networking code
# from uSockets. These are the concrete C files we need to compile for Linux.
set(USOCKETS_SOURCES
    "${USOCKETS_ROOT}/src/bsd.c"
    "${USOCKETS_ROOT}/src/context.c"
    "${USOCKETS_ROOT}/src/loop.c"
    "${USOCKETS_ROOT}/src/socket.c"
    "${USOCKETS_ROOT}/src/udp.c"
    "${USOCKETS_ROOT}/src/eventing/epoll_kqueue.c"
)

add_library(usockets_vendor STATIC
    ${USOCKETS_SOURCES}
)

target_include_directories(usockets_vendor SYSTEM PUBLIC
    "${CMAKE_CURRENT_SOURCE_DIR}/lib"
    "${UWS_ROOT}"
    "${USOCKETS_ROOT}/src"
)

target_compile_definitions(usockets_vendor PUBLIC
    LIBUS_NO_SSL
)

if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    target_compile_options(usockets_vendor PRIVATE -w)
endif()

add_executable(native_server_test
    ${NATIVE_TEST_SOURCES}
)

target_include_directories(native_server_test PRIVATE
    "${NATIVE_ROOT}"
    "${ABSEIL_ROOT}"
)

target_link_libraries(native_server_test PRIVATE
    usockets_vendor
    pthread
    ZLIB::ZLIB
)

if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    target_compile_options(native_server_test PRIVATE -Wall -Wextra)
endif()
