#!/usr/bin/env python3
"""
Format the daily "what is working, what is not" report.

Reads the bridge's /admin/digest JSON on stdin, plus DISK / MEM / TERMS from the
environment, and prints the Telegram message body.

Kept as its own file rather than inlined in digest.sh: the first version was a
python3 -c inside a single-quoted shell string, and the escaping needed to get
dict keys into f-strings produced a SyntaxError that only showed up at send time.
"""
import json
import os
import sys


def main() -> int:
    try:
        d = json.load(sys.stdin)
    except Exception as exc:                      # noqa: BLE001
        print(f"Could not parse the bridge digest: {exc}")
        return 1

    b = d.get("bridge", {})
    m = d.get("metrics", {})
    problems = d.get("problems", [])
    accounts = d.get("accounts", [])

    out = ["🔴 VELQUOR daily report" if problems else "🟢 VELQUOR daily report", ""]

    out.append("WORKING")
    out.append(f"· bridge {b.get('version')} up {b.get('uptime_h')}h, settings from {b.get('settings_source')}")
    out.append(f"· {os.environ.get('TERMS', '?')} terminal(s) running")
    out.append(
        f"· {m.get('syncs', 0)} syncs, {m.get('signals', 0)} copy signals, "
        f"{m.get('screenshots', 0)} screenshots since restart"
    )
    out.append(f"· disk {os.environ.get('DISK', '?')}% · ram {os.environ.get('MEM', '?')}")

    for a in [x for x in accounts if x.get("connected") and not x.get("stale")]:
        out.append(f"· {a['email']} ({a['tier']}) synced {a['last_sync_min']}m ago")

    if problems:
        out += ["", "NOT WORKING"]
        out += [f"· {p}" for p in problems]
    else:
        out += ["", "Nothing is broken."]

    idle = [x for x in accounts if not x.get("connected") and not x.get("banned")]
    if idle:
        out += ["", f"{len(idle)} account(s) with no MT5 connected — expected for signups who have not set up yet."]

    rejects = m.get("banned_rejects", 0)
    badkeys = m.get("unauthorized", 0)
    if rejects or badkeys:
        out += ["", f"⚠ {rejects} banned / {badkeys} bad-key rejections since restart."]

    print("\n".join(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
