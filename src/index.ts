import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';

// @c-time/gentlを使用予定
// TODO: @c-time/gentlのAPIを確認して実装

/**
 * Node.js環境でのウェブサイトテンプレートファイル処理ライブラリ
 * jsdomとNodeのファイルシステムを利用
 */
export class GentlNode {
  /**
   * テンプレートファイルを読み込み、処理する
   * @param templatePath テンプレートファイルのパス
   */
  public async loadTemplate(templatePath: string): Promise<void> {
    // TODO: 実装予定
    throw new Error('Not implemented yet');
  }

  /**
   * 配列データを流し込んで複数ファイルを生成
   * @param data 配列データ
   * @param namingRule ファイル命名規則
   */
  public async generateFiles(data: any[], namingRule: string): Promise<void> {
    // TODO: 実装予定
    throw new Error('Not implemented yet');
  }
}

export default GentlNode;