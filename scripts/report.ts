/**
 * Trivy スキャン結果を集計してChatworkに通知するスクリプト
 */

import { readFileSync, existsSync } from 'fs';

// 型定義
interface Vulnerability {
  Severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  VulnerabilityID: string;
  PkgName: string;
  InstalledVersion: string;
  FixedVersion: string;
  Title: string;
}

interface Misconfiguration {
  Severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  ID: string;
  Title: string;
  Message: string;
}

interface TrivyResult {
  Results?: Array<{
    Vulnerabilities?: Vulnerability[];
    Misconfigurations?: Misconfiguration[];
  }>;
}

interface SeverityCount {
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
}

/**
 * 環境変数の取得と検証
 */
const getEnvVariables = () => {
  const chatworkApiToken = process.env.CHATWORK_API_TOKEN;
  const chatworkRoomId = process.env.CHATWORK_ROOM_ID;
  const githubRepository = process.env.GITHUB_REPOSITORY;
  const githubRefName = process.env.GITHUB_REF_NAME;
  const githubRunNumber = process.env.GITHUB_RUN_NUMBER;
  const githubServerUrl = process.env.GITHUB_SERVER_URL;
  const githubRunId = process.env.GITHUB_RUN_ID;

  if (!chatworkApiToken || !chatworkRoomId) {
    console.error('Error: CHATWORK_API_TOKEN and CHATWORK_ROOM_ID are required');
    process.exit(1);
  }

  return {
    chatworkApiToken,
    chatworkRoomId,
    githubRepository: githubRepository || 'unknown',
    githubRefName: githubRefName || 'unknown',
    githubRunNumber: githubRunNumber || '0',
    githubServerUrl: githubServerUrl || 'https://github.com',
    githubRunId: githubRunId || '0',
  };
};

/**
 * JSONファイルから脆弱性をカウント
 */
const countVulnerabilities = (filePath: string): SeverityCount => {
  const count: SeverityCount = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };

  if (!existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return count;
  }

  try {
    const data = readFileSync(filePath, 'utf8');
    const report: TrivyResult = JSON.parse(data);

    if (!report.Results) {
      return count;
    }

    for (const result of report.Results) {
      if (result.Vulnerabilities) {
        for (const vuln of result.Vulnerabilities) {
          if (vuln.Severity in count) {
            count[vuln.Severity]++;
          }
        }
      }
    }

    return count;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return count;
  }
};

/**
 * JSONファイルから設定ミスをカウント
 */
const countMisconfigurations = (filePath: string): SeverityCount => {
  const count: SeverityCount = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };

  if (!existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return count;
  }

  try {
    const data = readFileSync(filePath, 'utf8');
    const report: TrivyResult = JSON.parse(data);

    if (!report.Results) {
      return count;
    }

    for (const result of report.Results) {
      if (result.Misconfigurations) {
        for (const misc of result.Misconfigurations) {
          if (misc.Severity in count) {
            count[misc.Severity]++;
          }
        }
      }
    }

    return count;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return count;
  }
};

/**
 * Chatworkメッセージを作成
 */
const createChatworkMessage = (
  total: SeverityCount,
  env: ReturnType<typeof getEnvVariables>
): string => {
  const totalCount =
    total.CRITICAL + total.HIGH + total.MEDIUM + total.LOW;

  let warningMsg = '';
  if (total.CRITICAL > 0 || total.HIGH > 0) {
    warningMsg = '\n\n⚠️ CRITICAL/HIGHレベルの問題があります。確認してください。';
  }

  const message = [
    '[info][title]🔒 Trivy Security Scan 結果[/title]',
    `リポジトリ: ${env.githubRepository}`,
    `ブランチ: ${env.githubRefName}`,
    `実行: #${env.githubRunNumber}`,
    '',
    '【検出結果】',
    '[hr]',
    `🔴 CRITICAL: ${total.CRITICAL}件`,
    `🟠 HIGH: ${total.HIGH}件`,
    `🟡 MEDIUM: ${total.MEDIUM}件`,
    `⚪️ LOW: ${total.LOW}件`,
    '[hr]',
    `合計: ${totalCount}件の問題を検出`,
    warningMsg,
    '',
    `詳細: ${env.githubServerUrl}/${env.githubRepository}/security/code-scanning`,
    `ワークフロー: ${env.githubServerUrl}/${env.githubRepository}/actions/runs/${env.githubRunId}[/info]`,
  ].join('\n');

  return message;
};

/**
 * Chatworkに通知を送信
 */
const sendToChatwork = async (
  message: string,
  apiToken: string,
  roomId: string
): Promise<void> => {
  const url = `https://api.chatwork.com/v2/rooms/${roomId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-ChatWorkToken': apiToken,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ body: message }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to send message to Chatwork: ${response.status} ${errorText}`
    );
  }

  console.log('✅ Successfully sent notification to Chatwork');
};

/**
 * メイン処理
 */
const main = async () => {
  console.log('📊 Aggregating Trivy scan results...');

  // 環境変数を取得
  const env = getEnvVariables();

  // ファイルシステムスキャン結果を集計
  console.log('Reading trivy-report.json...');
  const vulnerabilities = countVulnerabilities('trivy-report.json');

  // CloudFormationスキャン結果を集計
  console.log('Reading trivy-cloudformation.json...');
  const misconfigurations = countMisconfigurations('trivy-cloudformation.json');

  // 合計を計算
  const total: SeverityCount = {
    CRITICAL: vulnerabilities.CRITICAL + misconfigurations.CRITICAL,
    HIGH: vulnerabilities.HIGH + misconfigurations.HIGH,
    MEDIUM: vulnerabilities.MEDIUM + misconfigurations.MEDIUM,
    LOW: vulnerabilities.LOW + misconfigurations.LOW,
  };

  console.log('\n📋 Scan Results:');
  console.log(`  🔴 CRITICAL: ${total.CRITICAL}`);
  console.log(`  🟠 HIGH: ${total.HIGH}`);
  console.log(`  🟡 MEDIUM: ${total.MEDIUM}`);
  console.log(`  ⚪️ LOW: ${total.LOW}`);
  console.log(
    `  📊 Total: ${total.CRITICAL + total.HIGH + total.MEDIUM + total.LOW}\n`
  );

  // Chatworkメッセージを作成
  const message = createChatworkMessage(total, env);

  // Chatworkに送信
  console.log('📤 Sending notification to Chatwork...');
  await sendToChatwork(message, env.chatworkApiToken, env.chatworkRoomId);
};

// スクリプト実行
main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
