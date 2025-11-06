# Trivy Security Scan for Python × Serverless Framework

このサンプルは、Python × Serverless Framework環境向けのTrivyセキュリティスキャンを実行するGitHub Actionsワークフローのサンプルです。

## 概要

[Trivy](https://github.com/aquasecurity/trivy)は、コンテナイメージ、ファイルシステム、Gitリポジトリなどの脆弱性をスキャンするセキュリティツールです。このサンプルでは、開発速度とセキュリティ品質のバランスを取るため、**2つのワークフロー**を提供しています。

### ワークフロー構成

| ワークフロー | 実行タイミング | 実行時間 | 目的 |
|------------|--------------|---------|------|
| **PR用スキャン** | Pull Request作成・更新時 | 2-3分 | 素早い実行 |
| **定期スキャン** | mainへのpush、週次、手動 | 5-10分 | 包括的なセキュリティ監査 |

## ワークフロー機能

### 🔍 スキャン対象

1. **Python依存関係の脆弱性**
   - `requirements.txt`に記載されたパッケージ
   - 既知のCVE（Common Vulnerabilities and Exposures）を検出

2. **設定ファイルの問題**
   - `serverless.yml`の設定ミス
   - AWSリソースのセキュリティ設定

3. **CloudFormationテンプレートのセキュリティ検証**
   - `serverless package`で生成されたCloudFormationテンプレート
   - IAMポリシーの過剰な権限
   - 暗号化されていないリソース
   - パブリックアクセス可能な設定
   - セキュリティグループの問題

4. **シークレット検出**
   - ハードコードされたAPIキー、パスワード、トークン
   - 誤ってコミットされた認証情報

### 📋 ワークフロー詳細

#### 1. PR用スキャン (`.github/workflows/trivy-scan-pr.yml`)

**実行タイミング**:
- Pull Request作成時
- Pull Requestへの追加コミット時

**スキャン内容**:
- ✅ Python依存関係の脆弱性（CRITICAL/HIGH）
- ✅ シークレット検出（APIキー、パスワードなど）

**スキャン結果の確認**:
- PRのコメント

**特徴**:
- **高速実行**: 2-3分で完了
- **重要度優先**: CRITICAL/HIGHのみ検出
- **シークレットブロック**: APIキー漏洩時はマージをブロック

**スキップする項目** (定期スキャンで実施):
- CloudFormationスキャン（時間がかかるため）
- MEDIUM/LOWレベルの脆弱性
- 設定ミススキャン

#### 2. 定期スキャン (`.github/workflows/trivy-scan-scheduled.yml`)

**実行タイミング**:
- `main`ブランチへのpush時
- 毎週月曜日午前10時

**スキャン内容**:
- ✅ Python依存関係の脆弱性（全レベル: CRITICAL～LOW）
- ✅ CloudFormationテンプレートの詳細スキャン
  - `serverless package`を実行してテンプレート生成
  - IAMポリシー、暗号化設定、パブリックアクセス設定などを検証
- ✅ シークレット検出
- ✅ 設定ミススキャン
- ✅ GitHub Security tabへのアップロード
- ✅ 詳細レポートの保存（30日間）

**特徴**:
- 全レベルの脆弱性を検出
- CloudFormationの検証
- 監査証跡として30日間保存
- Security tab統合

### 🎯 主な機能

#### 1. PRコメント機能（PR用スキャンのみ）
Pull Request作成時に、以下の情報を自動的にコメント投稿：

- スキャンしたコミットSHA
- ワークフロー実行へのリンク
- 検出された脆弱性のテーブル表示（CRITICAL/HIGH）
- Securityタブへのリンク

**特徴**:
- 同じPRへの追加コミットでコメントを更新（重複なし）
- 見やすいMarkdown形式
- 定期スキャンへの案内リンク付き

#### 2. GitHub Securityタブへの統合
- SARIF形式でスキャン結果をアップロード
- Securityタブで脆弱性を一元管理
- Code Scanningアラートとして表示
- 過去のトレンドを追跡

#### 3. Serverless Frameworkパッケージング
- Node.jsとServerless Frameworkをセットアップ
- `serverless package`コマンドを実行
- CloudFormationテンプレートを`.serverless/`ディレクトリに生成
- AWSリソース定義の事前検証

#### 4. アーティファクト保存
スキャン結果を30日間保存：
- `trivy-fs-results.sarif` - ファイルシステムスキャン結果
- `trivy-config-results.sarif` - 設定スキャン結果
- `trivy-cloudformation-results.sarif` - CloudFormationスキャン結果
- `trivy-report.json` - 詳細なJSON形式レポート
- `.serverless/` - 生成されたCloudFormationテンプレート

## 使い方

### 前提条件

- GitHubリポジトリに以下の権限が必要：
  - `contents: read`
  - `security-events: write`
  - `pull-requests: write`

### セットアップ

1. **ワークフローファイルを配置**
   ```
   .github/
     workflows/
       trivy-scan-pr.yml         # PR用スキャン
       trivy-scan-scheduled.yml  # 定期スキャン
   ```

2. **Pythonプロジェクトの準備**
   - `requirements.txt`に依存関係を記載
   - `serverless.yml`を配置（Serverless Framework使用時）

### 実行確認

#### PR用スキャンの確認

1. **Pull Request作成**
   - GitHubでPRを作成

2. **PRコメント確認**
   - PRのコメント欄に「🔒 Trivy Security Scan Results (PR)」が自動投稿される
   - CRITICAL/HIGHレベルの脆弱性とシークレットが表示される
   - 実行時間: 約2-3分

#### 定期スキャンの確認

1. **GitHub Actionsタブ**
   - `https://github.com/<owner>/<repo>/actions`
   - "Trivy Security Scan - Scheduled"ワークフローを確認
   - mainへのpush後、または毎週月曜日に自動実行

2. **Securityタブ**
   - `https://github.com/<owner>/<repo>/security/code-scanning`
   - 検出された全レベルの脆弱性を確認
   - CloudFormationの設定ミスもここに表示

3. **アーティファクトのダウンロード**
   - Actionsページから詳細レポートをダウンロード可能
   - 30日間保存される

## カスタマイズ

### PR用スキャンのカスタマイズ

#### スキャン重要度の変更

`.github/workflows/trivy-scan-pr.yml`で、MEDIUMレベルも検出したい場合：

```yaml
severity: 'CRITICAL,HIGH,MEDIUM'  # MEDIUMを追加
```

**注意**: MEDIUMを追加すると実行時間が少し増加します。

#### シークレット検出の無効化

シークレット検出でワークフローを失敗させたくない場合：

```yaml
- name: Run Trivy scan for secrets
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    scan-ref: '.'
    scanners: 'secret'
    format: 'table'
    skip-dirs: 'node_modules'
    exit-code: '0'  # '1' から '0' に変更
```

### 定期スキャンのカスタマイズ

#### スキャン頻度の変更

`.github/workflows/trivy-scan-scheduled.yml`で変更可能：

**日次スキャンに変更**:
```yaml
schedule:
  - cron: '0 1 * * *'  # 毎日 01:00 UTC
```

#### スキャン重要度の変更

LOWレベルを除外したい場合：

```yaml
severity: 'CRITICAL,HIGH,MEDIUM'  # LOW を除外
```

#### スキャナーの選択

両ワークフローで共通。必要なスキャナーのみ指定：

```yaml
scanners: 'vuln,secret,misconfig'  # 必要なスキャナーのみ
```

**オプション**：
- `vuln` - 脆弱性スキャン
- `secret` - シークレット検出
- `misconfig` - 設定ミススキャン
- `license` - ライセンススキャン

### スキャン対象の除外

特定のディレクトリをスキャンから除外する場合、`skip-dirs`を使用します。

デフォルトで`node_modules`は除外されています：

```yaml
skip-dirs: 'node_modules'
```

複数のディレクトリを除外する場合：

```yaml
skip-dirs: 'node_modules,vendor,.venv'
```

**除外している理由**：
- `node_modules`: Serverless Frameworkのビルドツール依存関係であり、実際のデプロイには含まれない
- これらのライブラリの脆弱性は本番環境に影響しない

## ディレクトリ構成

```
.
├── .github/
│   └── workflows/
│       ├── trivy-scan-pr.yml          # PR用スキャンワークフロー
│       └── trivy-scan-scheduled.yml   # 定期スキャンワークフロー
├── .gitignore                          # Git除外ファイル
├── handler.py                          # サンプルLambda関数
├── requirements.txt                    # Python依存関係
├── serverless.yml                      # Serverless Framework設定
├── package.json                        # Node.js依存関係（ワークフロー内で自動生成）
├── README.md                           # このファイル
├── WORKFLOW_DESIGN.md                  # ワークフロー設計ドキュメント
├── WORKFLOW_EXPLANATION.md             # ワークフロー詳細解説
└── SCAN_TYPES.md                       # スキャンタイプ解説

# ビルド時に生成されるディレクトリ（.gitignoreで除外）
├── .serverless/                 # serverless packageで生成（定期スキャンのみ）
│   ├── cloudformation-template-create-stack.json
│   ├── cloudformation-template-update-stack.json
│   └── serverless-state.json
├── node_modules/                # npm installで生成（定期スキャンのみ）
└── venv/                        # Python仮想環境
```

## スキャン結果の例

### CloudFormationテンプレートの検出例

`serverless package`で生成されるCloudFormationテンプレートに対して、以下のようなセキュリティ問題が検出されます：

**検出される主な問題**：
- S3バケットのパブリックアクセスブロック設定不足 (HIGH)
- KMS暗号化未使用 (HIGH)
- バケットバージョニング未設定 (MEDIUM)
- ログ記録未設定 (LOW)

これらはServerless Frameworkがデフォルトで生成するデプロイ用S3バケットに関するセキュリティ推奨事項です。

**対処方法**：
`serverless.yml`に以下を追加することで、一部の問題を解消できます：

```yaml
provider:
  deploymentBucket:
    blockPublicAccess: true
    versioning: true
    serverSideEncryption: AES256
```

## トラブルシューティング

### スキャン結果が表示されない

1. **permissions設定を確認**
   - `security-events: write`が必要
   - リポジトリの設定でCode scanningが有効か確認

2. **Pythonパッケージがインストールされているか確認**
   - ワークフローログで`Install dependencies`ステップを確認

3. **SARIF形式の制限**
   - GitHub Free版では一部機能に制限がある場合があります

## 参考リンク

- [Trivy公式ドキュメント](https://aquasecurity.github.io/trivy/)
- [Trivy GitHub Action](https://github.com/aquasecurity/trivy-action)
- [GitHub Code Scanning](https://docs.github.com/en/code-security/code-scanning)
- [Serverless Framework](https://www.serverless.com/)

**Note**: このリポジトリはサンプル・テスト目的です。本番環境で使用する場合は、セキュリティ設定を適切に調整してください。
