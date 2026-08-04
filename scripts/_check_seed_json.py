import json
import pathlib

problems = []
for name in sorted(pathlib.Path("supabase/seed/generated").glob("*.sql")):
    data = name.read_text(encoding="utf-8")
    idx = 0
    block_no = 0
    ok = True
    while True:
        start = data.find("$seed$", idx)
        if start < 0:
            break
        end = data.find("$seed$", start + 6)
        if end < 0:
            break
        block_no += 1
        payload = data[start + 6:end]
        try:
            json.loads(payload)
        except Exception as exc:
            problems.append(f"{name.name} block {block_no}: {exc}")
            ok = False
        idx = end + 6
    if not ok:
        continue
    print(f"{name.name}: OK (blocks={block_no})")
print("----")
if problems:
    print("PROBLEMS:")
    for p in problems:
        print(" ", p)
else:
    print("ALL SEED JSON BLOCKS VALID")
