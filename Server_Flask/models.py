from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

# 1. Tabella Wallet: Rappresenta l'identità del portafoglio watch-only
class Wallet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    descriptor_or_xpub = db.Column(db.String(200), nullable=False) # Il dato per derivare gli indirizzi
    last_used_receive_index = db.Column(db.Integer, default=0) # Contatore per gli indirizzi di ricezione
    last_used_change_index = db.Column(db.Integer, default=0)  # Contatore per gli indirizzi di resto
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    addresses = db.relationship('Address', backref='wallet', lazy=True)

# 2. Tabella Address: Mappa crittograficamente la derivazione per evitare riutilizzi
class Address(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    wallet_id = db.Column(db.Integer, db.ForeignKey('wallet.id'), nullable=False)
    address_string = db.Column(db.String(100), nullable=False, unique=True)
    derivation_path = db.Column(db.String(50), nullable=False) # es. m/84'/0'/0'/0/1
    is_change = db.Column(db.Boolean, default=False) # Distingue ricezione da resto
    used = db.Column(db.Boolean, default=False) # Per rispettare il gap limit

# 3. Tabella UtxoCache: Memoria temporanea per non sovraccaricare il nodo Bitcoin
class UtxoCache(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    txid = db.Column(db.String(64), nullable=False)
    vout = db.Column(db.Integer, nullable=False)
    amount_satoshis = db.Column(db.Integer, nullable=False)
    address_id = db.Column(db.Integer, db.ForeignKey('address.id'), nullable=False)
    is_spent = db.Column(db.Boolean, default=False)

# 4. Tabella TransactionDraft: Gestisce lo stato delle transazioni (PSBT) sul canale air-gap
class TransactionDraft(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    psbt_base64 = db.Column(db.Text, nullable=False) # La transazione non firmata/firmata
    status = db.Column(db.String(20), default='DRAFT') # DRAFT, SIGNED, BROADCASTED
    target_address = db.Column(db.String(100), nullable=False)
    fee_rate = db.Column(db.Integer, nullable=False)
    txid_definitivo = db.Column(db.String(64), nullable=True) # Valorizzato dopo il broadcast
    created_at = db.Column(db.DateTime, default=datetime.utcnow)