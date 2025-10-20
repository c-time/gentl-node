import { JSDOM } from 'jsdom';
import * as fs from 'fs/promises';
import * as path from 'path';
import { process as gentlProcess, type GentlJInput, type GentlJOptions } from '@c-time/gentl';

// 新しいIncludeIo型定義に対応
type IncludeIoFunction = (baseData?: object) => Promise<string>;
type IncludeIo = Record<string, IncludeIoFunction>;

/**
 * Node.js環境でのウェブサイトテンプレートファイル処理ライブラリ
 * jsdomとNodeのファイルシステムを利用
 */
export class GentlNode {
  private rootDir: string;
  private includeDir?: string;
  private options: Partial<GentlJOptions>;

  constructor(rootDirectory: string, options?: Partial<GentlJOptions> & { includeDirectory?: string }) {
    if (!rootDirectory) {
      throw new Error('Root directory is required');
    }
    
    this.rootDir = path.resolve(rootDirectory);
    
    const { includeDirectory, ...gentlOptions } = options || {};
    
    // includeDirectoryが指定されている場合、ルートディレクトリからの相対パスとして処理
    this.includeDir = includeDirectory ? path.resolve(this.rootDir, includeDirectory) : undefined;
    
    this.options = {
      deleteTemplateTag: true,
      deleteDataAttributes: true,
      rootParserType: 'htmlDocument',
      domEnvironment: JSDOM as any,
      ...gentlOptions
    };
  }

  /**
   * パスがルートディレクトリ内にあるかを検証
   */
  private validatePath(filePath: string, description: string): string {
    const resolvedPath = path.resolve(this.rootDir, filePath);
    const relativePath = path.relative(this.rootDir, resolvedPath);
    
    // パスがルートディレクトリの外に出ていないかチェック
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error(`${description} must be within the root directory: ${this.rootDir}`);
    }
    
