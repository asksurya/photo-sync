FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libmagic1 \
    libmagic-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run tests during build
RUN python -m pytest tests/ -v

# Expose API port
EXPOSE 8001

# Run the service
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]
