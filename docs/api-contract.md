# 自己紹介API契約 v1

更新：2026-09-27。Task 3のコード契約。実API・iPhoneの往復は未検証。

## 認証と共通の境界

- HTTPSの本人用Workerへ、`Authorization: Bearer ec_…` とUUIDの `X-Request-Id` を送る。キーは `api/scripts/create-device.mjs` で発行するランダムな32 bytes。D1にはSHA-256ハッシュだけを保存し、30日で期限切れ。OpenAIキーとは別物。
- 認証なし/不明トークンは401、期限切れ/失効済みは403。認証後に入力を検証し、その後に利用枠を予約する。DB障害や設定不備は503で、新しいAI処理を開始しない。
- 成功には必ず `requestId` と `usage.estimatedMicroUsd` を含む。使用額はサーバーの保守的な推定値で、請求額そのものではない。
- 失敗は `{ requestId: string|null, stage: "transcription"|"reply"|"summary"|null, code: string, retryable: false }`。この初版は自動再送しない。HTTPレスポンスは `Cache-Control: no-store`。
- ネイティブiPhone用。ブラウザー向けCORSは有効にしない。会話本文・録音・生成結果・認証ヘッダーをD1やアプリログへ記録しない。

## エンドポイント

| POST | 入力 | 成功結果（共通項目に加える） |
|---|---|---|
| `/v1/transcriptions` | multipartの `file`。RIFF/WAVE PCM、little endian、16kHz、mono、16-bit。クライアントのdurationMsは利用枠判定に使わない | `transcript`（1〜500文字） |
| `/v1/replies` | `lessonId`, `questionId`, `transcript`, `support`, `context` | `evaluation` |
| `/v1/summaries` | `lessonId`, UUIDの `sessionId`, `ended`, `attempts` | `sessionId`, `summary` |

音声はファイル5,000,000 bytes、multipart全体5,020,000 bytesまで。RIFF宣言サイズ、fmt/dataチャンク、PCMの各値を検査し、PCMデータ量から1〜90秒を算出する。fmt/dataとJUNK/FLLRパディング以外のチャンクは拒否する。AAC/M4Aのメタデータだけでは圧縮音声の長さと最大料金を確実に制限できないため、初版をWAVに変更した。iPhoneが生成するWAVとの適合は実機確認を残す。

JSON全体は64,000 bytesまで。固定lessonIdは `self-introduction`。questionIdは `intro-name`, `intro-work`, `intro-work-check`, `intro-work-review` のみ。各発言・理由・例文は最大500文字。`context` は `{ questionId, transcript, replyEn }` を最大8件。`support` は英文/意味/型/例の利用、再生回数、遅い再生の有無。追加の未知フィールドを拒否する。

`evaluation` は `outcome`（answered/retry/unassessed）、`reasonJa`, `replyEn`, `correction`（nullまたはoriginal/improved/explanationJa）。correction.originalは本人のtranscript全体と一致する必要がある。次の質問はアプリが選ぶため、replyEnに追加の疑問文を含めない。発音は採点しない。

`ended` はcompleted/interrupted。`attempts` は `{ id, questionId, transcript, evaluation }` を1〜16件。未発話で有料まとめを作らない。`summary` はachievementsJa最大3件、phrases最大3件、rewrites最大2件。phraseはenglish/meaningJa/usageJa/exampleEn/sourceAttemptIdsを持ち、rewriteはattemptId/original/improved/explanationJaを持つ。存在しない試行ID、本人の発言にない引用、重複した入力試行IDを拒否する。復習日・習熟状態・保存は後続の端末ロジックが決める。

両側の検証に使う架空の例：[coach-reply.json](fixtures/coach-reply.json)。実装スキーマは `api/src/schemas.ts` と `mobile/src/api/contracts.ts`。

## モデル・利用枠（2026-09-27に確認）

原案のモデルIDを公式資料で確認し、文字起こしは `gpt-transcribe`、会話/まとめは `gpt-6-luna` を採用する。アカウントの実利用権は未確認。変更する場合は、設定だけでなく料金と入力/出力制約も再検証するため、現実装では別モデルを拒否する。

- gpt-transcribe：公表目安 $0.0045/分。音声は最大90秒なので、2分ぶんの9,000 micro USDを事前予約し、成功時は実PCM長を分単位に切り上げて計上する。
- gpt-6-luna Standard短文脈：入力 $0.10 / 出力 $0.50（各100万tokens）。キャッシュ書込みの1.25倍を見込んで入力は$0.125で計算し、割引を仮定しない。ツールを使わず、reasoningはnone、返信768/まとめ2048 output tokensまで。本文・指示・JSONスキーマのUTF-8 bytes＋4,096の余裕を64,000以内に制限する。
- 最大予約額は返信8,384、まとめ9,024 micro USD。使用tokensが取得できた成功では推定額で確定、usage欠落では予約額全体を計上する。想定以上の費用が報告された場合は、その費用を記録し、以後の新規予約を停止する。
- 全端末合計の暫定停止枠は月$4（4,000,000 micro USD）。**1ドル200円という管理用の仮定で800円相当**であり、為替の実測値や税・決済手数料込みの請求保証ではない。元の月1,000円目標に余裕を持たせる。ホスティング費用は別枠。

根拠：[OpenAI料金](https://developers.openai.com/api/docs/pricing)、[録音ファイルの文字起こし](https://developers.openai.com/api/docs/guides/speech-to-text)、[GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)、[構造化出力](https://developers.openai.com/api/docs/guides/structured-outputs)。アカウント別の実料金・利用量は接続時に確認する。

## 原子的な予約と結果喪失

アップロードと事前検証を終えた予約直前のサーバー時刻で、Asia/Tokyoの月を判定する。入力試行IDの重複、事業者向け本文のサイズ超過も予約前に拒否する。D1の単一INSERT…SELECTで、当月の確定費用＋未確定予約＋今回最大額を上限と比較して予約する。全端末が同じ予算を使い、端末トークンを再発行しても枠は戻らない。読み取りはprimary sessionを使う。

処理IDは全期間で一意。進行中の重複は `REQUEST_IN_PROGRESS`、終了/不明結果の再要求は `RESULT_UNAVAILABLE`（409）。本文をサーバーに残さないため、成功結果の再取得を保証しない。月が変わっても同じ処理IDを有料で再実行しない。

OpenAIのタイムアウト（18秒）、応答不正、拒否、usage確定失敗では予約を解放しない。アプリの通信待ちは25秒で、連打と自動再試行を抑止する。本人が「新しく録音する」を選んで別の回答を送ると、新しい処理IDと利用枠を使う。

D1にはdevice ID、トークンハッシュ、期限/失効、処理ID・種別・月・費用・状態・作成時刻だけを保存する。OpenAI Responsesは `store:false`。これはAI事業者側の保持全般がゼロという意味ではなく、事業者の[データ制御](https://developers.openai.com/api/docs/guides/your-data)の対象になる。
