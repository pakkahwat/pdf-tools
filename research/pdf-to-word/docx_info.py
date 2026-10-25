import collections
import re
import sys
import zipfile

z = zipfile.ZipFile(sys.argv[1])
x = z.read("word/document.xml").decode()
print("fonts used:", collections.Counter(re.findall(r'w:ascii="([^"]+)"', x)))
print("SETTINGS:", z.read("word/settings.xml").decode()[:900])
ft = z.read("word/fontTable.xml").decode()
print("FONTTABLE root:", re.search(r"<w:fonts[^>]*>", ft).group(0)[:500])
print("parts:", z.namelist())
print("CT:", z.read("[Content_Types].xml").decode()[:600])
