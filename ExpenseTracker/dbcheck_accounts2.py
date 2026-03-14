import sqlite3
import traceback

try:
    with open('db_out_py.txt', 'w', encoding='utf-8') as f:
        db_path = r'c:\Users\haren\Desktop\Expense_Tracker\Expense-Tracker\ExpenseTracker\expense.db'
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        f.write("Executing SELECT * FROM Accounts LIMIT 1\n")
        cur.execute("SELECT * FROM Accounts LIMIT 1")
        row = cur.fetchone()
        if row:
            f.write(str(dict(row)) + "\n")
        else:
            f.write("Accounts table is empty.\n")
            
        f.write("\nExecuting PRAGMA table_info(Accounts)\n")
        cur.execute("PRAGMA table_info(Accounts)")
        for col in cur.fetchall():
            f.write(str(dict(col)) + "\n")

except Exception as e:
    with open('db_out_py.txt', 'a', encoding='utf-8') as f:
        f.write("Error occurred:\n")
        f.write(traceback.format_exc())
finally:
    if 'conn' in locals():
        conn.close()
