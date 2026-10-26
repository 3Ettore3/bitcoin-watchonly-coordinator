import requests
import json

class BitcoinRPC:
    def __init__(self, url, user, password):
        self.url = url
        self.user = user
        self.password = password
        self.headers = {'content-type': 'application/json'}

    #Aggiunto l'argomento opzionale "wallet"
    def call(self, method, params=None, wallet=None):
        if params is None:
            params = []
            
        payload = {
            "jsonrpc": "1.0",
            "id": "flask-backend",
            "method": method,
            "params": params
        }

        # Se viene specificato un wallet, aggiungiamo il path all'URL
        request_url = self.url
        if wallet:
            request_url = f"{self.url}/wallet/{wallet}"

        response = requests.post(
            request_url,
            auth=(self.user, self.password),
            data=json.dumps(payload),
            headers=self.headers
        )
        
        response_json = response.json()
        
        if response_json.get('error'):
            raise Exception(f"RPC Error {response_json['error']['code']}: {response_json['error']['message']}")
            
        return response_json.get('result')