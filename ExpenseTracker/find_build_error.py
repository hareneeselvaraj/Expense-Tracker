import codecs
text = codecs.open('build_err.txt', 'r', 'utf-16le', errors='ignore').read()
errors = [line for line in text.split('\n') if 'error' in line.lower()]
for e in errors:
    print(e.strip())
