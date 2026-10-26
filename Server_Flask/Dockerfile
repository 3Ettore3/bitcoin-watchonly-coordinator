# 1. Usiamo l'immagine ufficiale e leggera di Python 3.12
FROM python:3.12-slim

# 2. Impostiamo la directory di lavoro all'interno del container
WORKDIR /app

# 3. Copiamo prima il file dei requisiti (per sfruttare la cache di Docker nei rebuild)
COPY requirements.txt .

# 4. Installiamo le dipendenze Python
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copiamo tutto il resto del codice del backend dentro il container
COPY . .

# 6. Esponiamo la porta 5000 su cui ascolta Flask
EXPOSE 5000

# 7. Comando di avvio del server
CMD ["python", "app.py"]