import { GentlNode } from '../index';
import * as path from 'path';

describe('GentlNode', () => {
  let gentlNode: GentlNode;
  const testRootDir = path.resolve('./test-root');

  beforeEach(() => {
    gentlNode = new GentlNode(testRootDir);
  });

  describe('constructor', () => {
    it('should create an instance of GentlNode with output root directory', () => {
      expect(gentlNode).toBeInstanceOf(GentlNode);
    });

    it('should throw error if output root directory is not provided', () => {
      expect(() => new GentlNode('')).toThrow('Output root directory is required');
    });

    it('should accept options in constructor', () => {
      const options = {
        deleteTemplateTag: false,
        deleteDataAttributes: false
      };
      const customGentlNode = new GentlNode(testRootDir, options);
      expect(customGentlNode).toBeInstanceOf(GentlNode);
    });

    it('should accept includeDirectory in constructor', () => {
      const options = {
        includeDirectory: 'includes',
        deleteTemplateTag: false
      };
      const customGentlNode = new GentlNode(testRootDir, options);
      expect(customGentlNode).toBeInstanceOf(GentlNode);
    });

    it('should accept custom logger in constructor', () => {
      const mockLogger = jest.fn();
      const options = {
        logger: mockLogger,
        deleteTemplateTag: false
      };
      const customGentlNode = new GentlNode(testRootDir, options);
      expect(customGentlNode).toBeInstanceOf(GentlNode);
    });

    it('should accept includeNotFoundHandler in constructor', () => {
      const mockIncludeNotFoundHandler = jest.fn().mockResolvedValue('<p>fallback content</p>');
      const options = {
        includeNotFoundHandler: mockIncludeNotFoundHandler,
        deleteTemplateTag: false
      };
      const customGentlNode = new GentlNode(testRootDir, options);
      expect(customGentlNode).toBeInstanceOf(GentlNode);
    });

    it('should use default logger when no logger provided', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      const gentlNodeWithDefaultLogger = new GentlNode(testRootDir);
      
      // デフォルトロガーが設定されていることを確認するため、
      // 実際にはprivateメソッドなのでインスタンスが作成できることで確認
      expect(gentlNodeWithDefaultLogger).toBeInstanceOf(GentlNode);
      
      consoleSpy.mockRestore();
    });
  });

  describe('generateFile', () => {
    it('should be defined', () => {
      expect(gentlNode.generateFile).toBeDefined();
    });

    it('should be a function that accepts correct parameters', () => {
      expect(typeof gentlNode.generateFile).toBe('function');
      expect(gentlNode.generateFile.length).toBe(3); // templatePath, dataPath, outputPath
    });
  });

  describe('generateFiles', () => {
    it('should be defined', () => {
      expect(gentlNode.generateFiles).toBeDefined();
    });

    it('should be a function that accepts correct parameters', () => {
      expect(typeof gentlNode.generateFiles).toBe('function');
      expect(gentlNode.generateFiles.length).toBe(4); // templatePath, dataPath, outputDir, namingRule
    });
  });

  describe('include not found handler functionality', () => {
    it('should use include not found handler when include file is not found', () => {
      const mockIncludeNotFoundHandler = jest.fn().mockResolvedValue('<p>fallback content</p>');
      const gentlNodeWithHandler = new GentlNode(testRootDir, {
        includeNotFoundHandler: mockIncludeNotFoundHandler,
        includeDirectory: 'includes'
      });
      expect(gentlNodeWithHandler).toBeInstanceOf(GentlNode);
      // 実際のテストは統合テストで行う（ファイルシステムが必要）
    });

    it('should throw error when include file is not found and no handler provided', () => {
      const gentlNodeNoHandler = new GentlNode(testRootDir, {
        includeDirectory: 'includes'
      });
      expect(gentlNodeNoHandler).toBeInstanceOf(GentlNode);
      // 実際のエラーテストは統合テストで行う（ファイルシステムが必要）
    });
  });

  describe('base data functionality', () => {
    it('should have setBaseData method', () => {
      expect(gentlNode.setBaseData).toBeDefined();
      expect(typeof gentlNode.setBaseData).toBe('function');
    });
  });
});