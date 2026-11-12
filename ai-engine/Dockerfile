FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OCR & document rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    poppler-utils \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --upgrade pip "setuptools<70"

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

ENV PORT=8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
