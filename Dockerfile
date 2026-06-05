FROM python:3.12-slim

WORKDIR /app

# 先装依赖（利用 Docker 层缓存）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 再拷贝全部源码（含前端静态资源 + backend/）
COPY . .

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
