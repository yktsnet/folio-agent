## widgetプレビュー・プレイグラウンドの作成
id: 08
branch-slug: feat/widget-playground
github_issue:
status: closed
type: feat
closed_reason: superseded by 10_init-wizard-cli.md（テーマ検証は対話CLI + 利用者自身のdevサーバーで行う方針に変更し、ダミーサイトのプレイグラウンドは作らない）
対象: packages/handler/dev/public/playground.html (新規), packages/handler/dev/public/index.html
内容: ウィジェットのカラーカスタマイズ、プレビュー、および導入用埋め込みコードの生成をリアルタイムで行えるプレイグラウンドページの構築。
確認: 手動ブラウザ確認

---

### 背景と目的

開発者が自身のWebサイトへウィジェットを導入する前に、視覚的にテーマ（アクセントカラーや背景、文字色）を調整し、実際の表示や挙動を確認した上で、必要な設定コードをワンクリックで入手できる「プレイグラウンド」を提供します。

既存の開発用ハーネス（`packages/handler/dev/public/`）内に新しい検証用HTMLファイルとして作成します。

### 仕様詳細

#### 1. プレビュー用UIの作成 (`packages/handler/dev/public/playground.html`)

以下の機能を持つシングルページを新規作成します。

* **左サイドパネル（設定エリア）**:
  * **カラーピッカー**:
    * アクセント色（`--folio-agent-accent`）
    * パネル背景色（`--folio-agent-surface`）
    * 本文文字色（`--folio-agent-text`）
  * **フォントファミリー選択**:
    * monospace や sans-serif などを選択し、`--folio-agent-font` を切り替えられるトグル。
  * **ダークモード切り替え（プレビュー連動）**:
    * ONにすると、親要素に `.dark` クラスを付与し、かつ `style.colorScheme = 'dark'` を設定。プレビューのダミーサイト背景も暗い配色に切り替わるようにする。
* **右側エリア（ダミーサイトプレビュー）**:
  * 一般的なブログ、あるいはポートフォリオを模したダミーの背景デザインを表示します。
  * その右下に本物の `<folio-agent-widget>` を常駐させます。
  * 左側のカラーピッカー等の変更を検知し、ウィジェット要素の CSS 変数を JavaScript でリアルタイムに上書きします（`widget.style.setProperty(...)`）。
* **コード出力エリア**:
  * 現在設定されているカラーコードを埋め込んだ `<style>` タグおよび `<folio-agent-widget>` の埋め込みコードをテキストエリア等に生成。
  * 「Copy Code」ボタンでワンクリックコピーできるようにします。
  * 例：
    ```html
    <folio-agent-widget endpoint="/api/chat" policy-href="/data-policy/"></folio-agent-widget>
    <style>
      folio-agent-widget {
        --folio-agent-accent: #2563eb;
        --folio-agent-surface: #ffffff;
        --folio-agent-text: #1f2937;
      }
    </style>
    ```

#### 2. ポータルからの導線追加 (`packages/handler/dev/public/index.html`)

開発用ハーネスのトップページである `index.html` に、プレイグラウンド（`playground.html`）へのリンク（例: `「ウィジェット用プレイグラウンド (テーマ検証)」`）を追加します。
