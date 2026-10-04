# API接続の準備

作成：2026-09-27。更新：2026-10-04。D1の接続設定・初期マイグレーション・owner-iphone登録・Worker公開が完了。本人がキー設定済みと明示し、月$4の新規処理停止枠でAI有効化を承認したため、AI_ENABLEDはtrueに変更済み。架空の文字による自己紹介で実AIの返答を確認した。iPhoneの実録音・文字起こしからの一往復は未確認。以下は新規設定時の手順を含むため、完了したDB作成や端末発行を繰り返さない。

接続先：`https://english-coach-api.english-coach-lab-2026.workers.dev`。この作業場所の `mobile/.env` に公開URLのみ設定済み。端末コードやOpenAIキーは含めない。

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

DBをまだ作成していない場合だけ実行する。

```powershell
npx.cmd wrangler d1 create english-coach-usage
```

表示されたdatabase_idを `api/wrangler.jsonc` の **bindingが `DB` の項目**へ設定する。IDは秘密鍵ではない。作成時にWranglerが設定を自動追加すると、`english_coach_usage` など別名の項目と、ゼロのUUIDが残った `DB` が並ぶことがある。このアプリでは `DB` のdatabase_idを実際のIDに置き換え、同じDBを指す追加項目を除いて1つにまとめる。`migrations_dir: "migrations"` は残す。自動追加を選ばず既存の `DB` を手動で更新してもよい。[Cloudflareのbinding設定](https://developers.cloudflare.com/d1/get-started/#3-bind-your-worker-to-your-d1-database)

`DB` がゼロのUUIDを指す状態では先に進まない。2026-10-04にこのリポジトリの設定は実際のDBへ修正済み。既存の同名DBを使う場合は内容・用途を確認する。

```powershell
npx.cmd wrangler d1 migrations apply DB --remote
```

成功を確認してから端末発行へ進む。次の発行コマンドは **その端末IDで初めて発行するときだけ** 実行する。

```powershell
node .\scripts\create-device.mjs owner-iphone
```

`EEXIST` は既存コードの上書きを防いだ状態。`local-data/` に同じ端末IDのtoken.txt・register.sql・revoke.sqlがそろっていれば再発行せずに使用する。既存ファイルを削除してやり直さない。ファイルが一部しかない場合や期限切れなら、状態を確認して新しいIDでの発行・旧端末の失効を行う。

まだ登録されていない端末だけ登録する。2026-10-04にowner-iphoneは登録済みで、このコマンドの再実行も不要。

```powershell
npx.cmd wrangler d1 execute DB --remote --file .\local-data\owner-iphone-register.sql
```

生成ファイルはGit対象外の `api/local-data/` に置かれる。コードはコンソールへ表示しない。`owner-iphone-token.txt` の内容は後で本人のiPhoneに入力する。30日で期限切れ。ファイルを紛失した場合は新しいIDで発行し、旧端末を失効させる。

今回の確認結果：D1の未適用マイグレーション0件、owner-iphoneの登録1件、既存ローカルコードと登録ハッシュの一致、有効期限内・未失効を確認。コード本文は出力していない。

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

PCとiPhoneを同じWi-Fiに接続する。リポジトリの `mobile/` で `npm.cmd start` を実行し、表示されたQRコードをiPhoneのカメラで読み、Expo Goで開く。PC側のサーバーは起動したままにする。2026-10-04のLAN接続先は `exp://192.168.68.52:8081`。IPは変わるため、後日使うときは起動時のQRを優先する。

画面・読み上げ・録音の確認だけなら接続コードは不要。AIへ送るときに `api/local-data/owner-iphone-token.txt` の端末用コードを、iPhoneの「接続設定」へ保存する。コード本文をチャットに貼らない。Cloudflareの公開URLをブラウザーで開いてもアプリ画面は表示されない（API専用）。

ホームの「接続設定」で端末用コードを保存する。「練習を始める」→「会話の練習へ」→録音→「回答を送信」。架空の呼び名を使い、文字起こし・AIの返答・返答の読み上げを確認する。現在の到達点は最初の1問だけで、画面を離れた後の保存・まとめ・翌日復習は未実装。

型・長さのエラーなら実WAVの形式を確認する。録音内容自体はGitに入れない。結果不明時に再送連打をしない。検証結果は [iphone-validation.md](iphone-validation.md) に、本文やキーを含めず記録する。

AI接続の失敗は、事業者側の認証・利用許可・依頼形式・残高/利用上限・一時的なレート制限・通信失敗・不正応答に分類して表示する。事業者が返す生のエラー文やキーは表示しない。自動再送はしない。

## 停止・失効

- 全AI停止：AI_ENABLEDをfalseにして再deploy。既に開始した処理の取消は保証しない。
- 端末失効：`npx.cmd wrangler d1 execute DB --remote --file .\local-data\owner-iphone-revoke.sql`。
- iPhoneの「接続情報を消す」は端末内のコードを削除する。サーバー側の失効や利用枠リセットは行わない。
- 予算の予約が不明なまま残る場合は、OpenAI側の利用量を確認するまで自動解除しない。

公式資料：[Wranglerの認証](https://developers.cloudflare.com/workers/wrangler/commands/#login)、[D1](https://developers.cloudflare.com/d1/get-started/)、[Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)。
