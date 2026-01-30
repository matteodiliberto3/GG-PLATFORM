use hmac::{Hmac, Mac};
use sha2::Sha256;
use wasm_bindgen::prelude::*;

type HmacSha256 = Hmac<Sha256>;

/// Generates HMAC-SHA256 signature of `payload` with `secret`, returns hex string.
/// Used for X-Signature header on log/alert requests.
#[wasm_bindgen]
pub fn generate_hmac_signature(payload: &str, secret: &str) -> Result<String, JsValue> {
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|_| JsValue::from_str("Invalid secret key length"))?;
    mac.update(payload.as_bytes());
    let result = mac.finalize();
    Ok(hex::encode(result.into_bytes()))
}

// --- Watermarking (invisible / micro-variations) ---

/// Zero-width chars used to encode payload (2 bits each: 00, 01, 10, 11).
const ZW: [char; 4] = ['\u{200B}', '\u{200C}', '\u{200D}', '\u{2060}'];

fn encode_zerowidth(bytes: &[u8]) -> String {
    let mut out = String::new();
    for &b in bytes {
        out.push(ZW[((b >> 6) & 3) as usize]);
        out.push(ZW[((b >> 4) & 3) as usize]);
        out.push(ZW[((b >> 2) & 3) as usize]);
        out.push(ZW[(b & 3) as usize]);
    }
    out
}

fn decode_zerowidth(s: &str) -> Option<Vec<u8>> {
    let mut bytes = Vec::new();
    let mut chars = s.chars().peekable();
    while chars.peek().is_some() {
        let mut byte: u8 = 0;
        for shift in [6, 4, 2, 0] {
            let c = chars.next()?;
            let idx = ZW.iter().position(|&z| z == c)?;
            byte |= (idx as u8) << shift;
        }
        bytes.push(byte);
    }
    Some(bytes)
}

/// Embeds an invisible watermark (zero-width encoding of `user_id`) into `text`.
/// Inserts one encoded byte every 20 characters; any remaining payload bytes are
/// appended at the end so short content (e.g. strategy titles) is still fully traceable.
#[wasm_bindgen]
pub fn embed_watermark(text: &str, user_id: &str) -> String {
    let payload: Vec<u8> = user_id.as_bytes().iter().copied().take(64).collect();
    if payload.is_empty() {
        return text.to_string();
    }

    const INSERT_EVERY: usize = 20;
    let mut out = String::with_capacity(text.len() + payload.len() * 4);
    let mut char_count = 0usize;
    let mut byte_idx = 0usize;

    for c in text.chars() {
        out.push(c);
        char_count += 1;
        if byte_idx < payload.len() && char_count % INSERT_EVERY == 0 {
            let zw = encode_zerowidth(&[payload[byte_idx]]);
            out.push_str(&zw);
            byte_idx += 1;
        }
    }

    if byte_idx < payload.len() {
        out.push_str(&encode_zerowidth(&payload[byte_idx..]));
    }

    out
}

/// Extracts the embedded user_id from watermarked text (zero-width decoding).
/// Collects all zero-width runs in order, decodes each 4-char block to a byte, then UTF-8.
/// Returns empty string if no valid payload found. Used for forensic analysis of leaked/copied text.
#[wasm_bindgen]
pub fn decode_watermark(watermarked_text: &str) -> String {
    let mut runs: Vec<String> = Vec::new();
    let mut run = String::new();
    for c in watermarked_text.chars() {
        if ZW.contains(&c) {
            run.push(c);
        } else {
            if !run.is_empty() {
                runs.push(std::mem::take(&mut run));
            }
        }
    }
    if !run.is_empty() {
        runs.push(run);
    }

    let mut bytes = Vec::new();
    for r in &runs {
        if let Some(b) = decode_zerowidth(r) {
            bytes.extend(b);
        }
    }
    if bytes.is_empty() {
        return String::new();
    }
    match String::from_utf8(bytes) {
        Ok(s) if !s.is_empty() && s.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.') => s,
        _ => String::new(),
    }
}
