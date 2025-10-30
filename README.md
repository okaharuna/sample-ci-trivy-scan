# Trivy Security Scan for Python × Serverless Framework

このリポジトリは、Python × Serverless Framework環境向けのTrivyセキュリティスキャンを実行するGitHub Actionsワークフローのサンプルです。

## 概要

[Trivy](https://github.com/aquasecurity/trivy)は、コンテナイメージ、ファイルシステム、Gitリポジトリなどの脆弱性をスキャンするセキュリティツールです。このワークフローは、Python依存関係、Serverless Frameworkで生成されるCloudFormationテンプレート、設定ファイル、シークレットの検出を自動化します。

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

### 📋 実行タイミング

`.github/workflows/trivy-scan.yml:3-13`で定義されています：

- **Push時**: `main`、`develop`ブランチへのプッシュ
- **Pull Request時**: `main`、`develop`ブランチへのPR作成・更新
- **手動実行**: GitHub ActionsのUIから手動トリガー
- **日次スキャン**: (コメントアウト済み) 毎日00:00 UTCに実行可能

### 🎯 主な機能

#### 1. Serverless Frameworkパッケージング
- Node.jsとServerless Frameworkをセットアップ
- `serverless package`コマンドを実行
- CloudFormationテンプレートを`.serverless/`ディレクトリに生成

#### 2. ファイルシステムスキャン
```yaml
- 脆弱性 (vuln)
- シークレット (secret)
- 設定ミス (misconfig)
```

#### 3. CloudFormationテンプレートスキャン
生成されたCloudFormationテンプレート（`.serverless/`配下）を対象に：
- AWSリソースの設定ミスを検出
- IAMポリシーの過剰な権限を警告
- セキュリティベストプラクティスの違反をチェック

#### 4. GitHub Securityタブへの統合
- SARIF形式でスキャン結果をアップロード
- Securityタブで脆弱性を一元管理
- Code Scanningアラートとして表示

#### 5. PRコメント機能
Pull Request作成時に、以下の情報を自動的にコメント投稿：

- スキャンしたコミットSHA
- ワークフロー実行へのリンク
- 検出された脆弱性のテーブル表示
- Securityタブへのリンク

**特徴**:
- 同じPRへの追加コミットでコメントを更新（重複なし）
- CRITICAL/HIGH/MEDIUM の重要度でフィルタリング
- 見やすいMarkdown形式

#### 6. アーティファクト保存
スキャン結果を30日間保存：
- `trivy-fs-results.sarif` - ファイルシステムスキャン結果
- `trivy-config-results.sarif` - 設定スキャン結果
- `trivy-cloudformation-results.sarif` - CloudFormationスキャン結果
- `trivy-report.json` - 詳細なJSON形式レポート
- `trivy-pr-report.txt` - PR用テーブル形式レポート
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
   .github/workflows/trivy-scan.yml
   ```

2. **Pythonプロジェクトの準備**
   - `requirements.txt`に依存関係を記載
   - `serverless.yml`を配置（Serverless Framework使用時）

3. **コミット＆プッシュ**
   ```bash
   git add .
   git commit -m "Add Trivy security scan workflow"
   git push origin main
   ```

### 実行確認

1. **GitHub Actionsタブ**
   - `https://github.com/<owner>/<repo>/actions`
   - ワークフローの実行状況を確認

2. **Securityタブ**
   - `https://github.com/<owner>/<repo>/security/code-scanning`
   - 検出された脆弱性を確認

3. **Pull Requestコメント**
   - PRを作成すると自動的にコメントが投稿される

## カスタマイズ

### スキャン重要度の変更

`.github/workflows/trivy-scan.yml:47`で変更可能：

```yaml
severity: 'CRITICAL,HIGH,MEDIUM'  # LOW を追加することも可能
```

### スキャナーの選択

`.github/workflows/trivy-scan.yml:48`で変更可能：

```yaml
scanners: 'vuln,secret,misconfig'  # 必要なスキャナーのみ指定
```

オプション：
- `vuln` - 脆弱性スキャン
- `secret` - シークレット検出
- `misconfig` - 設定ミススキャン
- `license` - ライセンススキャン

### 日次スキャンの有効化

`.github/workflows/trivy-scan.yml:12-15`のコメントを解除：

```yaml
schedule:
  # Run daily at 00:00 UTC
  - cron: '0 0 * * *'
```

### 特定ブランチのみスキャン

`.github/workflows/trivy-scan.yml:4-11`でブランチを指定：

```yaml
on:
  push:
    branches:
      - main        # mainブランチのみ
  pull_request:
    branches:
      - main        # mainへのPRのみ
```

### exit-codeの設定

脆弱性検出時にワークフローを失敗させる場合：

```yaml
exit-code: '1'  # 0から1に変更すると、脆弱性検出時に失敗
```

## ディレクトリ構成

```
.
├── .github/
│   └── workflows/
│       └── trivy-scan.yml      # Trivyスキャンワークフロー
├── .gitignore                   # Git除外ファイル
├── handler.py                   # サンプルLambda関数
├── requirements.txt             # Python依存関係
├── serverless.yml               # Serverless Framework設定
├── package.json                 # Node.js依存関係（自動生成）
└── README.md                    # このファイル

# ビルド時に生成されるディレクトリ（.gitignoreで除外）
├── .serverless/                 # serverless packageで生成
│   ├── cloudformation-template-create-stack.json
│   ├── cloudformation-template-update-stack.json
│   └── serverless-state.json
├── node_modules/                # npm installで生成
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

### PRコメントが投稿されない

1. **permissions設定を確認**
   - `pull-requests: write`が必要

2. **PR作成元ブランチを確認**
   - フォークからのPRでは、セキュリティ上の理由で権限が制限される場合があります

## 参考リンク

- [Trivy公式ドキュメント](https://aquasecurity.github.io/trivy/)
- [Trivy GitHub Action](https://github.com/aquasecurity/trivy-action)
- [GitHub Code Scanning](https://docs.github.com/en/code-security/code-scanning)
- [Serverless Framework](https://www.serverless.com/)

**Note**: このリポジトリはサンプル・テスト目的です。本番環境で使用する場合は、セキュリティ設定を適切に調整してください。
