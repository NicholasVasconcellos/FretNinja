require 'json'
require 'fileutils'

package = JSON.parse(File.read(File.join(__dir__, '..', 'expo-module.config.json')))

# Stage shared C++ DSP sources into ios/generated_cpp so CocoaPods can
# include them without parent-directory path issues (Ruby Dir.glob does
# not reliably follow symlinks, and podspec source_files outside the
# spec root are ignored by CocoaPods).
staged_cpp_dir = File.join(__dir__, 'generated_cpp')
FileUtils.mkdir_p(staged_cpp_dir)
Dir.glob(File.join(__dir__, '..', 'cpp', '*.{h,hpp,cpp}')).each do |src|
  next if src.include?('/tests/') || src.end_with?('/test_harness.cpp')
  FileUtils.cp(src, staged_cpp_dir)
end

Pod::Spec.new do |s|
  s.name           = 'PitchDetector'
  s.version        = '0.1.0'
  s.summary        = 'Expo native module for real-time pitch detection'
  s.description    = 'Custom YIN-based pitch detection module for FretNinja'
  s.author         = ''
  s.homepage       = 'https://github.com/example/pitch-detector'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = ['*.{h,m,mm,swift}', 'generated_cpp/*.{h,hpp,cpp}']
  s.exclude_files = ['generated_cpp/test_harness.cpp', 'generated_cpp/tests/**/*']
  s.public_header_files = 'PitchDetectorBridge.h'

  s.pod_target_xcconfig = {
    'HEADER_SEARCH_PATHS' => '"${PODS_TARGET_SRCROOT}/generated_cpp" "${PODS_TARGET_SRCROOT}/../cpp"',
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17'
  }
end
