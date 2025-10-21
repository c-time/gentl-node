# gentl-node

Node.js環境でのウェブサイトテンプレートファイル処理ライブラリです。[@c-time/gentl](https://www.npmjs.com/package/@c-time/gentl)をラップし、jsdomとNodeのファイルシステムを利用してHTMLテンプレートの生成を行います。

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
import { GentlNode } from 'gentl-node';

const gentlNode = new GentlNode('./project-root', {
  includeDirectory: 'includes',
  deleteTemplateTag: true,
  deleteDataAttributes: true
});

// 単一HTMLファイルを生成
await gentlNode.generateFile(
  'templates/page.html',    // テンプレートファイル
  'data/page-data.json',    // データファイル
  'output/page.html'        // 出力ファイル
);
```

### 複数ファイルの一括生成

```typescript
// データディレクトリ内のすべてのJSONファイルから複数HTMLを生成
const generatedFiles = await gentlNode.generateFiles(
  'templates/product.html',     // テンプレートファイル
  'data/products',              // JSONファイルが格納されたディレクトリ
  'output/products',            // 出力ディレクトリ
  'product-{data.id}.html'      // ファイル名規則
);

console.log('Generated files:', generatedFiles);
// => ['product-001.html', 'product-002.html', ...]
```

## API リファレンス

### GentlNode コンストラクタ

```typescript
new GentlNode(rootDirectory: string, options?: GentlNodeOptions)
```

#### パラメータ

- **rootDirectory** `string` - プロジェクトのルートディレクトリ（必須）
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
  templatePath: string, 
  dataPath: string, 
  outputPath: string
): Promise<void>
```

#### generateFiles()

複数のHTMLファイルを一括生成します。

```typescript
generateFiles(
  templatePath: string,
  dataPath: string,
  outputDir: string,
  namingRule: string
): Promise<string[]>
```

**namingRule で使用可能な変数:**
- `{index}` - 0から始まるインデックス番号
- `{fileName}` - JSONファイル名（拡張子なし）
- `{data.property}` - JSONデータのプロパティ値（ネスト対応）

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

- **パス検証**: すべてのファイルパスはルートディレクトリ内に制限されます
- **ディレクトリトラバーサル防止**: `../` などによる上位ディレクトリへのアクセスを防止
- **型安全性**: TypeScriptによる型チェックでランタイムエラーを削減

## ファイル構造例

```
my-website/
├── templates/
│   ├── index.html
│   └── product.html
├── includes/
│   ├── nav.html
│   ├── footer.html
│   └── components/
│       ├── card.html
│       └── button.html
├── data/
│   ├── index.json
│   └── products/
│       ├── product-1.json
│       ├── product-2.json
│       └── product-3.json
└── output/
    ├── index.html
    └── products/
        ├── product-1.html
        ├── product-2.html
        └── product-3.html
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
- ルートディレクトリ外のファイルアクセス
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

## 関連リンク

- [@c-time/gentl](https://www.npmjs.com/package/@c-time/gentl) - 基盤となるテンプレートエンジン
- [jsdom](https://github.com/jsdom/jsdom) - JavaScript DOM実装