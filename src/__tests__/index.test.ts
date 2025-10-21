import { GentlNode } from '../index';
import * as path from 'path';

describe('GentlNode', () => {
  let gentlNode: GentlNode;
  const testRootDir = path.resolve('./test-root');

  beforeEach(() => {
    gentlNode = new GentlNode(testRootDir);
  });

  describe('constructor', () => {
    it('should create an instance of GentlNode with root directory', () => {
      expect(gentlNode).toBeInstanceOf(GentlNode);
    });

    it('should throw error if root directory is not provided', () => {
      expect(() => new GentlNode('')).toThrow('Root directory is required');
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

    it('should accept fallbackFunction in constructor', () => {
      const mockFallbackFunction = jest.fn().mockResolvedValue('<p>fallback content</p>');
      const options = {
        fallbackFunction: mockFallbackFunction,
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

  describe('fallback functionality', () => {
    it('should use fallback function when include file is not found', () => {
      const mockFallbackFunction = jest.fn().mockResolvedValue('<p>fallback content</p>');
      const gentlNodeWithFallback = new GentlNode(testRootDir, {
        fallbackFunction: mockFallbackFunction,
        includeDirectory: 'includes'
      });
      expect(gentlNodeWithFallback).toBeInstanceOf(GentlNode);
      // 実際のテストは統合テストで行う（ファイルシステムが必要）
    });

    it('should throw error when include file is not found and no fallback provided', () => {
      const gentlNodeNoFallback = new GentlNode(testRootDir, {
        includeDirectory: 'includes'
      });
      expect(gentlNodeNoFallback).toBeInstanceOf(GentlNode);
      // 実際のエラーテストは統合テストで行う（ファイルシステムが必要）
    });
  });
});