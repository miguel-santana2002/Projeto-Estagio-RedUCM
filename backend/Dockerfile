FROM python:3.12.3

# Instalar o git e atualizar certificados do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt
RUN python -c "import enterpriseattack; enterpriseattack.Attack()"

COPY . .

RUN chmod +x entrypoint.sh

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
