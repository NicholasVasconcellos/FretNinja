require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'expo-module.config.json')))

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

  s.source_files = ['**/*.{h,m,mm,swift,hpp,cpp}', '../cpp/*.{h,hpp,cpp}']
  s.exclude_files = '../cpp/test_harness.cpp'
  s.public_header_files = 'PitchDetectorBridge.h'

  s.pod_target_xcconfig = {
    'HEADER_SEARCH_PATHS' => '"${PODS_TARGET_SRCROOT}/../cpp"',
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17'
  }
end
