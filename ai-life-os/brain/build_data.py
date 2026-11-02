#!/usr/bin/env python3
"""Build brain/brain-data.json, the public data of the second brain page (brain/index.html).
Run from anywhere: python3 -I ai-life-os/brain/build_data.py
Reads only public files of this site:
  brain/notes.js            the approved wiki notes (built by build.py)
  brain/src/extra.json      hand-written nodes: areas, FirstMate parts and tricks, the harness tier list
  brain/src/site.json       the centre file, this site's pages, public projects, the reading order
  maps/src/skills/map.json  the skills (the inner ring)
  blog/index.html           the Field Notes posts
  course/course.json        the AI introductory course's lessons
Every url in the output is relative to brain/ or a public https link. Stdlib only."""
import html, json, re
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = HERE.parent
rd = lambda p: (SITE / p).read_text(encoding="utf-8")
site = json.loads(rd("brain/src/site.json"))
extra = json.loads(rd("brain/src/extra.json"))
notes = json.loads(rd("brain/notes.js").split("=", 1)[1].strip().rstrip(";"))
skills_map = json.loads(rd("maps/src/skills/map.json"))
plain = lambda s: re.sub(r"\*\*|==|`|\[\[([^\]]+)\]\]", lambda m: m.group(1) or "", s or "")


def links(pairs):
    return [{"label": l, "href": h} for l, h in pairs or []]


# Room 1: the wiki notes, one folder per first tag
by_tag = {}
for n in notes:
    by_tag.setdefault(n["tags"][0] if n["tags"] else "other", []).append({
        "id": n["id"], "n": n["title"], "line": "wiki note · " + ", ".join(n["tags"]),
        "body": [n["claim"]] + (["Evidence: " + n["evidence"]] if n.get("evidence") else []) + (["Source: " + n["source"]] if n.get("source") else []),
        "links": links([["Read the public copy of this note", "notes/" + n["id"] + ".md"]]),
        "rel": n.get("links", [])})
notes_room = {"id": "notes", "label": "Wiki notes", "color": "#b57bff",
              "note": "A public slice of the owner's private notes wiki: only notes on an approved list are copied, and a build step drops any line with a private term, a local path, an email or a user name.",
              "links": links([["Approved list", "allowlist.txt"], ["Build script", "build.py"]]),
              "folders": [{"name": t, "count": len(fs), "files": fs} for t, fs in sorted(by_tag.items())]}

# Rooms 2 and 3: FirstMate in detail, and areas of interest (src/extra.json)
X = {e["id"]: e for e in extra["extra"]}
TAGS = {"advantage": "advantage", "gap": "gap", "borrowed-from": "borrowed from", "trick": "trick"}


def node(e, kind):
    body = list(e.get("text", []))
    if e.get("gap"):
        body.append("Gap: " + e["gap"])
    if e["id"].startswith("part-"):
        body.append(extra["core_note"])
    ls = links(e.get("links"))
    if e["id"].startswith("part-"):
        ls = links([["Open this part on Core logic", "../core.html#" + e["id"]]])
    tags = [TAGS.get(t, t) + (" " + e["from"] if t == "borrowed-from" and e.get("from") else "") for t in e.get("tags", [])]
    return {"id": e["id"], "n": e["label"], "line": kind + (" · " + ", ".join(tags) if tags else ""), "body": body, "links": ls,
            "rel": [r for r in e.get("edges", []) if not r.startswith("g-")]}


def hub_of(gid, rid, label, color, folders):
    g = X[gid]
    return {"id": rid, "label": label, "color": color, "note": " ".join(g.get("text", [])), "links": links(g.get("links")),
            "folders": [{"name": f, "count": len(fs), "files": fs} for f, fs in folders]}


fm = [e for e in extra["extra"] if e["group"] == "fm" and not e.get("hub")]
fm_room = hub_of("g-fm", "fm", "FirstMate in detail", "#ff4fd8", [
    ("the 12 parts", [node(e, "harness part") for e in fm if e["id"].startswith("part-")]),
    ("tricks", [node(e, "trick") for e in fm if e["id"].startswith("trick-")]),
    ("borrowed", [node(e, "borrowed idea") for e in fm if e["id"].startswith("b-")])])
