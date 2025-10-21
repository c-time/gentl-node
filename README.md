# gentl-node

Node.js環境でのウェブサイトテンプレートファイル処理ライブラリです。[@c-time/gentl](https://www.npmjs.com/package/@c-time/gentl)をラップし、jsdomとNodeのファイルシステムを利用してHTMLの生成を行います。

## 特徴

- 🚀 **高性能**: ファイル内容のキャッシュ機能で高速処理
- 🔒 **セキュア**: ルートディレクトリベースのパス検証でディレクトリトラバーサル攻撃を防止
- 📁 **柔軟な構造**: 再帰的なincludeディレクトリサポート
- 📝 **包括的ログ**: gentlに準じた詳細なログ機能
- ⚡ **バッチ処理**: JSONファイルから複数HTMLファイルの一括生成
- 🛡️ **エラーハンドリング**: includeファイル未発見時のカスタムハンドラー対応

## インストール

```bash
npm install gentl-node
```

## 基本的な使用方法

### 単一ファイルの生成

```typescript
import { GentlNode, type IGentlNode } from 'gentl-node';

const gentlNode: IGentlNode = new GentlNode('./output-root', {
  includeDirectory: './includes',  // 絶対パスまたはカレントディレクトリからの相対パス
  deleteTemplateTag: true,
  deleteDataAttributes: true
});

// 単一HTMLファイルを生成
await gentlNode.generateFile(
  './templates/page.html',     // テンプレートファイル（カレントディレクトリから）
  './data/page-data.json',     // データファイル（カレントディレクトリから）
  'page.html'                  // 出力ファイル（出力ルートディレクトリから）
);
```

### 複数ファイルの一括生成

```typescript
// データディレクトリ内のすべてのJSONファイルから複数HTMLを生成
const generatedFiles = await gentlNode.generateFiles(
  './templates/product.html',   // テンプレートファイル（カレントディレクトリから）
  './data/products',            // JSONファイルが格納されたディレクトリ（カレントディレクトリから）
  'products',                   // 出力ディレクトリ（出力ルートディレクトリから）
  'product-{data.id}.html'      // ファイル名規則
);

console.log('Generated files:', generatedFiles);
// => ['products/product-001.html', 'products/product-002.html', ...]
```

## API リファレンス

### IGentlNode インターフェース

```typescript
interface IGentlNode {
  setBaseData(baseDataPath: string): Promise<void>;
  generateFile(templatePath: string, dataPath: string, outputPath: string): Promise<void>;
  generateFiles(templatePath: string, dataPath: string, outputDir: string, namingRule: string): Promise<string[]>;
}
```

### GentlNode コンストラクタ

```typescript
class GentlNode implements IGentlNode {
  constructor(outputRootDirectory: string, options?: GentlNodeOptions)
}
```

#### パラメータ

- **outputRootDirectory** `string` - 出力ファイル専用のルートディレクトリ（必須）
- **options** `GentlNodeOptions` - 設定オプション（省略可能）

#### GentlNodeOptions

```typescript
type GentlNodeOptions = Partial<GentlJOptions> & {
  includeDirectory?: string;                    // includeファイルのディレクトリ
  logger?: Logger;                             // カスタムロガー
  includeNotFoundHandler?: IncludeNotFoundHandler; // include未発見時のハンドラー
}
```

### メソッド

#### generateFile()

単一のHTMLファイルを生成します。

```typescript
generateFile(
  templatePath: string,   // 絶対パスまたは現在の作業ディレクトリからの相対パス
  dataPath: string,       // 絶対パスまたは現在の作業ディレクトリからの相対パス  
  outputPath: string      // 出力ルートディレクトリからの相対パス
): Promise<void>
```

#### generateFiles()

複数のHTMLファイルを一括生成します。

```typescript
generateFiles(
  templatePath: string,   // 絶対パスまたは現在の作業ディレクトリからの相対パス
  dataPath: string,       // 絶対パスまたは現在の作業ディレクトリからの相対パス
  outputDir: string,      // 出力ルートディレクトリからの相対パス
  namingRule: string
): Promise<string[]>
```

**namingRule で使用可能な変数:**
- `{index}` - 0から始まるインデックス番号
- `{fileName}` - JSONファイル名（拡張子なし）
- `{data.property}` - JSONデータのプロパティ値（ネスト対応）

#### ベースデータ管理

```typescript
// ベースデータを設定（全てのファイル生成でマージされる）
setBaseData(baseDataPath: string): Promise<void>  // 絶対パスまたは現在の作業ディレクトリからの相対パス
```

## 高度な使用方法

### カスタムロガーの使用

```typescript
import { GentlNode, type Logger } from 'gentl-node';

const customLogger: Logger = (entry) => {
  // カスタムログ処理
  console.log(`[${entry.level}] ${entry.message}`);
  if (entry.context?.error) {
    console.error(entry.context.error);
  }
};

const gentlNode = new GentlNode('./project', {
  logger: customLogger
});
```

### ベースデータの使用

全てのファイル生成で共通して使用されるベースデータを設定できます。

```typescript
import { GentlNode, type IGentlNode } from 'gentl-node';

const gentlNode: IGentlNode = new GentlNode('./project');

// ベースデータを設定
await gentlNode.setBaseData('data/base.json');

// 以降のgenerateFile/generateFilesでベースデータが自動的にマージされる
await gentlNode.generateFile('templates/page.html', 'data/page.json', 'output/page.html');
```

**データマージの仕組み:**
- ファイルデータとベースデータがマージされます
- 同じプロパティがある場合、**ベースデータが優先**されます
- マージ例: `{...fileData, ...baseData}`

### includeNotFoundHandlerの設定

includeファイルが見つからない場合のカスタム処理を定義できます。

```typescript
const gentlNode = new GentlNode('./project', {
  includeDirectory: 'includes',
  includeNotFoundHandler: async (key: string, baseData?: object) => {
    // カスタム処理（例：デフォルトコンテンツの提供）
    console.warn(`Include file not found: ${key}`);
    return `<div class="missing-include">Content for "${key}" is not available</div>`;
  }
});
```

未設定の場合、includeファイルが見つからないとエラーがスローされます。

### includeディレクトリの使用

```
project/
├── templates/
│   └── page.html
├── includes/
│   ├── header.html
│   ├── footer.html
│   └── components/
│       └── button.html
└── data/
    └── page.json
```

テンプレート内でのinclude使用例：

```html
<!-- templates/page.html -->
<html>
<head>
    <title>My Page</title>
</head>
<body>
    <div data-gentl-include="header.html"></div>
    
    <main>
        <h1 data-gentl-text="title">Page Title</h1>
        <div data-gentl-include="components/button.html"></div>
    </main>
    
    <div data-gentl-include="footer.html"></div>
</body>
</html>
```

## セキュリティ

- **出力パス検証**: 出力ファイルのパスは出力ルートディレクトリ内に制限されます
- **ディレクトリトラバーサル防止**: `../` などによる出力ルートディレクトリ外へのアクセスを防止
- **入力ファイル自由度**: テンプレートファイルとデータファイルは任意の場所から読み込み可能
- **型安全性**: TypeScriptによる型チェックでランタイムエラーを削減

## ファイル構造例

```
my-project/
├── templates/              # テンプレートファイル（任意の場所）
│   ├── index.html
│   └── product.html
├── includes/               # includeファイル（任意の場所）
│   ├── nav.html
│   ├── footer.html
│   └── components/
│       ├── card.html
│       └── button.html
├── data/                   # データファイル（任意の場所）
│   ├── base.json          # ベースデータ（全ファイル共通）
│   ├── index.json
│   └── products/
│       ├── product-1.json
│       ├── product-2.json
│       └── product-3.json
└── dist/                   # 出力専用ディレクトリ（出力ルートディレクトリ）
    ├── index.html
    └── products/
        ├── product-1.html
        ├── product-2.html
        └── product-3.html
```

**使用例:**
```typescript
const gentlNode = new GentlNode('./dist', {
  includeDirectory: './includes'
});

await gentlNode.setBaseData('./data/base.json');
await gentlNode.generateFile('./templates/index.html', './data/index.json', 'index.html');
```

**data/base.json の例:**
```json
{
  "siteName": "My Website",
  "version": "1.0.0",
  "author": "John Doe",
  "meta": {
    "description": "Welcome to my website",
    "keywords": ["web", "site", "example"]
  }
}
```

**data/products/product-1.json の例:**
```json
{
  "title": "Product 1",
  "price": "$29.99",
  "description": "Amazing product description"
}
```

**マージ後のデータ（product-1.html生成時）:**
```json
{
  "title": "Product 1",
  "price": "$29.99", 
  "description": "Amazing product description",
  "siteName": "My Website",
  "version": "1.0.0",
  "author": "John Doe",
  "meta": {
    "description": "Welcome to my website",
    "keywords": ["web", "site", "example"]
  }
}
```

## ログレベル

- **debug**: 詳細な処理情報
- **info**: 一般的な情報（ファイル生成完了など）
- **warn**: 警告（includeファイル未発見など）
- **error**: エラー（ファイル読み込み失敗など）

## エラーハンドリング

```typescript
try {
  await gentlNode.generateFile('template.html', 'data.json', 'output.html');
} catch (error) {
  console.error('Generation failed:', error.message);
}
```

よくあるエラー：
- 出力ルートディレクトリ外への出力アクセス試行
- 存在しないテンプレート・データファイル
- 不正なJSONデータ
- includeファイル未発見（ハンドラー未設定時）

## 依存関係

- [@c-time/gentl](https://www.npmjs.com/package/@c-time/gentl) - コアテンプレート処理エンジン
- [jsdom](https://www.npmjs.com/package/jsdom) - DOM操作環境
- Node.js 組み込みモジュール (fs/promises, path)

## ライセンス

このプロジェクトのライセンスについては、LICENSE ファイルを参照してください。

## 貢献

バグレポートや機能リクエストは、GitHubのIssuesページでお受けしています。

## 開発・貢献

### 開発環境のセットアップ

```bash
git clone https://github.com/c-time/gentl-node.git
cd gentl-node
npm install
```

### スクリプト

```bash
npm run build       # TypeScriptビルド
npm run dev         # 開発モード（ファイル監視）
npm test            # テスト実行
npm run test:watch  # テスト監視モード
npm run test:coverage # カバレッジ付きテスト
npm run clean       # ビルドファイル削除
```

### 公開

```bash
npm run prepublishOnly  # ビルド＋テスト
npm publish            # npm公開
```

## 関連リンク

- [@c-time/gentl](https://www.npmjs.com/package/@c-time/gentl) - 基盤となるテンプレートエンジン
- [jsdom](https://github.com/jsdom/jsdom) - JavaScript DOM実装