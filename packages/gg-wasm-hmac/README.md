# gg-wasm-hmac

Wasm module for HMAC-SHA256 signing (X-Signature). Used by Access (and optionally Editor) to sign log/alert payloads before sending to the API.

## Build

Requires [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/) and Rust (e.g. `rustup target add wasm32-unknown-unknown`).

```bash
wasm-pack build --target web
```

Output: `pkg/` (gg_wasm_hmac.js, gg_wasm_hmac_bg.wasm, etc.).

## Integration (Access)

After building, copy `pkg/` so the Access app can load it at runtime:

```bash
cp -r pkg ../../apps/access/public/pkg
```

(or on Windows: `xcopy /E /I pkg ..\..\apps\access\public\pkg`)

Access loads the module from `/pkg/gg_wasm_hmac.js` and uses `signPayload` / `sendEdrLog` from `lib/edr-log.ts` before sending EDR logs (e.g. copy_attempt, focus_loss) to `POST /v1/edr/log` with header `X-Signature`.

## Usage (JS)

```js
import init, { generate_hmac_signature } from "./pkg/gg_wasm_hmac.js";
await init(); // or init(await fetch("./pkg/gg_wasm_hmac_bg.wasm"));
const payload = JSON.stringify({ event_type: "copy_attempt", timestamp: new Date().toISOString() });
const signature = generate_hmac_signature(payload, secret);
// Send request with header X-Signature: <signature>
```

## API

- **generate_hmac_signature(payload: string, secret: string) -> string**  
  Returns HMAC-SHA256 of `payload` with `secret`, hex-encoded.

- **embed_watermark(text: string, user_id: string) -> string**  
  Embeds an invisible watermark (zero-width encoding of `user_id`) into `text`. Inserts one encoded byte every 20 characters. Used in the Reader Strategie view so that copy-paste or leaked HTML carries a unique user identifier; forensic analysis can recover the user_id from the text.

- **decode_watermark(watermarked_text: string) -> string**  
  Extracts the embedded `user_id` from watermarked text. Returns empty string if no valid payload. Use for forensic analysis: given leaked/copied text (e.g. from a screenshot OCR or pasted content), call this to recover the user_id and then resolve to nickname in your backend.
