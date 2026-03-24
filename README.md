# 1. Repo-г татах
git clone https://github.com/tsekseven69/complaint-dashboard.git
cd complaint-dashboard

# 2. .env файл үүсгэх
cat > .env << 'EOF'
POSTGRES_USER=complaint_user
POSTGRES_PASSWORD=complaint_pass_2024
POSTGRES_DB=complaint_db
POSTGRES_HOST=db
POSTGRES_PORT=5432
DATABASE_URL=postgresql+asyncpg://complaint_user:complaint_pass_2024@db:5432/complaint_db
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
EOF

# 3. Docker-ээр бүгдийг нь ажиллуулах
docker compose up --build -d

# 4. Хүлээнэ (анх удаа ~2-3 минут)
# Бэлэн болсон эсэхийг шалгах:
docker compose ps
Хандах
Үйлчилгээ	Хаяг
Dashboard	http://localhost:5173
API docs	http://localhost:8000/docs
API health	http://localhost:8000/health
Хэрэглээ
http://localhost:5173 нээх
Excel файлаа чирж оруулах
Дашбоард, Тайлан, Дүн шинжилгээ, Жагсаалт tab-ууд дээр мэдээлэл харах
Зогсоох

docker compose down
