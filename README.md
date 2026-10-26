# Coordinatore di transazioni watch-only per cold storage
Implementazione client/server in React e Flask interfacciata via JSON-RPC nativo a Bitcoin Core (standard BIP 32 / BIP 174).

## 1. Obiettivo e Problema Risolto
L'applicazione risolve il problema del coordinamento sicuro dei fondi conservati in dispositivi air-gapped (Cold Wallet). Adottando un'architettura watch-only, il sistema separa la preparazione dei dati (online) dalla firma autorizzativa (offline). Manipola esclusivamente chiavi pubbliche estese (xpub) e transazioni PSBT, garantendo l'impossibilità matematica di esfiltrare chiavi private dal server.

## 2. Architettura e Stack Tecnologico
Il progetto è strutturato su un'architettura a tre livelli, disaccoppiando il livello di persistenza relazionale dal registro distribuito on-chain:
*   **Frontend (React/Vite):** Interfaccia reattiva per il calcolo dei saldi e l'acquisizione delle firme via QR scanner (Air-Gap).
*   **Backend (Python/Flask):** Gateway RESTful e client RPC nativo.
*   **Database (SQLite/SQLAlchemy):** Persistenza off-chain per caching UTXO, tracciamento bozze transazionali e ottimizzazione delle performance.
*   **Blockchain (Bitcoin Core):** Demone isolato in modalità `regtest` per la validazione del consenso e la simulazione locale dei blocchi.

## 3. Istruzioni di Installazione e Avvio
L'intero ambiente è automatizzato e containerizzato per garantire l'esecuzione self-hosted su qualsiasi sistema. 
Assicurarsi di avere Docker e Docker Compose installati, quindi eseguire nella root del progetto:

    docker compose up -d

Il frontend sarà accessibile all'indirizzo http://localhost:3000, mentre il backend e il nodo Bitcoin Core dialogheranno internamente sulla rete virtuale Docker.

## 4. Dichiarazione d'uso di strumenti di Intelligenza Artificiale Generativa
Si dichiara che per la realizzazione del presente progetto software ci si è avvalsi dell'ausilio dei seguenti strumenti di Intelligenza Artificiale Generativa:
*   **Gemini / GitHub Copilot**: utilizzato per la scrittura di codice boilerplate (React UI, script Python), debugging delle chiamate JSON-RPC verso Bitcoin Core e supporto nella stesura dell'infrastruttura Docker Compose.
L'architettura crittografica, la logica di business e il design Zero-Trust basato sugli standard industriali (BIP 174) rimangono interamente frutto dell'elaborazione originale dell'autore. L'autore dichiara di aver effettuato personalmente la verifica funzionale e di sicurezza del codice generato, assumendosi la piena e personale responsabilità del progetto presentato.

## 📁 Struttura del Repository

```text
├── .postman/           # Collezioni e script per il testing delle API REST
├── Server_Flask/       # Backend Python/Flask, modelli DB SQLite e client Bitcoin RPC
├── frontend/           # Interfaccia grafica React/Vite (dashboard, QR scanner e PSBT builder)
├── postman/globals/    # Variabili d'ambiente globali per le chiamate API
├── .gitignore          # Esclusione dipendenze pesanti (node_modules, venv, cache)
├── bitcoin.conf        # Configurazione demone Bitcoin Core in modalità Regtest
├── docker-compose.yml  # Orchestrazione container per esecuzione self-hosted
└── README.md           # Documentazione architetturale e istruzioni di avvio
```
## Architettura del Flusso Dati (Scambio dati Air-Gap)

Di seguito il diagramma di sequenza che illustra l'interazione tra i componenti:

