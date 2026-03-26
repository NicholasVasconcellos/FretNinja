cmake_minimum_required(VERSION 3.22)
project(pitch-detector)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Shared C++ DSP sources will be added in task 015
# For now, create a stub library
add_library(pitch-detector SHARED
  stub.cpp
)

target_include_directories(pitch-detector PRIVATE
  ${CMAKE_SOURCE_DIR}/../../../../cpp
)

find_library(log-lib log)

target_link_libraries(pitch-detector
  ${log-lib}
)
