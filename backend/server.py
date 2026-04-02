from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

app = FastAPI(title="Budżet Ani - Offline App")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {"status": "ok", "mode": "offline", "message": "Budżet Ani działa w trybie offline. Wszystkie dane są przechowywane lokalnie na urządzeniu."}

@app.get("/api")
async def root():
    return {"app": "Budżet Ani", "version": "2.0.0", "mode": "offline"}
