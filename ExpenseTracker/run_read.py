import subprocess, codecs
result = subprocess.run(['python', 'read_xlsx.py'], capture_output=True, text=True, cwd=r'c:\Users\haren\Desktop\Expense_Tracker\Expense-Tracker\ExpenseTracker')
with codecs.open('read_xlsx_out.txt', 'w', 'utf-8') as f:
    f.write(result.stdout)
    if result.stderr:
        f.write("\n--- STDERR ---\n")
        f.write(result.stderr)
