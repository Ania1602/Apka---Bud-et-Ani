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
from dateutil.relativedelta import relativedelta


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
    credit_id: Optional[str] = None  # Link to credit if this is a payment
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
    monthly_paid: Optional[float] = 0.0

class DashboardStats(BaseModel):
    total_balance: float
    total_income: float
    total_expenses: float
    accounts_count: int
    credits_count: int

class Budget(BaseModel):
    category: str
    month: int  # 1-12
    year: int
    limit_amount: float
    spent_amount: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BudgetResponse(Budget):
    id: str

class RecurringTransaction(BaseModel):
    name: str
    type: str  # income, expense
    amount: float
    category: str
    account_id: str
    frequency: str  # monthly, quarterly, yearly
    day_of_month: int  # 1-31
    start_date: datetime
    end_date: Optional[datetime] = None
    is_active: bool = True
    last_executed: Optional[datetime] = None
    credit_id: Optional[str] = None  # Link to credit if this is a payment
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RecurringTransactionResponse(RecurringTransaction):
    id: str
    next_due_date: Optional[str] = None


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


@api_router.put("/categories/{category_id}")
async def update_category(category_id: str, category: Category):
    result = await db.categories.update_one(
        {"_id": ObjectId(category_id)},
        {"$set": category.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category updated"}

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    # Don't allow deleting default categories
    category = await db.categories.find_one({"_id": ObjectId(category_id)})
    if category and category.get("is_default"):
        raise HTTPException(status_code=400, detail="Cannot delete default category")
    
    result = await db.categories.delete_one({"_id": ObjectId(category_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}


# Credit endpoints
@api_router.post("/credits", response_model=CreditResponse)
async def create_credit(credit: Credit):
    credit_dict = credit.dict()
    result = await db.credits.insert_one(credit_dict)
    credit_dict["id"] = str(result.inserted_id)
    return credit_dict

@api_router.get("/credits", response_model=List[CreditResponse])
async def get_credits(month: Optional[int] = None, year: Optional[int] = None):
    credits = await db.credits.find().to_list(1000)
    result = []
    
    # Calculate monthly payments if month/year provided
    if month and year:
        from datetime import datetime
        start_of_month = datetime(year, month, 1)
        if month == 12:
            end_of_month = datetime(year + 1, 1, 1)
        else:
            end_of_month = datetime(year, month + 1, 1)
        
        for credit in credits:
            credit_dict = {"id": str(credit["_id"]), **{k: v for k, v in credit.items() if k != "_id"}}
            
            # Get transactions linked to this credit in this month
            payments = await db.transactions.find({
                "credit_id": str(credit["_id"]),
                "type": "expense",
                "date": {"$gte": start_of_month, "$lt": end_of_month}
            }).to_list(1000)
            
            credit_dict["monthly_paid"] = sum(p["amount"] for p in payments)
            result.append(credit_dict)
    else:
        result = [{"id": str(c["_id"]), **{k: v for k, v in c.items() if k != "_id"}} for c in credits]
    
    return result

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
async def get_dashboard_stats(month: Optional[int] = None, year: Optional[int] = None):
    # Get all accounts
    accounts = await db.accounts.find().to_list(1000)
    total_balance = sum(acc["balance"] for acc in accounts)
    
    # Get transactions for specified period or current month
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    
    if month and year:
        start_of_period = datetime(year, month, 1)
        if month == 12:
            end_of_period = datetime(year + 1, 1, 1)
        else:
            end_of_period = datetime(year, month + 1, 1)
    else:
        start_of_period = datetime(now.year, now.month, 1)
        if now.month == 12:
            end_of_period = datetime(now.year + 1, 1, 1)
        else:
            end_of_period = datetime(now.year, now.month + 1, 1)
    
    income_transactions = await db.transactions.find({
        "type": "income",
        "date": {"$gte": start_of_period, "$lt": end_of_period}
    }).to_list(1000)
    total_income = sum(t["amount"] for t in income_transactions)
    
    expense_transactions = await db.transactions.find({
        "type": "expense",
        "date": {"$gte": start_of_period, "$lt": end_of_period}
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


@api_router.get("/reports/export")
async def export_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    type: Optional[str] = None
):
    """Export transactions to CSV for Excel"""
    from datetime import datetime
    import csv
    from io import StringIO
    from fastapi.responses import StreamingResponse
    
    # Parse dates
    query = {}
    if start_date:
        query["date"] = query.get("date", {})
        query["date"]["$gte"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    if end_date:
        query["date"] = query.get("date", {})
        query["date"]["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    if type:
        query["type"] = type
    
    # Get transactions
    transactions = await db.transactions.find(query).sort("date", -1).to_list(10000)
    
    # Get accounts for mapping
    accounts = await db.accounts.find().to_list(1000)
    account_map = {str(acc["_id"]): acc["name"] for acc in accounts}
    
    # Create CSV
    output = StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(['Data', 'Typ', 'Kategoria', 'Kwota (PLN)', 'Konto', 'Opis'])
    
    # Write data
    for t in transactions:
        writer.writerow([
            t["date"].strftime("%Y-%m-%d %H:%M"),
            "Przychód" if t["type"] == "income" else "Wydatek",
            t["category"],
            f"{t['amount']:.2f}",
            account_map.get(t["account_id"], "Nieznane"),
            t.get("description", "")
        ])
    
    # Add summary
    writer.writerow([])
    writer.writerow(['PODSUMOWANIE'])
    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expense = sum(t["amount"] for t in transactions if t["type"] == "expense")
    writer.writerow(['Przychody', '', '', f"{total_income:.2f}", '', ''])
    writer.writerow(['Wydatki', '', '', f"{total_expense:.2f}", '', ''])
    writer.writerow(['Bilans', '', '', f"{total_income - total_expense:.2f}", '', ''])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=raport_{datetime.now().strftime('%Y%m%d')}.csv"}
    )


# Budget endpoints
@api_router.post("/budgets", response_model=BudgetResponse)
async def create_budget(budget: Budget):
    budget_dict = budget.dict()
    result = await db.budgets.insert_one(budget_dict)
    budget_dict["id"] = str(result.inserted_id)
    return budget_dict

@api_router.get("/budgets", response_model=List[BudgetResponse])
async def get_budgets(month: Optional[int] = None, year: Optional[int] = None):
    query = {}
    if month:
        query["month"] = month
    if year:
        query["year"] = year
    budgets = await db.budgets.find(query).to_list(1000)
    
    # Calculate spent amount for each budget
    for budget in budgets:
        start_date = datetime(budget["year"], budget["month"], 1)
        if budget["month"] == 12:
            end_date = datetime(budget["year"] + 1, 1, 1)
        else:
            end_date = datetime(budget["year"], budget["month"] + 1, 1)
        
        # Get transactions for this category and month
        transactions = await db.transactions.find({
            "type": "expense",
            "category": budget["category"],
            "date": {"$gte": start_date, "$lt": end_date}
        }).to_list(1000)
        
        spent = sum(t["amount"] for t in transactions)
        budget["spent_amount"] = spent
        
        # Update spent_amount in database
        await db.budgets.update_one(
            {"_id": budget["_id"]},
            {"$set": {"spent_amount": spent}}
        )
    
    return [{"id": str(b["_id"]), **{k: v for k, v in b.items() if k != "_id"}} for b in budgets]

@api_router.get("/budgets/current")
async def get_current_month_budgets():
    now = datetime.utcnow()
    return await get_budgets(month=now.month, year=now.year)

@api_router.put("/budgets/{budget_id}")
async def update_budget(budget_id: str, budget: Budget):
    result = await db.budgets.update_one(
        {"_id": ObjectId(budget_id)},
        {"$set": budget.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"message": "Budget updated"}

@api_router.delete("/budgets/{budget_id}")
async def delete_budget(budget_id: str):
    result = await db.budgets.delete_one({"_id": ObjectId(budget_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"message": "Budget deleted"}


# Recurring Transaction endpoints
@api_router.post("/recurring-transactions", response_model=RecurringTransactionResponse)
async def create_recurring_transaction(recurring: RecurringTransaction):
    recurring_dict = recurring.dict()
    result = await db.recurring_transactions.insert_one(recurring_dict)
    recurring_dict["id"] = str(result.inserted_id)
    
    # Calculate next due date
    from dateutil.relativedelta import relativedelta
    next_date = recurring.start_date
    if recurring.frequency == "monthly":
        next_date = next_date + relativedelta(months=1)
    elif recurring.frequency == "quarterly":
        next_date = next_date + relativedelta(months=3)
    elif recurring.frequency == "yearly":
        next_date = next_date + relativedelta(years=1)
    
    recurring_dict["next_due_date"] = next_date.isoformat()
    return recurring_dict

@api_router.get("/recurring-transactions", response_model=List[RecurringTransactionResponse])
async def get_recurring_transactions():
    recurrings = await db.recurring_transactions.find().to_list(1000)
    
    # Calculate next due date for each
    from dateutil.relativedelta import relativedelta
    result = []
    for rec in recurrings:
        rec_dict = {"id": str(rec["_id"]), **{k: v for k, v in rec.items() if k != "_id"}}
        
        # Calculate next due date
        last_exec = rec.get("last_executed", rec.get("start_date"))
        if last_exec is None:
            # If no last_executed and no start_date, use current time
            last_exec = datetime.utcnow()
        elif isinstance(last_exec, str):
            last_exec = datetime.fromisoformat(last_exec.replace('Z', '+00:00'))
        
        next_date = last_exec
        if rec["frequency"] == "monthly":
            next_date = next_date + relativedelta(months=1)
        elif rec["frequency"] == "quarterly":
            next_date = next_date + relativedelta(months=3)
        elif rec["frequency"] == "yearly":
            next_date = next_date + relativedelta(years=1)
        
        rec_dict["next_due_date"] = next_date.isoformat()
        result.append(rec_dict)
    
    return result

@api_router.post("/recurring-transactions/{recurring_id}/execute")
async def execute_recurring_transaction(recurring_id: str):
    """Execute a recurring transaction (create actual transaction)"""
    recurring = await db.recurring_transactions.find_one({"_id": ObjectId(recurring_id)})
    if not recurring:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    
    # Create actual transaction
    transaction_dict = {
        "type": recurring["type"],
        "amount": recurring["amount"],
        "category": recurring["category"],
        "account_id": recurring["account_id"],
        "date": datetime.utcnow(),
        "description": f"Płatność cykliczna: {recurring['name']}",
        "created_at": datetime.utcnow()
    }
    
    result = await db.transactions.insert_one(transaction_dict)
    
    # Update account balance
    account = await db.accounts.find_one({"_id": ObjectId(recurring["account_id"])})
    if account:
        new_balance = account["balance"]
        if recurring["type"] == "income":
            new_balance += recurring["amount"]
        else:
            new_balance -= recurring["amount"]
        await db.accounts.update_one(
            {"_id": ObjectId(recurring["account_id"])},
            {"$set": {"balance": new_balance}}
        )
    
    # Update last_executed
    await db.recurring_transactions.update_one(
        {"_id": ObjectId(recurring_id)},
        {"$set": {"last_executed": datetime.utcnow()}}
    )
    
    # Prepare response with proper serialization
    response_dict = {
        "id": str(result.inserted_id),
        "type": transaction_dict["type"],
        "amount": transaction_dict["amount"],
        "category": transaction_dict["category"],
        "account_id": transaction_dict["account_id"],
        "date": transaction_dict["date"].isoformat(),
        "description": transaction_dict["description"],
        "created_at": transaction_dict["created_at"].isoformat()
    }
    return response_dict

@api_router.put("/recurring-transactions/{recurring_id}")
async def update_recurring_transaction(recurring_id: str, recurring: RecurringTransaction):
    result = await db.recurring_transactions.update_one(
        {"_id": ObjectId(recurring_id)},
        {"$set": recurring.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    return {"message": "Recurring transaction updated"}

@api_router.delete("/recurring-transactions/{recurring_id}")
async def delete_recurring_transaction(recurring_id: str):
    result = await db.recurring_transactions.delete_one({"_id": ObjectId(recurring_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    return {"message": "Recurring transaction deleted"}


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
