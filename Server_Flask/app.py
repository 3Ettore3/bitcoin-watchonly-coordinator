import os
from datetime import datetime
from flask import Flask, jsonify, request
from models import db, Wallet, Address, UtxoCache, TransactionDraft
from bitcoin_rpc import BitcoinRPC

try:
    from flask_cors import CORS
except ImportError:
    def CORS(app, *args, **kwargs):
        return None

# CONFIGURAZIONE E INIZIALIZZAZIONE      
app = Flask(__name__)
CORS(app)

basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'app.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
btc_host = os.environ.get('BITCOIN_RPC_HOST', '127.0.0.1')
rpc = BitcoinRPC(f'http://{btc_host}:18443', 'Rari', 'Bellartu.2904') 

# CORS configuration
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]}})


# ROTTE DI STATO E DIAGNOSTICA
@app.route('/', methods=['GET'])
def home():
    return "Il server Flask è attivo! Naviga su /api/node-status per interrogare il nodo Bitcoin."

@app.route('/api/node-status', methods=['GET'])
def get_node_status():
    try:
        info = rpc.call('getblockchaininfo', [])
        return jsonify(info), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# FASE 1: IMPORTAZIONE WALLET WATCH-ONLY
@app.route('/api/wallet/import-xpub', methods=['POST'])
def import_xpub():
    try:
        # 1. Validazione input del client
        data = request.get_json()
        if not data or 'name' not in data or 'descriptor_or_xpub' not in data:
            return jsonify({'error': 'Dati mancanti. Sono richiesti "name" e "descriptor_or_xpub"'}), 400
             
        wallet_name = data['name']
        descriptor = data['descriptor_or_xpub']

        # 2. Registrazione descrittore sul nodo Bitcoin (watch-only)
        import_request = [{
            "desc": descriptor,
            "timestamp": "now"
        }]
        rpc.call('importdescriptors', [import_request], wallet='webapp_watchonly')

        # 3. Salvataggio nel database locale SQLite
        new_wallet = Wallet(
            name=wallet_name,
            descriptor_or_xpub=descriptor,
            created_at=datetime.utcnow()
        )
        db.session.add(new_wallet)
        db.session.commit()

        return jsonify({
            'message': f"Wallet '{wallet_name}' importato con successo",
            'wallet_id': new_wallet.id
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# FASE 2: SINCRONIZZAZIONE UTXO E SALDO
@app.route('/api/wallet/utxos', methods=['GET'])
def get_utxos():
    try:
        # 1. Recupero UTXO dal nodo (da 0 conferme in su) e reset cache locale
        unspent_list = rpc.call('listunspent', [0, 9999999], wallet='webapp_watchonly')
        UtxoCache.query.delete()

        total_balance_sats = 0
        formatted_utxos = []

        # 2. Elaborazione UTXO e popolamento cache DB
        for utxo in unspent_list:
            amount_btc = utxo.get('amount', 0)
            amount_sats = int(round(amount_btc * 100000000))
            txid = utxo.get('txid')
            vout = utxo.get('vout')
            address_str = utxo.get('address')
            
            total_balance_sats += amount_sats
            
            new_cached_utxo = UtxoCache(
                txid=txid,
                vout=vout,
                amount_satoshis=amount_sats,
                address_id=1,  # TODO: Mappare con ID reale dalla tabella Address
                is_spent=False
            )
            db.session.add(new_cached_utxo)
            
            formatted_utxos.append({
                'txid': txid,
                'vout': vout,
                'amount_sats': amount_sats,
                'address': address_str,
                'confirmations': utxo.get('confirmations', 0)
            })

        db.session.commit()

        # 3. Restituzione saldo e lista UTXO
        return jsonify({
            'total_balance_sats': total_balance_sats,
            'total_balance_btc': total_balance_sats / 100000000,
            'utxo_count': len(formatted_utxos),
            'utxos': formatted_utxos
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# FASE 4.1: NUOVO ENDPOINT PER INDIRIZZO DI RICEZIONE
@app.route('/api/wallet/receive-address', methods=['GET'])
def get_receive_address():
    try:
        # 1. Chiamata RPC a Bitcoin Core per ottenere un nuovo indirizzo
        # Puntiamo specificamente al wallet webapp_watchonly per assicurarci
        # che l'indirizzo sia generato dal descrittore che abbiamo importato.
        new_address = rpc.call('getnewaddress', [""], wallet='webapp_watchonly')

        # 2. Restituiamo la risposta a React/Postman in JSON
        return jsonify({
            'message': 'Indirizzo generato con successo',
            'address': new_address
        }), 200

    except Exception as e:
        # Se il nodo non ha il wallet caricato o c'è un errore RPC, restituisce 500
        return jsonify({'error': str(e)}), 500

# FASE 3: COSTRUZIONE TRANSAZIONE PSBT
@app.route('/api/tx/create-psbt', methods=['POST'])
def create_psbt():
    try:
        # 1. Lettura e validazione parametri di spesa
        data = request.get_json()
        if not data or 'target_address' not in data or 'amount_btc' not in data:
            return jsonify({'error': 'Dati mancanti. Sono richiesti "target_address" e "amount_btc".'}), 400

        target_address = data['target_address']
        amount_btc = float(data['amount_btc'])
        fee_rate = int(data.get('fee_rate', 2))
        change_address = data.get('change_address')

        # 2. Fallback indirizzo di resto (usa il primo UTXO disponibile se non specificato)
        if not change_address:
            unspent = rpc.call('listunspent', [0, 9999999], wallet='webapp_watchonly')
            if not unspent:
                return jsonify({'error': 'Nessun UTXO disponibile nel wallet per finanziare la transazione.'}), 400
            change_address = unspent[0].get('address')

        # 3. Generazione PSBT tramite RPC (Coin Selection automatica)
        inputs = []
        outputs = [{target_address: amount_btc}]
        locktime = 0
        options = {
            "includeWatching": True,
            "changeAddress": change_address,
            "fee_rate": fee_rate
        }

        psbt_result = rpc.call(
            'walletcreatefundedpsbt',
            [inputs, outputs, locktime, options],
            wallet='webapp_watchonly'
        )

        psbt_base64 = psbt_result.get('psbt')
        fee_btc = psbt_result.get('fee', 0)
        fee_sats = int(round(fee_btc * 100000000))
        changepos = psbt_result.get('changepos')

        # 4. Salvataggio della bozza nel database SQLite
        new_draft = TransactionDraft(
            psbt_base64=psbt_base64,
            status='DRAFT',
            target_address=target_address,
            fee_rate=fee_rate,
            created_at=datetime.utcnow()
        )
        db.session.add(new_draft)
        db.session.commit()

        return jsonify({
            'message': 'PSBT creata con successo',
            'draft_id': new_draft.id,
            'status': new_draft.status,
            'psbt_base64': psbt_base64,
            'target_address': target_address,
            'amount_btc': amount_btc,
            'change_address': change_address,
            'changepos': changepos,
            'fee_rate_sat_vb': fee_rate,
            'fee_btc': fee_btc,
            'fee_sats': fee_sats
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# FASE 4: FINALIZZAZIONE E BROADCAST PSBT
@app.route('/api/tx/broadcast', methods=['POST'])
def broadcast_tx():
    try:
        # 1. Ricezione PSBT firmata dal dispositivo offline
        data = request.get_json()
        if not data or 'signed_psbt' not in data:
            return jsonify({'error': 'Dati mancanti. È richiesto il campo "signed_psbt".'}), 400

        signed_psbt = data['signed_psbt']
        draft_id = data.get('draft_id')

        # 2. Finalizzazione PSBT ed estrazione transazione grezza (hex)
        finalized = rpc.call('finalizepsbt', [signed_psbt])
        if not finalized.get('complete', False):
            return jsonify({
                'error': 'Impossibile finalizzare la PSBT: firme mancanti o incomplete.',
                'details': finalized
            }), 400

        raw_tx_hex = finalized.get('hex')

        # 3. Trasmissione della transazione in mempool
        txid = rpc.call('sendrawtransaction', [raw_tx_hex])

        # 4. Aggiornamento stato bozza e UTXO spesi nel database
        draft = TransactionDraft.query.get(draft_id) if draft_id else \
                TransactionDraft.query.filter_by(status='DRAFT').order_by(TransactionDraft.id.desc()).first()

        if draft:
            draft.psbt_base64 = signed_psbt
            draft.status = 'BROADCASTED'
            draft.txid_definitivo = txid

        decoded_tx = rpc.call('decoderawtransaction', [raw_tx_hex])
        for vin in decoded_tx.get('vin', []):
            spent_txid = vin.get('txid')
            spent_vout = vin.get('vout')
            if spent_txid is not None and spent_vout is not None:
                cached_utxo = UtxoCache.query.filter_by(txid=spent_txid, vout=spent_vout).first()
                if cached_utxo:
                    cached_utxo.is_spent = True

        db.session.commit()

        return jsonify({
            'message': 'Transazione finalizzata e trasmessa con successo alla rete!',
            'txid': txid,
            'status': 'BROADCASTED',
            'draft_id': draft.id if draft else None
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# AVVIO DEL SERVER
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000, debug=True)
