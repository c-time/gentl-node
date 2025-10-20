import GentlNode from '../index';

describe('GentlNode', () => {
  let gentlNode: GentlNode;

  beforeEach(() => {
    gentlNode = new GentlNode();
  });

  describe('loadTemplate', () => {
    it('should be defined', () => {
      expect(gentlNode.loadTemplate).toBeDefined();
    });

    it('should throw not implemented error for now', async () => {
      await expect(gentlNode.loadTemplate('test.html')).rejects.toThrow('Not implemented yet');
    });
  });

  describe('generateFiles', () => {
    it('should be defined', () => {
      expect(gentlNode.generateFiles).toBeDefined();
    });

    it('should throw not implemented error for now', async () => {
      await expect(gentlNode.generateFiles([], 'file-{index}.html')).rejects.toThrow('Not implemented yet');
    });
  });
});