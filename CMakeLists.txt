cmake_minimum_required(VERSION 3.16)
project(HeatDweller LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

find_package(SDL2 REQUIRED)
find_package(SDL2_image REQUIRED)
find_package(nlohmann_json REQUIRED)

file(GLOB_RECURSE SOURCE_FILES
    src/*.cpp
)

add_executable(HeatDweller ${SOURCE_FILES})

target_include_directories(HeatDweller PRIVATE
    ${CMAKE_SOURCE_DIR}/src
)

if (WIN32)
    target_link_libraries(HeatDweller PRIVATE
        SDL2::SDL2
        SDL2::SDL2main
        SDL2::SDL2_image
        nlohmann_json::nlohmann_json
    )
else()
    target_link_libraries(HeatDweller PRIVATE
        SDL2::SDL2
        SDL2::SDL2_image
        nlohmann_json::nlohmann_json
    )
endif()

if (WIN32)
    target_compile_definitions(HeatDweller PRIVATE "WINDOWS_BUILD")
endif()
