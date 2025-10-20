import { JSDOM } from 'jsdom';
import * as fs from 'fs/promises';
import * as path from 'path';
import { process as gentlProcess, type GentlJInput, type GentlJOptions } from '@c-time/gentl';

// 新しいIncludeIo型定義に対応
type IncludeIoFunction = (baseData?: object) => Promise<string>;
type IncludeIo = Record<string, IncludeIoFunction>;

// Logger型定義（gentlパッケージから）
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
interface LogEntry {
  level: LogLevel;
  message: string;
  context?: {
    element?: string;
    attribute?: string;
    formula?: string;
    data?: any;
    error?: Error;
  };
  timestamp: Date;
}
type Logger = (entry: LogEntry) => void;

/**
 * Node.js環境でのウェブサイトテンプレートファイル処理ライブラリ
 * jsdomとNodeのファイルシステムを利用
 */
export class GentlNode {
  private rootDir: string;
  private includeDir?: string;
  private options: Partial<GentlJOptions>;
  private fileContentCache: Record<string, string> = {}; // ファイル内容のキャッシュ
  private logger: Logger;

  constructor(rootDirectory: string, options?: Partial<GentlJOptions> & { includeDirectory?: string; logger?: Logger }) {
    if (!rootDirectory) {
      throw new Error('Root directory is required');
    }
    
    this.rootDir = path.resolve(rootDirectory);
    
    const { includeDirectory, logger, ...gentlOptions } = options || {};
    
    // includeDirectoryが指定されている場合、ルートディレクトリからの相対パスとして処理
    this.includeDir = includeDirectory ? path.resolve(this.rootDir, includeDirectory) : undefined;
    
    // ログ機能の設定（デフォルトロガーまたはカスタムロガー）
    this.logger = logger || this.createDefaultLogger();
    
    this.options = {
      deleteTemplateTag: true,
      deleteDataAttributes: true,
      rootParserType: 'htmlDocument',
      domEnvironment: JSDOM as any,
      logger: this.logger, // gentlにもloggerを渡す
      ...gentlOptions
    };
  }

  /**
   * デフォルトロガーを作成
   */
  private createDefaultLogger(): Logger {
    return (entry: LogEntry) => {
      const timestamp = entry.timestamp.toISOString();
      const level = entry.level.toUpperCase().padEnd(5);
      let message = `[${timestamp}] ${level} ${entry.message}`;
      
      if (entry.context) {
        const contextParts: string[] = [];
        if (entry.context.element) contextParts.push(`element: ${entry.context.element}`);
        if (entry.context.attribute) contextParts.push(`attribute: ${entry.context.attribute}`);
        if (entry.context.formula) contextParts.push(`formula: ${entry.context.formula}`);
        if (entry.context.data) contextParts.push(`data: ${JSON.stringify(entry.context.data)}`);
        if (entry.context.error) contextParts.push(`error: ${entry.context.error.message}`);
        
        if (contextParts.length > 0) {
          message += ` (${contextParts.join(', ')})`;
        }
      }
      
      // レベルに応じてコンソール出力を変更
      switch (entry.level) {
        case 'error':
          console.error(message);
          break;
        case 'warn':
          console.warn(message);
          break;
        case 'info':
          console.info(message);
          break;
        case 'debug':
          console.debug(message);
          break;
        default:
          console.log(message);
      }
    };
  }

