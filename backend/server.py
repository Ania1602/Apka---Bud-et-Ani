from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Helper function to convert ObjectId to string
def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


# Define Models
class Account(BaseModel):
    name: str
    type: str  # bank, credit_card, cash
    balance: float
    currency: str = "PLN"
    icon: str = "wallet"
    color: str = "#4CAF50"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AccountResponse(Account):
    id: str

class Transaction(BaseModel):
    type: str  # income, expense
    amount: float
    category: str
    account_id: str
    date: datetime
    description: Optional[str] = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TransactionResponse(Transaction):
    id: str

class Category(BaseModel):
    name: str
    type: str  # income, expense
    icon: str
    color: str
    is_default: bool = False

class CategoryResponse(Category):
    id: str

class Credit(BaseModel):
    name: str
    total_amount: float
    remaining_amount: float
    interest_rate: float
    monthly_payment: float
    start_date: datetime
    end_date: datetime
    account_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CreditResponse(Credit):
    id: str

class DashboardStats(BaseModel):
    total_balance: float
    total_income: float
    total_expenses: float
    accounts_count: int
    credits_count: int


# Initialize default categories
@api_router.post("/initialize")
async def initialize_data():
    # Check if categories already exist
    existing = await db.categories.count_documents({})
    if existing > 0:
        return {"message": "Data already initialized"}
    
    default_categories = [
        {"name": "Wypłata", "type": "income", "icon": "cash", "color": "#4CAF50", "is_default": True},
        {"name": "Premia", "type": "income", "icon": "gift", "color": "#8BC34A", "is_default": True},
        {"name": "Inwestycje", "type": "income", "icon": "trending-up", "color": "#CDDC39", "is_default": True},
        {"name": "Jedzenie", "type": "expense", "icon": "restaurant", "color": "#F44336", "is_default": True},
        {"name": "Transport", "type": "expense", "icon": "car", "color": "#E91E63", "is_default": True},
        {"name": "Rachunki", "type": "expense", "icon": "receipt", "color": "#9C27B0", "is_default": True},
        {"name": "Rozrywka", "type": "expense", "icon": "game-controller", "color": "#673AB7", "is_default": True},
        {"name": "Zakupy", "type": "expense", "icon": "cart", "color": "#3F51B5", "is_default": True},
        {"name": "Zdrowie", "type": "expense", "icon": "medkit", "color": "#2196F3", "is_default": True},
        {"name": "Inne", "type": "expense", "icon": "ellipsis-horizontal", "color": "#607D8B", "is_default": True},
    ]
    await db.categories.insert_many(default_categories)
    return {"message": "Default categories created"}


# Account endpoints
@api_router.post("/accounts", response_model=AccountResponse)
async def create_account(account: Account):
    account_dict = account.dict()
    result = await db.accounts.insert_one(account_dict)
    account_dict["id"] = str(result.inserted_id)
    return account_dict

@api_router.get("/accounts", response_model=List[AccountResponse])
async def get_accounts():
    accounts = await db.accounts.find().to_list(1000)
    return [{"id": str(acc["_id"]), **{k: v for k, v in acc.items() if k != "_id"}} for acc in accounts]

