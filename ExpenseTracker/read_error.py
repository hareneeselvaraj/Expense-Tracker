import re
with open('crash_log.txt', 'r', encoding='utf-16le', errors='ignore') as f:
    text = f.read()
    
# Find all SQLite errors
errors = [line for line in text.split('\n') if 'SQLite Error' in line or 'Exception' in line]
for e in set(errors):
    print(e.strip())
