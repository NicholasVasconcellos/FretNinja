cmake_minimum_required(VERSION 3.22)
project(pitch-detector)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Shared C++ DSP sources
set(CPP_DIR ${CMAKE_SOURCE_DIR}/../../../../cpp)

add_library(pitch-detector SHARED
  ${CPP_DIR}/yin.cpp
  ${CPP_DIR}/note_mapper.cpp
  OboeAudioCapture.cpp
  pitch-detector-jni.cpp
)

target_include_directories(pitch-detector PRIVATE
  ${CPP_DIR}
  ${CMAKE_SOURCE_DIR}
)

# Oboe (via prefab)
find_package(oboe REQUIRED CONFIG)

find_library(log-lib log)

target_link_libraries(pitch-detector
  oboe::oboe
  ${log-lib}
)
