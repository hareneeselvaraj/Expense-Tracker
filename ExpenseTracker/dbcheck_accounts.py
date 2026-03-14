import sqlite3
import traceback

try:
    db_path = r'c:\Users\haren\Desktop\Expense_Tracker\Expense-Tracker\ExpenseTracker\expense.db'
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    print("Executing SELECT * FROM Accounts")
    cur.execute("SELECT * FROM Accounts LIMIT 1")
    row = cur.fetchone()
    if row:
        print(dict(row))
    else:
        print("Accounts table is empty but query succeeded.")
        
    print("\nExecuting PRAGMA table_info(Accounts)")
    cur.execute("PRAGMA table_info(Accounts)")
    for col in cur.fetchall():
        print(dict(col))

except Exception as e:
    print("Error occurred:")
    traceback.print_exc()
finally:
    if 'conn' in locals():
        conn.close()
