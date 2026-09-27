# API接続の準備

2026-09-27。本人からOpenAI/Cloudflare両方のアカウントありと確認。以下は未実施の設定手順であり、接続済みの記録ではない。現在のWorkerはAI無効が初期値。D1のIDはプレースホルダーで、まだ外部デプロイしていない。

## キーをチャットに貼らず設定する

OpenAIキーはWorkerのSecretだけに置く。iPhoneには別途発行する `ec_` から始まる端末用コードを保存する。メールアドレス、パスワード、APIキー、端末コードをチャット・GitHub・スクリーンショットに載せない。

## 1. ローカルでコードを検証

リポジトリのルートからPowerShellで実行する。

```powershell
cd .\api
npm.cmd ci
npm.cmd run typecheck
npm.cmd test -- --run
npm.cmd run check:bundle
```

このテストは架空のAI応答を使い、実APIを呼ばない。必要なら `WRANGLER_LOG_PATH` を `.wrangler/logs` に設定し、ログを作業場所内に置く。

## 2. Cloudflareに本人がログイン

```powershell
npx.cmd wrangler login
```

ブラウザーの認証は本人が行う。アカウントが複数ある場合は使うアカウントを選ぶ。次の作成・公開手順は、[API契約と費用枠](api-contract.md)を確認してから行う。既存のDBやWorkerを上書きしない。

## 3. D1・端末トークンを準備

```powershell
npx.cmd wrangler d1 create english-coach-usage
```

表示されたdatabase_idを `api/wrangler.jsonc` のゼロのUUIDに設定する。IDは秘密鍵ではない。既存の同名DBを使う場合は内容・用途を確認する。

```powershell
npx.cmd wrangler d1 migrations apply DB --remote
node .\scripts\create-device.mjs owner-iphone
npx.cmd wrangler d1 execute DB --remote --file .\local-data\owner-iphone-register.sql
```

生成ファイルはGit対象外の `api/local-data/` に置かれる。コードはコンソールへ表示しない。`owner-iphone-token.txt` の内容は後で本人のiPhoneに入力する。30日で期限切れ。ファイルを紛失した場合は新しいIDで発行し、旧端末を失効させる。

## 4. OpenAIキーと公開URL

```powershell
npx.cmd wrangler secret put OPENAI_API_KEY
```

表示される入力欄に本人がキーを入力する。キーの作成・課金設定は本人のOpenAI Platformで行う。モデル利用権・残高を確認するまではAI_ENABLEDをfalseに保つ。

準備後、`api/wrangler.jsonc` の `AI_ENABLED` を `"true"` にし、次を実行する。この操作で認証付きAPIを公開し、正しい端末トークンで回答を送ったときだけAI利用が発生する。

```powershell
npm.cmd run deploy
```

公開されたHTTPS URLを、`mobile/.env.example` をコピーした `mobile/.env` の `EXPO_PUBLIC_API_BASE_URL` に設定する。ここへキーや端末コードを書かない。Expoを再起動してアプリを再読み込みする。ExpoのLAN/トンネルURLはバックエンドURLの代わりにはならない。

## 5. iPhoneで1往復を確認

ホームの「接続設定」で端末用コードを保存する。「練習を始める」→「会話の練習へ」→録音→「回答を送信」。架空の呼び名を使い、文字起こし・AIの返答・返答の読み上げを確認する。現在の到達点は最初の1問だけで、画面を離れた後の保存・まとめ・翌日復習は未実装。

型・長さのエラーなら実WAVの形式を確認する。録音内容自体はGitに入れない。結果不明時に再送連打をしない。検証結果は [iphone-validation.md](iphone-validation.md) に、本文やキーを含めず記録する。

## 停止・失効

- 全AI停止：AI_ENABLEDをfalseにして再deploy。既に開始した処理の取消は保証しない。
- 端末失効：`npx.cmd wrangler d1 execute DB --remote --file .\local-data\owner-iphone-revoke.sql`。
- iPhoneの「接続情報を消す」は端末内のコードを削除する。サーバー側の失効や利用枠リセットは行わない。
- 予算の予約が不明なまま残る場合は、OpenAI側の利用量を確認するまで自動解除しない。

公式資料：[Wranglerの認証](https://developers.cloudflare.com/workers/wrangler/commands/#login)、[D1](https://developers.cloudflare.com/d1/get-started/)、[Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)。
