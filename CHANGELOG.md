# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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