# English Coach

日本語の補助を使いながら、1日15分を目安にビジネス英会話を練習するiPhoneアプリです。WindowsでExpo＋React Native＋TypeScriptを使って開発します。

**最初の1問をAIへ送る実装と、接続準備まで進めています。** `mobile/` に質問・日本語補助・読み上げ・録音・送信・返答表示・接続設定、`api/` に認証と利用枠付きのCloudflare Workerがあります。実API接続とiPhoneの音声確認は未実施です。次の質問、永続保存、まとめ画面、翌日復習は未実装です。`docs/english-coach-flow.html` は元の操作イメージとして残しています。

## 最初の到達点

自己紹介の「名前と仕事」1レッスンで、次の流れを本人のiPhoneで通します。

```mermaid
flowchart LR
    A[英語の質問] --> B[必要に応じて日本語の意味・回答例]
    B --> C[本人が録音して送信]
    C --> D[文字起こし・AIの返答]
    D --> E[終了後のまとめを端末に保存]
    E --> F[翌日、別の質問で復習]
```

ログインなしで会話の文字・表現・学習状況をiPhoneに保存します。AI利用料の目標は月1,000円以内で、開発・配布費は別枠です。自己紹介の後に雑談、短いプレゼンへ広げます。

## 資料

| ファイル | 役割 |
|---|---|
| [設計案](docs/english-coach-design.md) | 2026-09-23時点の原資料。確定した利用条件と設計提案を含む |
| [画面イメージ](docs/english-coach-flow.html) | 画面遷移・日本語の補助・学習記録のモック |
| [決定事項・未決事項](docs/development-readiness.md) | 確定条件、提案、実装前の確認事項、モックとの差分 |
| [自己紹介1レッスンの実装計画](docs/superpowers/plans/2026-09-26-self-introduction.md) | 実装順序、対象ファイル、データとAPIの境界、受け入れ条件 |
| [実機・開発検証記録](docs/iphone-validation.md) | 実行済みの検証、未確認事項、次のiPhone確認手順 |
| [API契約](docs/api-contract.md) | 音声形式、入出力、端末認証、モデル、利用枠と再送の扱い |
| [API接続手順](docs/api-setup.md) | Cloudflare・OpenAIを本人の環境で設定し、iPhoneから接続する手順 |
| [AGENTS.md](AGENTS.md) | このリポジトリで作業するエージェント向けのルール |

記述が異なる場合は、最新のユーザー指示、確定条件、実装計画の暫定方針、元の設計提案、HTMLのサンプルの順で扱います。提案をユーザーが承認済みの条件として扱わず、変更の理由と状態を資料に残します。

## 今できること

リポジトリのルートからPowerShellで画面イメージを開けます。

```powershell
Start-Process .\docs\english-coach-flow.html
```

ボタンによる画面遷移を確認できます。元の表示環境のアイコン・外側の装飾に依存する箇所があり、ブラウザー単独では表示が一部異なります。日付・会話・達成表示は固定サンプルです。通常のブラウザーでの再読込後の保存もありません。

Expoアプリは次の手順で起動します。

```powershell
cd .\mobile
npm.cmd ci
npm.cmd start
```

WindowsとiPhoneを同じWi-Fiに接続し、ターミナルのQRコードをiPhoneのカメラで読み、Expo Goで開きます。SDK 57に対応するExpo Goが必要です。[Expo Goの対応SDK](https://expo.dev/go)

ブラウザーでの画面確認は `npm.cmd run web`。これはiPhoneの録音・読み上げ・保存の確認を代替しません。検証状況は[実機検証記録](docs/iphone-validation.md)に記載します。

設定前でも最初の質問で読み上げ・録音・破棄を確認できます。AIを使うには[接続手順](docs/api-setup.md)に従ってサーバーを設定し、iPhoneの「接続設定」に端末用コードを保存します。録音は最大90秒で止まり、本人が「回答を送信」を押したときに送ります。架空の呼び名で確認してください。再起動後の履歴・一時ファイル回復は今後対応します。

```powershell
# mobile/ 内で実行
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test -- --runInBand
npx.cmd expo-doctor
```

API側の検証は次のとおりです。テストは架空の応答を使い、`check:bundle` は公開しないdry-runです。

```powershell
# api/ 内で実行
npm.cmd ci
npm.cmd run typecheck
npm.cmd test -- --run
npm.cmd run check:bundle
```

## Windows＋iPhoneでの開発方針

- 最初はこのリポジトリ1か所で、1つの作業を順番に進めます。`mobile/` と `api/` を同じリポジトリ内に置きます。
- Node.js LTSとnpmを使い、初期化時にExpo SDK・React Native・TypeScriptの互換バージョンを決めてlockfileをコミットします。[Expoの作成手順](https://docs.expo.dev/get-started/create-a-project/)
- 最初の実機確認はiPhoneのExpo Goを使用します。WindowsとiPhoneを同じWi-Fiに接続し、LAN接続を確認します。接続できない場合はWindows Firewall・ネットワーク分離を確認し、必要に応じてExpoのトンネルを使います。
- Windows上のiOSシミュレーターを前提にしません。独立したアプリに進む段階でEASのクラウドビルドと署名・配布条件を確認します。[Expo FAQ](https://docs.expo.dev/faq/#can-i-develop-ios-apps-on-a-windows-computer)
- 録音は `expo-audio`、読み上げは `expo-speech` を採用しました。iPhoneのサイレントモードでは `expo-speech` が無音になるため、解除した状態と無音時の案内を実機確認します。[Audio](https://docs.expo.dev/versions/latest/sdk/audio/)・[Speech](https://docs.expo.dev/versions/latest/sdk/speech/)

## 秘密情報とデータ

AI事業者のAPIキーはバックエンドだけに置きます。アプリ内・Git・`EXPO_PUBLIC_*` には入れません。`EXPO_PUBLIC_*` は配布コードから読める公開値です。[Expoの環境変数](https://docs.expo.dev/guides/environment-variables/#security-considerations)

`.env`、`.dev.vars`、署名鍵、実際の録音・学習データはコミット対象外です。設定例を追加するときは、値を空にした `.env.example` / `.dev.vars.example` に説明を書きます。教材用の架空データと実データを区別します。

AI処理時は録音と必要なテキストをCloudflare経由でOpenAIへ送ります。設定画面で通信と未実装の保存機能を説明しています。サーバーには認証・利用量のメタデータだけを保存し、Responsesは `store:false` を指定します。事業者側の保持全般がゼロという意味ではありません。

本人用の端末コードはiPhoneのSecureStoreへ、OpenAIキーはWorkerのSecretへ置きます。初期設定はAI無効で、接続先URL・端末コード・サーバー設定をそろえるまでは使えません。暫定の新規処理停止枠は全端末合計で月$4です。料金・換算の前提と限界は[API契約](docs/api-contract.md)に記載します。

## Gitと検証

この準備一式を `main` の初回コミットとします。その後の実装は同じ作業場所で `codex/<内容>` ブランチを使い、小さい単位でコミットします。土台が固まるまではworktreeを作りません。導入条件は[実装計画](docs/superpowers/plans/2026-09-26-self-introduction.md#作業場所とgit運用)に記載しています。

mobileの型チェック・lint・36テスト、APIの型チェック・33テスト、Expo Doctor 21項目が成功し、iOS向けJavaScriptバンドルとWorkerのdry-runを確認済みです。実AI・ネイティブビルド・iPhone実行の成功を意味しません。未確認項目は[検証記録](docs/iphone-validation.md)に残します。
