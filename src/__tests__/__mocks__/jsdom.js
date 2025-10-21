// JSDOMのモック - テスト用
class MockJSDOM {
  constructor(html) {
    this.window = {
      document: {
        documentElement: {
          outerHTML: html || '<html><body></body></html>'
        }
      }
    };
  }
}

module.exports = {
  JSDOM: MockJSDOM
};