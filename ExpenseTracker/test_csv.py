import csv

with open('sample.csv', 'r') as f:
    reader = csv.DictReader(f)
    print(f"Headers: {reader.fieldnames}")
    for row in reader:
        print(row)
