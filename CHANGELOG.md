# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2025-10-21

### Changed
- Set default values to preserve template structure and data attributes
  - `deleteTemplateTag: false` (preserve `<template>` tags for reusability)
  - `deleteDataAttributes: false` (preserve `data-gen-*` attributes for debugging)
- Simplified README usage examples by removing optional configuration parameters
- Aligned default behavior with @c-time/gentl's philosophy of template reusability

### Documentation
- Streamlined basic usage examples for better clarity
- Removed optional configuration from simple examples to focus on core functionality

## [1.0.1] - 2025-10-21

### Fixed
- Corrected `data-gen-include` examples to include proper file extensions (.html)
- Fixed HTML template syntax in documentation to use correct gentl format
- Improved grammar and sentence structure in README introduction
- Enhanced section headers for better clarity

### Changed
- Updated feature description to specify JSON file processing: "データ（jsonファイル）をHTMLに変換"
- Reorganized README sections for improved understanding of library purpose
- Added comprehensive @c-time/gentl feature descriptions to clarify base library benefits
- Polished language expressions throughout documentation

### Documentation
- Added detailed explanation of @c-time/gentl core features and characteristics
- Improved API documentation consistency
- Enhanced template examples with proper gentl syntax
- Better organization of feature descriptions and use cases

## [1.0.0] - 2025-10-21

### Added
- Initial release of gentl-node library
- `GentlNode` class for HTML template processing in Node.js environment
- Support for single file generation with `generateFile()` method
- Support for batch file generation with `generateFiles()` method
- Base data functionality with `setBaseData()` method for shared configuration
- Include directory support with recursive file mapping
- Include not found handler for custom fallback behavior
- Comprehensive logging system compatible with gentl standards
- File content caching for improved performance
- Security restrictions for output paths (output root directory only)
- Full TypeScript support with type definitions
- `IGentlNode` interface for clear API definition

### Features
- **Template Processing**: Powered by @c-time/gentl v1.2.0 with jsdom integration
- **Flexible Path Handling**: Input files from any location, output files restricted to output root directory
- **Data Merging**: Base data automatically merged with file-specific data (base data priority)
- **Naming Rules**: Configurable file naming with variables: `{index}`, `{fileName}`, `{data.property}`
- **Include System**: Recursive include directory support with caching and gentl processing
- **Error Handling**: Custom handlers for missing include files with comprehensive logging
- **Type Safety**: Full TypeScript support with exported interfaces and types

### Dependencies
- `@c-time/gentl`: ^1.2.0
- `jsdom`: ^27.0.1

### Development
- TypeScript v5.9.3
- Jest testing framework
- Comprehensive test suite
- ESM-compatible build configuration