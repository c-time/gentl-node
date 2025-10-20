import { GentlNode } from '../index';

describe('GentlNode', () => {
  let gentlNode: GentlNode;

  beforeEach(() => {
    gentlNode = new GentlNode();
  });

  describe('constructor', () => {
    it('should create an instance of GentlNode', () => {
      expect(gentlNode).toBeInstanceOf(GentlNode);
    });

    it('should accept options in constructor', () => {
      const options = {
        deleteTemplateTag: false,
        deleteDataAttributes: false
      };
      const customGentlNode = new GentlNode(options);
      expect(customGentlNode).toBeInstanceOf(GentlNode);
    });

    it('should accept includeDirectory in constructor', () => {
      const options = {
        includeDirectory: '/path/to/includes',
        deleteTemplateTag: false
      };
      const customGentlNode = new GentlNode(options);
      expect(customGentlNode).toBeInstanceOf(GentlNode);
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
});