areas_room = hub_of("g-area", "areas", "Areas of interest", "#2ee6c5", [
    ("areas", [node(e, "area") for e in extra["extra"] if e["group"] == "area" and not e.get("hub")])])

# Room 4: the harness tier list
tier = []
for tid, label, has, dif, lacks, guess, src in extra["tier"]:
    ls = [["The harness arena", "../arena.html"]] + ([["Primary source", src]] if src else [])
    tier.append({"id": tid, "n": label, "line": "harness setup · %d of 12 parts" % has,
                 "body": ["Has %d · Different %d · Lacks %d · Guess %d, out of the same twelve parts." % (has, dif, lacks, guess)]
                 + ([] if src else ["Name and score only on this page."]),
                 "links": links(ls), "rel": extra["tier_edges"].get(tid, [])})
tier_room = hub_of("g-tier", "tier", "Harness tier list", "#ffd93d", [("scored setups", tier)])

# Room 5: Field Notes posts, one folder per kicker; a post opens in the reading drawer
POST = re.compile(r'<li><p class="k-kicker">([^<]+)</p><h2><a href="([^"]+)">(.+?)</a></h2><p>(.+?)</p><p class="k-meta"><time datetime="([^"]+)">([^<]+)</time>')
posts = {}
for kick, href, title, dek, _, date in POST.findall(rd("blog/index.html")):
    url = "../blog/" + href
    posts.setdefault(html.unescape(kick), []).append({"id": href[:-5], "n": html.unescape(title), "line": "post · " + date,
                                                     "body": [html.unescape(dek)], "url": url, "links": links([["Read the post", url]]), "rel": []})
posts_room = {"id": "posts", "label": "Field Notes", "color": "#5cd3ff", "note": "Published posts on harness engineering and alignment.",
              "links": links([["All Field Notes", "../blog/index.html"]]),
              "folders": [{"name": k, "count": len(v), "files": v} for k, v in posts.items()]}

# Room 6: the AI introductory course, one dot per lesson; graph.js greys a lesson until it is done in this browser
course = json.loads(rd("course/course.json"))
lessons = course["lessons"]
course_room = {"id": "course", "label": "Course", "color": "#7dff8a",
               "note": course["title"] + ": %d short lessons in a fixed order, read with EA-bot. A lesson's dot lights up once you finish it in this browser." % len(lessons),
               "links": links([["Open the course", "../course/index.html"]]),
               "folders": [{"name": "lessons", "count": len(lessons), "files": [
                   {"id": "course-" + l["id"], "n": "%d. %s" % (i, l["title"]), "line": "course · lesson %d of %d" % (i, len(lessons)),
                    "body": [l["summary"]], "links": links([["Open this lesson", "../course/index.html#" + l["id"]]]), "rel": [], "lesson": l["id"]}
                   for i, l in enumerate(lessons, 1)]}]}

skills = [{"n": s["name"], "desc": plain(s.get("whatItIs")), "when": s.get("trigger", ""), "url": "../maps/skills.html#" + sid}
          for sid, s in skills_map["skills"].items()]

out = {"meta": {"name": "AI-Life-OS public second brain", "invented": False,
                "note": "Public data only: the approved wiki notes, this site's pages and posts, the skill map and the harness tier list. No private files, paths, routines or links."},
       "root": site["root"], "rooms": [notes_room, fm_room, areas_room, tier_room, posts_room, course_room], "skills": skills, "routines": [],
       "apps": [], "projects": [dict(p, kind="project") for p in site["projects"]], "pages": [dict(p, kind="page") for p in site["pages"]],
       "reading": site["reading"]}
(HERE / "brain-data.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print("rooms", [(r["label"], sum(f["count"] for f in r["folders"])) for r in out["rooms"]], "skills", len(skills))
