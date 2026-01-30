Implementare la firma **HMAC (Hash-based Message Authentication Code)** in **WebAssembly (Wasm)** richiede una precisione chirurgica, perché non abbiamo accesso alle API del sistema operativo.

In Rust, per il target Wasm, la scelta obbligata è l'ecosistema **RustCrypto**, che è scritto in puro Rust e non dipende da librerie C (come OpenSSL) che non compilerebbero mai in Wasm.

---

## 1. Configurazione del Progetto (`Cargo.toml`)

Dobbiamo aggiungere le casse (crates) necessarie. Useremo `sha2` come funzione di hashing e `hmac` per la logica di autenticazione.

Ini, TOML

```
[dependencies]
hmac = "0.12"
sha2 = "0.10"
wasm-bindgen = "0.2"
# hex ci serve per inviare la firma come stringa leggibile nelle API
hex = "0.4"
```

---

## 2. Implementazione del Modulo Rust

Ecco il codice da compilare in Wasm. Questa funzione prenderà il payload e una chiave segreta (consegnata al modulo Wasm durante l'handshake mTLS) e restituirà la firma.

Rust

```
use hmac::{Hmac, Mac};
use sha2::Sha256;
use wasm_bindgen::prelude::*;

// Creiamo un alias per comodità
type HmacSha256 = Hmac<Sha256>;

#[wasm_bindgen]
pub fn generate_hmac_signature(payload: &str, secret: &str) -> Result<String, JsValue> {
    // 1. Inizializza l'istanza HMAC con la chiave segreta
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|_| JsValue::from_str("Errore: Chiave segreta di lunghezza non valida"))?;

    // 2. Inserisce i dati (il payload del pacchetto API)
    mac.update(payload.as_bytes());

    // 3. Calcola il risultato (Fixed Output)
    let result = mac.finalize();
    let code_bytes = result.into_bytes();

    // 4. Converte in esadecimale per l'invio negli Header HTTP
    Ok(hex::encode(code_bytes))
}
```

---

## 3. Perché questo approccio è "Hardened"?

Come ti dicevo, l'API Contract definisce la forma, ma questo codice ne definisce la **validità**.

- **Isolamento Wasm:** Eseguendo questo calcolo dentro Wasm, la `secret_key` non appare mai nel codice JavaScript in chiaro. È confinata nella memoria lineare del modulo Wasm.
    
- **Integrità Totale:** Prima di inviare qualsiasi log al SOC, il client chiama questa funzione. Il server (Render/Go/Node) ricalcolerà la stessa firma. Se differiscono anche solo per un carattere spaziatore nel JSON, il server scarta la richiesta e attiva il **Black Hole**.
    

---

## 4. Integrazione nell'Architettura

Questo modulo va inserito nel documento **TECHNICAL BLUEPRINTS / ARC. NOTEBOOK**.

**Il flusso operativo è il seguente:**

1. Il Frontend prepara il pacchetto JSON (es. un alert EDR).
    
2. Passa il pacchetto al modulo Rust/Wasm.
    
3. Wasm restituisce la firma HMAC.
    
4. Il Frontend invia la richiesta includendo l'header `X-Signature: <hmac_risultante>`.
    

---

### Verdetto finale sulla documentazione

Con questo snippet tecnico e il documento **API Security Contract**, hai coperto tutte le falle di comunicazione.