@api_router.put("/accounts/{account_id}")
async def update_account(account_id: str, account: Account):
    result = await db.accounts.update_one(
        {"_id": ObjectId(account_id)},
        {"$set": account.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"message": "Account updated"}

@api_router.delete("/accounts/{account_id}")
async def delete_account(account_id: str):
    result = await db.accounts.delete_one({"_id": ObjectId(account_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"message": "Account deleted"}


# Transaction endpoints
@api_router.post("/transactions", response_model=TransactionResponse)
async def create_transaction(transaction: Transaction):
    transaction_dict = transaction.dict()
    result = await db.transactions.insert_one(transaction_dict)
    
    # Update account balance
    account = await db.accounts.find_one({"_id": ObjectId(transaction.account_id)})
    if account:
        new_balance = account["balance"]
        if transaction.type == "income":
            new_balance += transaction.amount
        else:
            new_balance -= transaction.amount
        await db.accounts.update_one(
            {"_id": ObjectId(transaction.account_id)},
            {"$set": {"balance": new_balance}}
        )
    
    transaction_dict["id"] = str(result.inserted_id)
    return transaction_dict

@api_router.get("/transactions", response_model=List[TransactionResponse])
async def get_transactions(limit: int = 100, account_id: Optional[str] = None):
    query = {}
    if account_id:
        query["account_id"] = account_id
    transactions = await db.transactions.find(query).sort("date", -1).limit(limit).to_list(limit)
    return [{"id": str(t["_id"]), **{k: v for k, v in t.items() if k != "_id"}} for t in transactions]

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str):
    # Get transaction first to update account balance
    transaction = await db.transactions.find_one({"_id": ObjectId(transaction_id)})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Reverse the balance change
    account = await db.accounts.find_one({"_id": ObjectId(transaction["account_id"])})
    if account:
        new_balance = account["balance"]
        if transaction["type"] == "income":
            new_balance -= transaction["amount"]
        else:
            new_balance += transaction["amount"]
        await db.accounts.update_one(
            {"_id": ObjectId(transaction["account_id"])},
            {"$set": {"balance": new_balance}}
        )
    
    await db.transactions.delete_one({"_id": ObjectId(transaction_id)})
    return {"message": "Transaction deleted"}


# Category endpoints
@api_router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(type: Optional[str] = None):
    query = {}
    if type:
        query["type"] = type
    categories = await db.categories.find(query).to_list(1000)
    return [{"id": str(c["_id"]), **{k: v for k, v in c.items() if k != "_id"}} for c in categories]

@api_router.post("/categories", response_model=CategoryResponse)
async def create_category(category: Category):
    category_dict = category.dict()
    result = await db.categories.insert_one(category_dict)
    category_dict["id"] = str(result.inserted_id)
    return category_dict


# Credit endpoints
@api_router.post("/credits", response_model=CreditResponse)
async def create_credit(credit: Credit):
    credit_dict = credit.dict()
    result = await db.credits.insert_one(credit_dict)
    credit_dict["id"] = str(result.inserted_id)
    return credit_dict

@api_router.get("/credits", response_model=List[CreditResponse])
async def get_credits():
    credits = await db.credits.find().to_list(1000)
    return [{"id": str(c["_id"]), **{k: v for k, v in c.items() if k != "_id"}} for c in credits]

@api_router.put("/credits/{credit_id}")
async def update_credit(credit_id: str, credit: Credit):
    result = await db.credits.update_one(
        {"_id": ObjectId(credit_id)},
        {"$set": credit.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Credit not found")
    return {"message": "Credit updated"}

@api_router.delete("/credits/{credit_id}")
async def delete_credit(credit_id: str):
    result = await db.credits.delete_one({"_id": ObjectId(credit_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Credit not found")
    return {"message": "Credit deleted"}


# Dashboard stats
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    # Get all accounts
    accounts = await db.accounts.find().to_list(1000)
    total_balance = sum(acc["balance"] for acc in accounts)
    
    # Get transactions for current month
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    start_of_month = datetime(now.year, now.month, 1)
    
    income_transactions = await db.transactions.find({
        "type": "income",
        "date": {"$gte": start_of_month}
    }).to_list(1000)
    total_income = sum(t["amount"] for t in income_transactions)
    
    expense_transactions = await db.transactions.find({
        "type": "expense",
        "date": {"$gte": start_of_month}
    }).to_list(1000)
    total_expenses = sum(t["amount"] for t in expense_transactions)
    
    # Get credits count
    credits_count = await db.credits.count_documents({})
    
    return {
        "total_balance": total_balance,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "accounts_count": len(accounts),
        "credits_count": credits_count
    }


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Budget Manager API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