```mermaid
sequenceDiagram
    autonumber
    actor U as Utente
    participant FE as Frontend (React)
    participant BE as Backend (Flask API)
    participant RPC as Bitcoin Core (RPC Node)
    participant HW as Dispositivo Offline (Cold Wallet)

    %% 1. Inizializzazione
    rect rgb(240, 245, 255)
    Note over U, RPC: 1. Setup Watch-Only
    HW->>U: Esporta Master Public Key / Descriptor
    U->>FE: Inserisce xpub / Descriptor (/import)
    FE->>BE: POST /api/wallet/import-xpub
    BE->>RPC: createwallet(watchonly=true) + importdescriptors
    RPC-->>BE: 200 OK
    BE-->>FE: Wallet importato (ID / Nome)
    end

    %% 2. Ricezione
    rect rgb(245, 255, 240)
    Note over U, RPC: 2. Ricezione Fondi
    U->>FE: Naviga su /receive
    FE->>BE: GET /api/wallet/receive-address
    BE->>RPC: getnewaddress
    RPC-->>BE: Indirizzo pubblico generato
    BE-->>FE: Indirizzo Bitcoin
    FE->>FE: Mostra Indirizzo & QR Code
    end

    %% 3. Flusso Air-Gap
    rect rgb(255, 245, 240)
    Note over U, HW: 3. Creazione e Firma PSBT (Send)
    U->>FE: Inserisce indirizzo, importo, fee rate
    FE->>BE: POST /api/tx/create-psbt
    BE->>RPC: walletcreatefundedpsbt
    RPC-->>BE: PSBT Non Firmata (Base64)
    BE-->>FE: draft_id + psbt_base64
    FE->>FE: Renderizza QR Code (PSBT Unsigned)

    Note over FE, HW: Canale Ottico Air-Gap (Nessuna connessione di rete)
    HW->>FE: Scansione fotocamera del QR Code
    HW->>HW: Verifica importo, destinatario e fee
    HW->>HW: Firma con Chiavi Private (signpsbt)
    HW->>HW: Mostra a video QR Code con PSBT Firmata

    FE->>HW: Scansione webcam (QRScanner) o inserimento manuale
    end

    %% 4. Broadcast
    rect rgb(250, 240, 255)
    Note over FE, RPC: 4. Finalizzazione & Broadcast
    FE->>BE: POST /api/tx/broadcast { signed_psbt, draft_id }
    BE->>RPC: finalizepsbt(signed_psbt)
    RPC-->>BE: Raw Transaction Hex
    BE->>RPC: sendrawtransaction(raw_hex)
    RPC-->>BE: TXID
    BE-->>FE: Risposta con TXID
    FE-->>U: Notifica di successo & visualizzazione TXID
    end
```
##Diagramma Architetturale dei Componenti (Online vs Offline)
Un diagramma a blocchi per illustrare l'architettura dei confini di rete e sicurezza:
```mermaid
flowchart TD
    subgraph OnlineEnv["Ambiente Connesso (Host / Docker)"]
        direction TB
        subgraph ClientTier["Frontend Tier (Port 5173)"]
            UI["React SPA"]
            QRDisp["QRDisplay (qrcode.react)"]
            QRScan["QRScanner (html5-qrcode)"]
            UI --> QRDisp
            UI --> QRScan
        end

        subgraph ServerTier["Backend Tier (Port 5000)"]
            Flask["Flask REST API (app.py)"]
            SQLite[("SQLite DB (app.db)")]
            RPCClient["RPC Wrapper (bitcoin_rpc.py)"]
            Flask --> SQLite
            Flask --> RPCClient
        end

        subgraph NodeTier["Node Tier (Port 18443)"]
            BtcCore["Bitcoin Core (Regtest Daemon)"]
            WatchWallet["Watch-Only Wallet (Senza Chiavi Private)"]
            BtcCore --- WatchWallet
        end

        UI -- "Chiamate HTTP REST / Proxy Vite" --> Flask
        RPCClient -- "JSON-RPC (Digest Auth)" --> BtcCore
    end

    subgraph AirGapZone["Confine di Sicurezza Air-Gap (Ottico)"]
        direction LR
        QRDisp -. "1. PSBT Unsigned (QR Code a video)" .-> HWCamera["Fotocamera Cold Wallet"]
        HWDisplay["Display Cold Wallet"] -. "2. PSBT Firmata (QR Code a video)" .-> QRScan
    end

    subgraph OfflineEnv["Ambiente Offline (Isolato da Internet)"]
        direction TB
        HWDevice["Dispositivo Coldcard / Hardware Signer"]
        PrivKeys[("Chiavi Private / Seed")]
        HWCamera --> HWDevice
        HWDevice --- PrivKeys
        HWDevice --> HWDisplay
    end

    classDef online fill:#f0f7ff,stroke:#0366d6,stroke-width:1px;
    classDef offline fill:#fff8e6,stroke:#b08800,stroke-width:1px;
    classDef airgap fill:#f6f8fa,stroke:#d73a49,stroke-width:2px,stroke-dasharray: 5 5;
    
    class OnlineEnv online;
    class OfflineEnv offline;
    class AirGapZone airgap;
```
