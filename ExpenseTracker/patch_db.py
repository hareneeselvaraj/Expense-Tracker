import sqlite3
import traceback

try:
    db_path = r'c:\Users\haren\Desktop\Expense_Tracker\Expense-Tracker\ExpenseTracker\expense.db'
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    print("Altering Accounts table...")
    cur.execute("ALTER TABLE Accounts ADD COLUMN CreditLimit decimal(18,2) NULL;")
    conn.commit()
    print("Success")
except Exception as e:
    print("Error:", repr(e))
finally:
    if 'conn' in locals():
        conn.close()
