import { JSDOM } from 'jsdom';
import * as fs from 'fs/promises';
import * as path from 'path';
import { process as gentlProcess, type GentlJInput, type GentlJOptions } from '@c-time/gentl';

// 新しいIncludeIo型定義に対応（v1.2.0）
type IncludeIo = (key: string, baseData?: object) => Promise<string>;

// includeファイルが見つからない場合のハンドラー関数の型定義
export type IncludeNotFoundHandler = (key: string, baseData?: object) => Promise<string>;

// Logger型定義（gentlパッケージから）
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LogEntry {
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
export type Logger = (entry: LogEntry) => void;

/**
 * Node.js環境でのウェブサイトテンプレートファイル処理ライブラリ
 * jsdomとNodeのファイルシステムを利用
 * rootDirectoryは出力ファイル専用のルートディレクトリとして機能
 */
export class GentlNode {
  private rootDir: string; // 出力ファイル専用のルートディレクトリ
  private includeDir?: string;
  private options: Partial<GentlJOptions>;
  private fileContentCache: Record<string, string> = {}; // ファイル内容のキャッシュ
  private logger: Logger;
  private includeNotFoundHandler?: IncludeNotFoundHandler; // includeファイルが見つからない場合のハンドラー
  private baseData: object = {}; // ベースデータのキャッシュ

  constructor(rootDirectory: string, options?: Partial<GentlJOptions> & { 
    includeDirectory?: string; 
    logger?: Logger;
    includeNotFoundHandler?: IncludeNotFoundHandler;
  }) {
    if (!rootDirectory) {
      throw new Error('Root directory is required');
    }
    
    // rootDirectoryは出力ファイル専用のルートディレクトリとして扱う
    this.rootDir = path.resolve(rootDirectory);
    
    const { includeDirectory, logger, includeNotFoundHandler, ...gentlOptions } = options || {};
    
    // includeDirectoryが指定されている場合、絶対パスまたは現在の作業ディレクトリからの相対パスとして処理
    this.includeDir = includeDirectory ? path.resolve(includeDirectory) : undefined;
    
    // includeファイルが見つからない場合のハンドラーを設定
    this.includeNotFoundHandler = includeNotFoundHandler;
    
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
   * ベースデータを設定
   * @param baseDataPath ベースデータのJSONファイルのパス（絶対パスまたは現在の作業ディレクトリからの相対パス）
   */
  async setBaseData(baseDataPath: string): Promise<void> {
    this.log('info', `Setting base data from file: ${baseDataPath}`);

    try {
      // パスを絶対パスに変換（出力ルートディレクトリとは独立）
      const resolvedBaseDataPath = path.resolve(baseDataPath);

      // ベースデータファイルを読み込み
      const baseDataContent = await fs.readFile(resolvedBaseDataPath, 'utf-8');
      this.baseData = JSON.parse(baseDataContent);

      this.log('info', `Base data loaded and cached successfully from: ${baseDataPath}`);
      this.log('debug', `Base data content`, { data: this.baseData });

    } catch (error) {
      this.log('error', `Failed to load base data: ${baseDataPath}`, {
        error: error as Error,
        data: { baseDataPath }
      });
      throw new Error(`Failed to load base data: ${error}`);
    }
  }

  /**
   * 現在のベースデータを取得
   */
  getBaseData(): object {
    return { ...this.baseData };
  }

  /**
   * ベースデータをクリア（空のオブジェクトに戻す）
   */
  clearBaseData(): void {
    this.baseData = {};
    this.log('info', 'Base data cleared');
  }

  /**
   * データをマージ（ベースデータを優先）
   */
  private mergeData(fileData: object, baseData: object): object {
    return { ...fileData, ...baseData };
  }

  /**
   * 出力パスが出力ルートディレクトリ内にあるかを検証
   */
  private validateOutputPath(filePath: string, description: string): string {
    const resolvedPath = path.resolve(this.rootDir, filePath);
    const relativePath = path.relative(this.rootDir, resolvedPath);
    
    // パスが出力ルートディレクトリの外に出ていないかチェック
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error(`${description} must be within the output root directory: ${this.rootDir}`);
    }
    
    return resolvedPath;
  }

  /**
   * 単一のHTMLファイルを生成
   * @param templatePath HTMLテンプレートファイルのパス（絶対パスまたは現在の作業ディレクトリからの相対パス）
   * @param dataPath JSONデータファイルのパス（絶対パスまたは現在の作業ディレクトリからの相対パス）
   * @param outputPath 出力ファイルのパス（出力ルートディレクトリからの相対パス）
   */
  async generateFile(templatePath: string, dataPath: string, outputPath: string): Promise<void> {
    this.log('info', `Starting file generation`, {
      data: { templatePath, dataPath, outputPath }
    });

    try {
      // テンプレートとデータファイルは自由なパス、出力ファイルのみ出力ルートディレクトリ内に制限
      const resolvedTemplatePath = path.resolve(templatePath);
      const resolvedDataPath = path.resolve(dataPath);
      const resolvedOutputPath = this.validateOutputPath(outputPath, 'Output path');

      this.log('debug', `Paths resolved`, {
        data: { resolvedTemplatePath, resolvedDataPath, resolvedOutputPath }
      });

      // テンプレートファイルを読み込み
      const html = await fs.readFile(resolvedTemplatePath, 'utf-8');
      this.log('debug', `Template file loaded: ${templatePath}`);
      
      // データファイルを読み込み
      const dataContent = await fs.readFile(resolvedDataPath, 'utf-8');
      const fileData = JSON.parse(dataContent);
      this.log('debug', `Data file loaded and parsed: ${dataPath}`);

      // ベースデータとファイルデータをマージ
      const data = this.mergeData(fileData, this.baseData);
      this.log('debug', `Data merged with base data`, {
        data: { fileDataKeys: Object.keys(fileData), baseDataKeys: Object.keys(this.baseData) }
      });

      // includeIoの設定
      const includeIo = await this.buildIncludeIo();
      if (includeIo) {
        this.log('debug', `Include function created successfully`);
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
   * @param templatePath HTMLテンプレートファイルのパス（絶対パスまたは現在の作業ディレクトリからの相対パス）
   * @param dataPath JSONファイルが格納されているディレクトリのパス（絶対パスまたは現在の作業ディレクトリからの相対パス）
   * @param outputDir 出力ディレクトリのパス（出力ルートディレクトリからの相対パス）
   * @param namingRule ファイル命名規則（例: "page-{index}.html", "item-{data.id}.html"）
   */
  async generateFiles(templatePath: string, dataPath: string, outputDir: string, namingRule: string): Promise<string[]> {
    this.log('info', `Starting multiple files generation`, {
      data: { templatePath, dataPath, outputDir, namingRule }
    });

    try {
      // テンプレートとデータディレクトリは自由なパス、出力ディレクトリのみ出力ルートディレクトリ内に制限
      const resolvedTemplatePath = path.resolve(templatePath);
      const resolvedDataPath = path.resolve(dataPath);
      const resolvedOutputDir = this.validateOutputPath(outputDir, 'Output directory');

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
        this.log('debug', `Include function created successfully`);
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
        const fileData = JSON.parse(dataContent);

        // ベースデータとファイルデータをマージ
        const data = this.mergeData(fileData, this.baseData);
        this.log('debug', `Data merged with base data for file: ${jsonFile}`, {
          data: { fileDataKeys: Object.keys(fileData), baseDataKeys: Object.keys(this.baseData) }
        });

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
   * includeIoファンクションを構築
   */
  private async buildIncludeIo(): Promise<IncludeIo | undefined> {
    if (!this.includeDir) {
      this.log('debug', 'No include directory specified');
      return undefined;
    }

    // ファイル情報を格納するマップを作成
    const includeFileMap = new Map<string, string>();

    try {
      this.log('debug', `Building includeIo from directory: ${this.includeDir}`);
      await this.buildIncludeFileMap(this.includeDir, '', includeFileMap);
      
      const fileCount = includeFileMap.size;
      this.log('info', `IncludeIo built successfully with ${fileCount} files`);
      
      // 新しいAPI形式のIncludeIo関数を返す
      const includeIo: IncludeIo = async (key: string, baseData?: object) => {
        const filePath = includeFileMap.get(key);
        if (!filePath) {
          this.log('warn', `Include file not found: ${key}`);
          
          // includeNotFoundHandlerが設定されている場合はそれを使用
          if (this.includeNotFoundHandler) {
            this.log('info', `Using include not found handler for key: ${key}`);
            return await this.includeNotFoundHandler(key, baseData);
          }
          
          // includeNotFoundHandlerが設定されていない場合はエラー
          const errorMessage = `Include file not found and no include not found handler provided: ${key}`;
          this.log('error', errorMessage, { data: { key } });
          throw new Error(errorMessage);
        }

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
   * includeファイルマップを再帰的に構築
   */
  private async buildIncludeFileMap(
    currentDir: string, 
    relativePath: string, 
    includeFileMap: Map<string, string>
  ): Promise<void> {
    const files = await fs.readdir(currentDir);
    
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isDirectory()) {
        // 子ディレクトリを再帰的に処理
        const newRelativePath = relativePath ? `${relativePath}/${file}` : file;
        await this.buildIncludeFileMap(filePath, newRelativePath, includeFileMap);
      } else if (stat.isFile()) {
        // ファイル名（相対パス + 拡張子あり）をキーとして使用
        // 環境依存のパスセパレーターを統一して "/" に正規化
        const key = relativePath ? `${relativePath}/${file}` : file;
        includeFileMap.set(key, filePath);
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