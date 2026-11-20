#!/usr/bin/env python3
"""Copy the allowlisted wiki notes into this site: python3 -I brain/build.py --src <wiki nodes dir> --never-send <terms file>
Reads only the slugs in brain/allowlist.txt. A privacy pass drops every line that holds a never-send term, the local
user's names, a local path or an email address. Writes brain/notes/<slug>.md (public copies) and brain/notes.js (the
data the map page reads), then prints counts. The source folder is never written to. Stdlib only.
Each note's interest tags come from brain/src/interests.json (a note with no entry stops the build); the note's own
tags are kept as its "kind". python3 -I brain/build.py --from-copies re-reads the public copies in brain/notes/ instead
of the private wiki, to apply a change to interests.json without the private source (no never-send file is needed: the
copies already passed it, and the names, path and email checks still run)."""
import argparse, getpass, json, re, subprocess, sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
NOTES = HERE / "notes"
PATH_RE = re.compile(r"(?:/Users/|/home/|/private/|/var/folders/|/tmp/|~/|\b[A-Za-z]:\\)")
MAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
KEYS = ("Claim", "Evidence", "Elaboration", "Why it matters here")


def git(*a):
    try:
        return subprocess.run(["git", *a], capture_output=True, text=True, check=False).stdout.strip()
    except OSError:
        return ""


def user_names():
    # Names come from this machine at run time, so they never have to be written into this public file.
    names = {getpass.getuser(), Path.home().name}
    names |= set(git("config", "user.name").split())
    mail = git("config", "user.email")
    if mail:
        names.add(mail.split("@")[0])
    return {n.lower() for n in names if len(n) >= 3}


def read_terms(path):
    lines = Path(path).read_text(encoding="utf-8").splitlines()
    return {t.strip().lower() for t in lines if t.strip() and not t.lstrip().startswith("#")}


def reason(line, terms, names):
    low = line.lower()
    if any(t in low for t in terms):
        return "never-send term"
    if any(re.search(r"\b%s\b" % re.escape(n), low) for n in names):
        return "user name"
    if PATH_RE.search(line):
        return "local path"
    if MAIL_RE.search(line):
        return "email"
    return None


def parse(text):
    """Split a note into front matter fields, title and Claim/Evidence/... sections."""
    fm, body = {}, text
    if text.startswith("---\n"):
        head, _, body = text[4:].partition("\n---\n")
        for ln in head.splitlines():
            k, sep, v = ln.partition(":")
            if sep:
                fm[k.strip()] = v.strip()
    title, secs, cur = "", {}, None
    for ln in body.splitlines():
        if not title and ln.startswith("# "):
            title = ln[2:].strip()
            continue
        key = next((k for k in KEYS if ln.startswith(k + ":")), None)
        if key:
            cur = key
            secs[cur] = [ln[len(key) + 1:].strip()]
        elif cur:
            secs[cur].append(ln)
    secs = {k: "\n".join(v).strip() for k, v in secs.items()}
    return fm, title, secs


def listval(v):
    return [s.strip() for s in v.strip().strip("[]").split(",") if s.strip()]


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--src", help="the wiki's nodes/ folder (read only)")
    ap.add_argument("--never-send", help="file of terms that must never leave the machine")
    ap.add_argument("--from-copies", action="store_true", help="re-read brain/notes/ instead of the private wiki")
    ap.add_argument("--allowlist", default=str(HERE / "allowlist.txt"))
    a = ap.parse_args()

    interests = json.loads((HERE / "src" / "interests.json").read_text(encoding="utf-8"))
    known = {i["name"] for i in interests["interests"]}
    allow = [s.strip() for s in Path(a.allowlist).read_text(encoding="utf-8").splitlines()
             if s.strip() and not s.lstrip().startswith("#")]
    if a.from_copies:
        terms, names = set(), user_names()
        paths = {p.stem: p for p in sorted(NOTES.glob("*.md"))}
        missing = []
    else:
        if not (a.src and a.never_send):
            ap.error("--src and --never-send are needed unless --from-copies is given")
        src = Path(a.src)
        terms, names = read_terms(a.never_send), user_names()
        paths = {s: src / f"{s}.md" for s in allow if (src / f"{s}.md").is_file()}
        missing = [s for s in allow if s not in paths]
        # Notes written for this site (brain/site-notes/) are always copied, through the same privacy pass.
        paths.update({p.stem: p for p in sorted((HERE / "site-notes").glob("*.md"))})
    present = list(paths)
    keep = set(present)
    for slug in present:
        tags = interests["notes"].get(slug)
        if not tags or not set(tags) <= known:
            sys.exit(f"{slug}: give it one to three interests from brain/src/interests.json")
    texts = {slug: paths[slug].read_text(encoding="utf-8") for slug in present}  # read before the old copies go

    NOTES.mkdir(exist_ok=True)
    for old in NOTES.glob("*.md"):
        old.unlink()

    dropped, data = Counter(), []
    for slug in present:
        out = []
        fm0 = parse(texts[slug])[0]
        kind = listval(fm0.get("kind") or fm0.get("tags", ""))  # a copy already retagged keeps its kind
        for ln in texts[slug].splitlines():
            why = reason(ln, terms, names)
            if why:
                dropped[why] += 1
                continue
            if ln.startswith("kind:"):
                continue
            if ln.startswith("tags:"):
                out.append("tags: [%s]" % ", ".join(interests["notes"][slug]))
                ln = "kind: [%s]" % ", ".join(kind)
            if ln.startswith("links:"):
                # Links to notes that are not public would only name private notes.
                ln = "links: [%s]" % ", ".join(l for l in listval(ln[6:]) if l in keep)
            out.append(ln)
        text = "\n".join(out) + "\n"
        (NOTES / f"{slug}.md").write_text(text, encoding="utf-8")
        fm, title, secs = parse(text)
        data.append({"id": slug, "title": title or slug, "tags": listval(fm.get("tags", "")), "kind": listval(fm.get("kind", "")),
                     "links": listval(fm.get("links", "")), "source": fm.get("source", ""),
                     "claim": secs.get("Claim", ""), "evidence": secs.get("Evidence", ""),
                     **({"site": True} if (HERE / "site-notes" / f"{slug}.md").is_file() else {})})

    js = json.dumps(data, ensure_ascii=False, indent=1).replace("</", "<\\/")
    (HERE / "notes.js").write_text("/* Built by brain/build.py from brain/allowlist.txt. Do not edit by hand. */\n"
                                   "var BRAIN_NOTES = " + js + ";\n", encoding="utf-8")

    # Re-scan what was written: the pass must leave nothing behind.
    left = sum(1 for f in [*NOTES.glob("*.md"), HERE / "notes.js"]
               for ln in f.read_text(encoding="utf-8").splitlines() if reason(ln, terms, names))
    count = Counter(t for d in data for t in d["tags"])
    print("notes per interest: " + ", ".join(f"{i['name']} {count[i['name']]}" for i in interests["interests"]))
    print(f"allowlisted: {len(allow)}  copied: {len(present)} (site notes included)  missing: {len(missing)}")
    for s in missing:
        print(f"  missing: {s}")
    print(f"lines dropped: {sum(dropped.values())}" + "".join(f"  {k}: {v}" for k, v in sorted(dropped.items())))
    print(f"never-send terms checked: {len(terms)}  user names checked: {len(names)}")
    print(f"privacy re-scan of output: {left} hits")
    if left:
        sys.exit("privacy re-scan found hits; nothing should be published")


if __name__ == "__main__":
    main()
