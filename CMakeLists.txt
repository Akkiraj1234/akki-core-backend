cmake_minimum_required(VERSION 3.20)
project(akki_native_server LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

enable_testing()

set(NATIVE_ROOT ${CMAKE_SOURCE_DIR}/src/native)

set(NATIVE_SERVER_SOURCES
    ${NATIVE_ROOT}/main.cpp
    ${NATIVE_ROOT}/server/server_init.cpp
    ${NATIVE_ROOT}/routes/native_routes.cpp
    ${NATIVE_ROOT}/rate_limit/ip.cpp
    ${NATIVE_ROOT}/rate_limit/login.cpp
    ${NATIVE_ROOT}/rate_limit/token.cpp
)

add_executable(main_app ${NATIVE_SERVER_SOURCES})
target_include_directories(main_app PRIVATE
    ${NATIVE_ROOT}
    ${CMAKE_SOURCE_DIR}/lib/uWebSockets
    ${CMAKE_SOURCE_DIR}/lib/uWebSockets/src
)

if(WIN32)
    target_link_libraries(main_app PRIVATE ws2_32)
endif()

find_package(Python3 COMPONENTS Interpreter)
if(Python3_Interpreter_FOUND)
    add_test(
        NAME python_false_request_test
        COMMAND ${Python3_EXECUTABLE} ${CMAKE_SOURCE_DIR}/dev/dev_build_test/false_request_test.py
                --url http://127.0.0.1:3000/does_not_exist
                --count 25
    )
endif()
