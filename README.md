# English Coach

日本語の補助を使いながら、1日15分を目安にビジネス英会話を練習するiPhoneアプリです。WindowsでExpo＋React Native＋TypeScriptを使って開発します。

**現在は設計・開発準備の段階です。アプリ本体、API、データベース、テスト環境は未実装です。** `docs/english-coach-flow.html` は操作イメージであり、録音・音声再生・AI応答・学習履歴保存は実装されていません。

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
| [AGENTS.md](AGENTS.md) | このリポジトリで作業するエージェント向けのルール |

記述が異なる場合は、最新のユーザー指示、確定条件、実装計画の暫定方針、元の設計提案、HTMLのサンプルの順で扱います。提案をユーザーが承認済みの条件として扱わず、変更の理由と状態を資料に残します。

## 今できること

リポジトリのルートからPowerShellで画面イメージを開けます。

```powershell
Start-Process .\docs\english-coach-flow.html
```

ボタンによる画面遷移を確認できます。元の表示環境のアイコン・外側の装飾に依存する箇所があり、ブラウザー単独では表示が一部異なります。日付・会話・達成表示は固定サンプルです。通常のブラウザーでの再読込後の保存もありません。

まだ `package.json` はないため、現時点で `npm install` や `npm start` によるアプリ起動はできません。アプリ初期化は実装計画のTask 1で行います。

## Windows＋iPhoneでの開発方針

- 最初はこのリポジトリ1か所で、1つの作業を順番に進めます。`mobile/` と `api/` を後で同じリポジトリ内に作る計画です。
- Node.js LTSとnpmを使い、初期化時にExpo SDK・React Native・TypeScriptの互換バージョンを決めてlockfileをコミットします。[Expoの作成手順](https://docs.expo.dev/get-started/create-a-project/)
- 最初の実機確認はiPhoneのExpo Goを使用します。WindowsとiPhoneを同じWi-Fiに接続し、LAN接続を確認します。接続できない場合はWindows Firewall・ネットワーク分離を確認し、必要に応じてExpoのトンネルを使います。
- Windows上のiOSシミュレーターを前提にしません。独立したアプリに進む段階でEASのクラウドビルドと署名・配布条件を確認します。[Expo FAQ](https://docs.expo.dev/faq/#can-i-develop-ios-apps-on-a-windows-computer)
- 録音は `expo-audio`、読み上げは `expo-speech` を第一候補にします。iPhoneのサイレントモードでは `expo-speech` が無音になるため、解除した状態と無音時の案内を実機確認します。[Audio](https://docs.expo.dev/versions/latest/sdk/audio/)・[Speech](https://docs.expo.dev/versions/latest/sdk/speech/)

## 秘密情報とデータ

AI事業者のAPIキーはバックエンドだけに置きます。アプリ内・Git・`EXPO_PUBLIC_*` には入れません。`EXPO_PUBLIC_*` は配布コードから読める公開値です。[Expoの環境変数](https://docs.expo.dev/guides/environment-variables/#security-considerations)

`.env`、`.dev.vars`、署名鍵、実際の録音・学習データはコミット対象外です。設定例を追加するときは、値を空にした `.env.example` / `.dev.vars.example` に説明を書きます。教材用の架空データと実データを区別します。

端末保存でも、AI処理時は録音と必要なテキストをバックエンド・AI事業者へ送ります。保存範囲と通信について初回に説明する計画です。モデル名・料金・音声形式・端末認証方式は、実装前に再確認する項目です。

## Gitと検証

この準備一式を `main` の初回コミットとします。その後の実装は同じ作業場所で `codex/<内容>` ブランチを使い、小さい単位でコミットします。土台が固まるまではworktreeを作りません。導入条件は[実装計画](docs/superpowers/plans/2026-09-26-self-introduction.md#作業場所とgit運用)に記載しています。

現時点の確認は資料の整合性・リンク・差分・秘密情報の混入を対象にします。アプリの型チェック、テスト、iPhoneでの動作確認は実装後に行い、未実施を成功扱いにしません。
