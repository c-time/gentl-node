import { JSDOM } from 'jsdom';
import * as fs from 'fs/promises';
import * as path from 'path';
import { process as gentlProcess, type GentlJInput, type GentlJOptions } from '@c-time/gentl';

/**
 * Node.js環境でのウェブサイトテンプレートファイル処理ライブラリ
 * jsdomとNodeのファイルシステムを利用
 */
export class GentlNode {
  private includeDir?: string;
  private options: Partial<GentlJOptions>;

  constructor(options?: Partial<GentlJOptions> & { includeDirectory?: string }) {
    const { includeDirectory, ...gentlOptions } = options || {};
    
    this.includeDir = includeDirectory;
    this.options = {
      deleteTemplateTag: true,
      deleteDataAttributes: true,
      rootParserType: 'htmlDocument',
      domEnvironment: JSDOM as any,
      ...gentlOptions
    };
  }

  /**
   * 単一のHTMLファイルを生成
   * @param templatePath HTMLテンプレートファイルのパス
   * @param dataPath JSONデータファイルのパス
   * @param outputPath 出力ファイルのパス
   */
  async generateFile(templatePath: string, dataPath: string, outputPath: string): Promise<void> {
    try {
      // テンプレートファイルを読み込み
      const html = await fs.readFile(templatePath, 'utf-8');
      
      // データファイルを読み込み
      const dataContent = await fs.readFile(dataPath, 'utf-8');
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
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });

      // 結果をファイルに書き込み
      await fs.writeFile(outputPath, result.html, 'utf-8');

    } catch (error) {
      throw new Error(`Failed to generate file: ${error}`);
    }
  }

  /**
   * 複数のHTMLファイルを生成
   * @param templatePath HTMLテンプレートファイルのパス
   * @param dataPath JSONファイルが格納されているディレクトリのパス
   * @param outputDir 出力ディレクトリのパス
   * @param namingRule ファイル命名規則（例: "page-{index}.html", "item-{data.id}.html"）
   */
  async generateFiles(templatePath: string, dataPath: string, outputDir: string, namingRule: string): Promise<string[]> {
    try {
      // テンプレートファイルを読み込み
      const html = await fs.readFile(templatePath, 'utf-8');
      
      // データディレクトリ内のJSONファイルを読み込み
      const dataFiles = await fs.readdir(dataPath);
      const jsonFiles = dataFiles.filter(file => path.extname(file).toLowerCase() === '.json');

      if (jsonFiles.length === 0) {
        throw new Error('No JSON files found in the specified data directory');
      }

      // includeIoの設定
      const includeIo = await this.buildIncludeIo();

      // 出力ディレクトリを作成
      await fs.mkdir(outputDir, { recursive: true });

      const generatedFiles: string[] = [];

      // 各JSONファイルに対してHTMLファイルを生成
      for (let index = 0; index < jsonFiles.length; index++) {
        const jsonFile = jsonFiles[index];
        const jsonFilePath = path.join(dataPath, jsonFile);
        
        // JSONファイルを読み込み
        const dataContent = await fs.readFile(jsonFilePath, 'utf-8');
        const data = JSON.parse(dataContent);

        // ファイル名を生成（命名規則に従って）
        const filename = this.applyNamingRule(namingRule, { 
          index, 
          data,
          fileName: path.parse(jsonFile).name // JSONファイル名（拡張子なし）も利用可能
        });
        const outputPath = path.join(outputDir, filename);

        // gentlで処理
        const input: GentlJInput = {
          html,
          data,
          includeIo
        };

        const result = await gentlProcess(input, this.options);

        // 結果をファイルに書き込み
        await fs.writeFile(outputPath, result.html, 'utf-8');
        generatedFiles.push(outputPath);
      }

      return generatedFiles;

    } catch (error) {
      throw new Error(`Failed to generate files: ${error}`);
    }
  }

  /**
   * includeIoオブジェクトを構築
   */
  private async buildIncludeIo(): Promise<Record<string, () => Promise<string>> | undefined> {
    if (!this.includeDir) {
      return undefined;
    }

    const includeIo: Record<string, () => Promise<string>> = {};

    try {
      const files = await fs.readdir(this.includeDir);
      
      for (const file of files) {
        const filePath = path.join(this.includeDir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isFile()) {
          // ファイル名（拡張子なし）をキーとして使用
          const key = path.parse(file).name;
          includeIo[key] = async () => {
            return await fs.readFile(filePath, 'utf-8');
          };
        }
      }

      return includeIo;
    } catch (error) {
      console.warn(`Warning: Could not read include directory ${this.includeDir}: ${error}`);
      return undefined;
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