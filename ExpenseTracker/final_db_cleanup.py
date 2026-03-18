import sqlite3
import os

db_path = r'c:\Users\HareneeS\Downloads\task\Expense-Tracker\ExpenseTracker\expense.db'

def final_cleanup():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        print("Updating legacy numeric type strings to labels...")
        cursor.execute("UPDATE Categories SET Type = 'Income'     WHERE Type = '0'")
        print(f"Updated '0' to 'Income': {cursor.rowcount} rows")
        
        cursor.execute("UPDATE Categories SET Type = 'Expense'    WHERE Type = '1'")
        print(f"Updated '1' to 'Expense': {cursor.rowcount} rows")
        
        cursor.execute("UPDATE Categories SET Type = 'Investment' WHERE Type = '2'")
        print(f"Updated '2' to 'Investment': {cursor.rowcount} rows")

        print("\nDeleting duplicate Income categories incorrectly stored as 'Expense'...")
        cursor.execute("""
            DELETE FROM Categories 
            WHERE Name IN ('cashback', 'wife', 'Salary') 
            AND Type = 'Expense'
        """)
        print(f"Deleted duplicate Expense categories: {cursor.rowcount} rows")

        conn.commit()
        print("\nFinal database cleanup committed successfully.")

        # Final Verification
        print("\nVerifying current name/type distribution:")
        cursor.execute("SELECT Name, Type, COUNT(*) FROM Categories GROUP BY Name, Type ORDER BY Type, Name")
        for row in cursor.fetchall():
            print(f"{row[0]:<25} | {row[1]:<12} | {row[2]}")

        conn.close()
    except Exception as e:
        print(f"Error during final cleanup: {e}")

if __name__ == "__main__":
    final_cleanup()
