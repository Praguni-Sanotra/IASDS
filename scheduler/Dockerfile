# Base image: Python 3.11 slim variant for a lightweight footprint
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables:
# 1. Prevent python from writing pyc files to disc
# 2. Prevent python from buffering stdout and stderr, useful for Docker logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies (e.g., curl for healthchecks)
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the dependencies file
COPY requirements.txt .

# Install Python dependencies
# Upgrade pip first, then install from requirements.txt without caching to save space
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Start the FastAPI application using uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
