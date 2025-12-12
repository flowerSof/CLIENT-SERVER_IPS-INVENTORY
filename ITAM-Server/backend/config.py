import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "ITAM System"
    PROJECT_VERSION: str = "1.0.0"
    
    # Base de Datos
    POSTGRES_USER: str = os.getenv("DB_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("DB_PASSWORD", "sql")
    POSTGRES_SERVER: str = os.getenv("DB_HOST", "localhost")
    POSTGRES_PORT: str = os.getenv("DB_PORT", "5432")
    POSTGRES_DB: str = os.getenv("DB_NAME", "itam_db")
    
    # URL de Conexión construida
    DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}:{POSTGRES_PORT}/{POSTGRES_DB}"
    
    # Seguridad
    SECRET_KEY: str = os.getenv("SECRET_KEY", "secret")
    API_TOKEN: str = os.getenv("API_TOKEN", "token")

settings = Settings()