  /**
   * ログエントリを作成してロガーに送信
   */
  private log(level: LogLevel, message: string, context?: Partial<LogEntry['context']>): void {
    this.logger({
      level,
      message,
      context,
      timestamp: new Date()
    });
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
    this.log('info', `Starting file generation`, {
      data: { templatePath, dataPath, outputPath }
    });

    try {
      // パスを検証し、ルートディレクトリ内の絶対パスに変換
      const resolvedTemplatePath = this.validatePath(templatePath, 'Template path');
      const resolvedDataPath = this.validatePath(dataPath, 'Data path');
      const resolvedOutputPath = this.validatePath(outputPath, 'Output path');

      this.log('debug', `Paths resolved`, {
        data: { resolvedTemplatePath, resolvedDataPath, resolvedOutputPath }
      });

      // テンプレートファイルを読み込み
      const html = await fs.readFile(resolvedTemplatePath, 'utf-8');
      this.log('debug', `Template file loaded: ${templatePath}`);
      
      // データファイルを読み込み
      const dataContent = await fs.readFile(resolvedDataPath, 'utf-8');
      const data = JSON.parse(dataContent);
      this.log('debug', `Data file loaded and parsed: ${dataPath}`);

      // includeIoの設定
      const includeIo = await this.buildIncludeIo();
      if (includeIo) {
        this.log('debug', `Include files loaded: ${Object.keys(includeIo).length} files`);
      }

      // gentlで処理
      const input: GentlJInput = {
        html,
        data,
        includeIo
      };

      this.log('debug', `Processing template with gentl`);
      const result = await gentlProcess(input, this.options);

      // 出力ディレクトリを作成（存在しない場合）
      const outputDir = path.dirname(resolvedOutputPath);
      await fs.mkdir(outputDir, { recursive: true });

      // 結果をファイルに書き込み
      await fs.writeFile(resolvedOutputPath, result.html, 'utf-8');
      
      this.log('info', `File generation completed successfully: ${outputPath}`);

    } catch (error) {
      this.log('error', `Failed to generate file: ${templatePath}`, {
        error: error as Error,
        data: { templatePath, dataPath, outputPath }
      });
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
    this.log('info', `Starting multiple files generation`, {
      data: { templatePath, dataPath, outputDir, namingRule }
    });

    try {
      // パスを検証し、ルートディレクトリ内の絶対パスに変換
      const resolvedTemplatePath = this.validatePath(templatePath, 'Template path');
      const resolvedDataPath = this.validatePath(dataPath, 'Data path');
      const resolvedOutputDir = this.validatePath(outputDir, 'Output directory');

      // テンプレートファイルを読み込み
      const html = await fs.readFile(resolvedTemplatePath, 'utf-8');
      this.log('debug', `Template file loaded: ${templatePath}`);
      
      // データディレクトリ内のJSONファイルを読み込み
      const dataFiles = await fs.readdir(resolvedDataPath);
      const jsonFiles = dataFiles.filter(file => path.extname(file).toLowerCase() === '.json');

      if (jsonFiles.length === 0) {
        this.log('error', `No JSON files found in data directory: ${dataPath}`);
        throw new Error('No JSON files found in the specified data directory');
      }

      this.log('info', `Found ${jsonFiles.length} JSON files to process`);

      // includeIoの設定
      const includeIo = await this.buildIncludeIo();
      if (includeIo) {
        this.log('debug', `Include files loaded: ${Object.keys(includeIo).length} files`);
      }

      // 出力ディレクトリを作成
      await fs.mkdir(resolvedOutputDir, { recursive: true });

      const generatedFiles: string[] = [];

      // 各JSONファイルに対してHTMLファイルを生成
      for (let index = 0; index < jsonFiles.length; index++) {
        const jsonFile = jsonFiles[index];
        const jsonFilePath = path.join(resolvedDataPath, jsonFile);
        
        this.log('debug', `Processing file ${index + 1}/${jsonFiles.length}: ${jsonFile}`);
        
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
        
        this.log('debug', `Generated: ${relativeOutputPath}`);
      }

      this.log('info', `Multiple files generation completed: ${generatedFiles.length} files generated`);
      return generatedFiles;

    } catch (error) {
      this.log('error', `Failed to generate files`, {
        error: error as Error,
        data: { templatePath, dataPath, outputDir, namingRule }
      });
      throw new Error(`Failed to generate files: ${error}`);
    }
  }

  /**
   * includeIoオブジェクトを構築
   */
  private async buildIncludeIo(): Promise<IncludeIo | undefined> {
    if (!this.includeDir) {
      this.log('debug', 'No include directory specified');
      return undefined;
    }

    const includeIo: IncludeIo = {};

    try {
      this.log('debug', `Building includeIo from directory: ${this.includeDir}`);
      await this.buildIncludeIoRecursive(this.includeDir, '', includeIo);
      
      const fileCount = Object.keys(includeIo).length;
      this.log('info', `IncludeIo built successfully with ${fileCount} files`);
      
      return includeIo;
    } catch (error) {
      this.log('warn', `Could not read include directory`, {
        error: error as Error,
        data: { includeDir: this.includeDir }
      });
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
          // キャッシュに生ファイル内容があるかチェック
          let content: string;
          if (this.fileContentCache[key] !== undefined) {
            content = this.fileContentCache[key];
          } else {
            // キャッシュにない場合はファイルを読み込んでキャッシュに保存
            content = await fs.readFile(filePath, 'utf-8');
            this.fileContentCache[key] = content;
          }
          
          // 読み込んだコンテンツを返す直前にgentl変換処理を適用
          const processedContent = await gentlProcess({
            html: content,
            data: baseData || {},
            includeIo: includeIo // 再帰的なincludeも可能
          }, this.options);

          return processedContent.html;
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