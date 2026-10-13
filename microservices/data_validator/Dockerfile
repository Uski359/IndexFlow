FROM python:3.10-slim AS base
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 7000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7000"]
