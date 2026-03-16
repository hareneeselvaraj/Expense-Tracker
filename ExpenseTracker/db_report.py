import sqlite3, codecs

conn = sqlite3.connect(r'c:\Users\haren\Desktop\Expense_Tracker\Expense-Tracker\ExpenseTracker\expense.db')

with codecs.open(r'c:\Users\haren\Desktop\Expense_Tracker\Expense-Tracker\ExpenseTracker\db_report.txt', 'w', 'utf-8') as f:
    for uid, name in [('33A9C1A2-AF41-4962-AB67-1C4DC7C6E4D1', 'test2'), ('56D6B348-8A2E-4ADF-9758-C2770DD5855E', 'Test2')]:
        count = conn.execute("SELECT COUNT(*) FROM Transactions WHERE UserId = ?", (uid,)).fetchone()[0]
        f.write(f"{name} ({uid[:8]}): {count} transactions\n")
        if count > 0:
            for r in conn.execute("SELECT Date, Description, Amount, Type FROM Transactions WHERE UserId = ? LIMIT 5", (uid,)):
                f.write(f"  {r}\n")
    f.write(f"\nTotal: {conn.execute('SELECT COUNT(*) FROM Transactions').fetchone()[0]}\n")

conn.close()
print("Done")
