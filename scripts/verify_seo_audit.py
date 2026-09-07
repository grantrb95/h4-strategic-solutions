#!/usr/bin/env python3
"""Build + verification pass for the Sept 2026 SEO audit branch.

1. Regenerates the build.py-templated pages (the 4 verticals, coverage-area,
   privacy-policy, terms) into a scratch directory - this is "the build" for
   a static site with no bundler; the checked-in index.html isn't
   build.py-generated and is read directly from the repo.
2. Fetches each of the 6 public pages + 2 legal pages from that built output
   and asserts:
     - exactly one <h1>
     - og:image present
     - zero "22,500"
     - zero "real-time" / "real time" / "realtime" (case-insensitive)
     - GA4 snippet present (all pages get it - see note below)
     - noindex present only on the two legal pages
3. Prints a pass/fail table. Exits non-zero if anything failed.
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PUBLIC_PAGES = [
    "oilfield-emergency-hauling.html",
    "construction-equipment-hauling.html",
    "aerospace-manufacturing-freight.html",
    "equipment-rental-logistics.html",
    "coverage-area.html",
]
LEGAL_PAGES = ["privacy-policy.html", "terms.html"]


def build(out_dir):
    build_py = open(os.path.join(REPO_ROOT, "build.py"), encoding="utf-8").read()
    build_py = re.sub(r'^OUT = .*$', f'OUT = "{out_dir}"', build_py, count=1, flags=re.MULTILINE)
    scratch_script = os.path.join(REPO_ROOT, "_verify_scratch_build.py")
    with open(scratch_script, "w", encoding="utf-8") as f:
        f.write(build_py)
    try:
        subprocess.run([sys.executable, scratch_script], cwd=REPO_ROOT, check=True,
                        capture_output=True)
    finally:
        os.remove(scratch_script)


def checks_for(name, html):
    h1_count = len(re.findall(r"<h1[\s>]", html))
    has_og_image = 'property="og:image"' in html
    has_payload_figure = "22,500" in html or "22500" in html
    has_real_time = re.search(r"real-time|real time|realtime", html, re.IGNORECASE) is not None
    has_ga4 = "G-5S9LT3E1SP" in html
    has_noindex = 'name="robots"' in html and "noindex" in html

    is_legal = name in LEGAL_PAGES
    results = [
        ("exactly one <h1>", h1_count == 1, f"found {h1_count}"),
        ("og:image present", has_og_image, ""),
        ("zero 22,500 payload figure", not has_payload_figure, ""),
        ("zero real-time claim", not has_real_time, ""),
        ("GA4 snippet present", has_ga4, ""),
        ("noindex only on legal pages",
         has_noindex if is_legal else not has_noindex,
         "expected noindex" if is_legal else "unexpected noindex"),
    ]
    return results


def main():
    scratch = tempfile.mkdtemp(prefix="h4-verify-")
    try:
        build(scratch)

        pages = {}
        pages["index.html"] = open(os.path.join(REPO_ROOT, "index.html"), encoding="utf-8").read()
        for name in PUBLIC_PAGES + LEGAL_PAGES:
            pages[name] = open(os.path.join(scratch, name), encoding="utf-8").read()

        all_rows = []
        any_fail = False
        for name, html in pages.items():
            for check_name, passed, detail in checks_for(name, html):
                all_rows.append((name, check_name, passed, detail))
                if not passed:
                    any_fail = True

        name_w = max(len(r[0]) for r in all_rows)
        check_w = max(len(r[1]) for r in all_rows)
        print(f"{'PAGE':<{name_w}}  {'CHECK':<{check_w}}  RESULT  DETAIL")
        print("-" * (name_w + check_w + 30))
        for name, check_name, passed, detail in all_rows:
            status = "PASS" if passed else "FAIL"
            print(f"{name:<{name_w}}  {check_name:<{check_w}}  {status:<6}  {detail}")

        print()
        if any_fail:
            print("RESULT: FAIL - see rows above")
            sys.exit(1)
        else:
            print("RESULT: ALL CHECKS PASSED")
    finally:
        shutil.rmtree(scratch, ignore_errors=True)


if __name__ == "__main__":
    main()