    return resolvedPath;
  }

  /**
   * 単一のHTMLファイルを生成
   * @param templatePath HTMLテンプレートファイルのパス（ルートディレクトリからの相対パス）
   * @param dataPath JSONデータファイルのパス（ルートディレクトリからの相対パス）
   * @param outputPath 出力ファイルのパス（ルートディレクトリからの相対パス）
   */
  async generateFile(templatePath: string, dataPath: string, outputPath: string): Promise<void> {
    try {
      // パスを検証し、ルートディレクトリ内の絶対パスに変換
      const resolvedTemplatePath = this.validatePath(templatePath, 'Template path');
      const resolvedDataPath = this.validatePath(dataPath, 'Data path');
      const resolvedOutputPath = this.validatePath(outputPath, 'Output path');

      // テンプレートファイルを読み込み
      const html = await fs.readFile(resolvedTemplatePath, 'utf-8');
      
      // データファイルを読み込み
      const dataContent = await fs.readFile(resolvedDataPath, 'utf-8');
      const data = JSON.parse(dataContent);

      // includeIoの設定
      const includeIo = await this.buildIncludeIo();

      // gentlで処理
      const input: GentlJInput = {
        html,
        data,
        includeIo
      };

      const result = await gentlProcess(input, this.options);

      // 出力ディレクトリを作成（存在しない場合）
      const outputDir = path.dirname(resolvedOutputPath);
      await fs.mkdir(outputDir, { recursive: true });

      // 結果をファイルに書き込み
      await fs.writeFile(resolvedOutputPath, result.html, 'utf-8');

    } catch (error) {
      throw new Error(`Failed to generate file: ${error}`);
    }
  }

  /**
   * 複数のHTMLファイルを生成
   * @param templatePath HTMLテンプレートファイルのパス（ルートディレクトリからの相対パス）
   * @param dataPath JSONファイルが格納されているディレクトリのパス（ルートディレクトリからの相対パス）
   * @param outputDir 出力ディレクトリのパス（ルートディレクトリからの相対パス）
   * @param namingRule ファイル命名規則（例: "page-{index}.html", "item-{data.id}.html"）
   */
  async generateFiles(templatePath: string, dataPath: string, outputDir: string, namingRule: string): Promise<string[]> {
    try {
      // パスを検証し、ルートディレクトリ内の絶対パスに変換
      const resolvedTemplatePath = this.validatePath(templatePath, 'Template path');
      const resolvedDataPath = this.validatePath(dataPath, 'Data path');
      const resolvedOutputDir = this.validatePath(outputDir, 'Output directory');

      // テンプレートファイルを読み込み
      const html = await fs.readFile(resolvedTemplatePath, 'utf-8');
      
      // データディレクトリ内のJSONファイルを読み込み
      const dataFiles = await fs.readdir(resolvedDataPath);
      const jsonFiles = dataFiles.filter(file => path.extname(file).toLowerCase() === '.json');

      if (jsonFiles.length === 0) {
        throw new Error('No JSON files found in the specified data directory');
      }

      // includeIoの設定
      const includeIo = await this.buildIncludeIo();

      // 出力ディレクトリを作成
      await fs.mkdir(resolvedOutputDir, { recursive: true });

      const generatedFiles: string[] = [];

      // 各JSONファイルに対してHTMLファイルを生成
      for (let index = 0; index < jsonFiles.length; index++) {
        const jsonFile = jsonFiles[index];
        const jsonFilePath = path.join(resolvedDataPath, jsonFile);
        
        // JSONファイルを読み込み
        const dataContent = await fs.readFile(jsonFilePath, 'utf-8');
        const data = JSON.parse(dataContent);

        // ファイル名を生成（命名規則に従って）
        const filename = this.applyNamingRule(namingRule, { 
          index, 
          data,
          fileName: path.parse(jsonFile).name // JSONファイル名（拡張子なし）も利用可能
        });
        const outputPath = path.join(resolvedOutputDir, filename);

        // gentlで処理
        const input: GentlJInput = {
          html,
          data,
          includeIo
        };

        const result = await gentlProcess(input, this.options);

        // 結果をファイルに書き込み
        await fs.writeFile(outputPath, result.html, 'utf-8');
        
        // 相対パスで返却
        const relativeOutputPath = path.relative(this.rootDir, outputPath);
        generatedFiles.push(relativeOutputPath);
      }

      return generatedFiles;

    } catch (error) {
      throw new Error(`Failed to generate files: ${error}`);
    }
  }

  /**
   * includeIoオブジェクトを構築
   */
  private async buildIncludeIo(): Promise<IncludeIo | undefined> {
    if (!this.includeDir) {
      return undefined;
    }

    const includeIo: IncludeIo = {};

    try {
      await this.buildIncludeIoRecursive(this.includeDir, '', includeIo);
      return includeIo;
    } catch (error) {
      console.warn(`Warning: Could not read include directory ${this.includeDir}: ${error}`);
      return undefined;
    }
  }

  /**
   * includeIoオブジェクトを再帰的に構築
   */
  private async buildIncludeIoRecursive(
    currentDir: string, 
    relativePath: string, 
    includeIo: IncludeIo
  ): Promise<void> {
    const files = await fs.readdir(currentDir);
    
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isDirectory()) {
        // 子ディレクトリを再帰的に処理
        const newRelativePath = relativePath ? `${relativePath}/${file}` : file;
        await this.buildIncludeIoRecursive(filePath, newRelativePath, includeIo);
      } else if (stat.isFile()) {
        // ファイル名（相対パス + 拡張子あり）をキーとして使用
        // 環境依存のパスセパレーターを統一して "/" に正規化
        const key = relativePath ? `${relativePath}/${file}` : file;
        includeIo[key] = async (baseData?: object) => {
          // baseDataは現在使用していないが、将来的な拡張に備えてパラメーターを受け取る
          return await fs.readFile(filePath, 'utf-8');
        };
      }
    }
  }

  /**
   * 命名規則を適用してファイル名を生成
   */
  private applyNamingRule(namingRule: string, context: { index: number; data: any; fileName?: string }): string {
    let filename = namingRule;

    // {index} を置換
    filename = filename.replace(/\{index\}/g, context.index.toString());

    // {fileName} を置換（JSONファイル名）
    if (context.fileName) {
      filename = filename.replace(/\{fileName\}/g, context.fileName);
    }

    // {data.property} 形式を置換
    filename = filename.replace(/\{data\.([^}]+)\}/g, (match, property) => {
      const value = this.getNestedProperty(context.data, property);
      return value?.toString() || 'undefined';
    });

    return filename;
  }

  /**
   * ネストされたプロパティの値を取得
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}

export default GentlNode;