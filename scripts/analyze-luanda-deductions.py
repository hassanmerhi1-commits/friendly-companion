import sqlite3
import json

db = r"c:\PayrollAO\payrollluanda.db"
c = sqlite3.connect(db)
c.row_factory = sqlite3.Row

TARGETS = ["%JACINTO JOAO%", "%ISMAIL LUIS%"]

for pattern in TARGETS:
    row = c.execute("SELECT id, name FROM employees WHERE name LIKE ?", (pattern,)).fetchone()
    if not row:
        print("NOT FOUND:", pattern)
        continue

    eid, ename = row["id"], row["name"]
    print("\n" + "=" * 70)
    print(ename)

    deds = c.execute(
        """SELECT id, type, description, amount, total_amount, installments,
           installments_paid, remaining_amount, is_fully_paid
           FROM deductions WHERE employee_id=? ORDER BY type""",
        (eid,),
    ).fetchall()

    print("\nSTORED (%d rows):" % len(deds))
    ded_by_id = {}
    for d in deds:
        ded_by_id[d["id"]] = d
        print(
            "  [%s] %s | total=%s rem=%s paid=%s/%s fully=%s | %s"
            % (
                d["type"],
                (d["description"] or "")[:30],
                d["total_amount"],
                d["remaining_amount"],
                d["installments_paid"],
                d["installments"],
                d["is_fully_paid"],
                d["id"][:8],
            )
        )

    entries = c.execute(
        """SELECT pe.deduction_details, pp.year, pp.month, pp.status
           FROM payroll_entries pe JOIN payroll_periods pp ON pe.period_id=pp.id
           WHERE pe.employee_id=? AND pp.status IN ('approved','paid')
           ORDER BY pp.year, pp.month""",
        (eid,),
    ).fetchall()

    print("\nFINALIZED PAYROLL (%d):" % len(entries))
    history_by_id = {}
    history_by_type = {}
    missing_id_lines = []

    for e in entries:
        details = json.loads(e["deduction_details"] or "[]")
        ym = "%d-%02d" % (e["year"], e["month"])
        print("  %s | items=%d" % (ym, len(details)))
        for x in details:
            keys = list(x.keys())
            did = x.get("deductionId") or x.get("deduction_id") or x.get("id")
            amt = float(x.get("amount") or 0)
            typ = x.get("type") or "?"
            if did:
                history_by_id[did] = history_by_id.get(did, 0) + amt
            else:
                missing_id_lines.append((ym, typ, amt, keys))
            history_by_type[typ] = history_by_type.get(typ, 0) + amt
            print(
                "    %s amt=%.0f dedId=%s keys=%s"
                % (typ, amt, (did or "MISSING")[:12], keys)
            )

    print("\nRECONCILE SIMULATION (by deductionId):")
    for did, paid in sorted(history_by_id.items(), key=lambda x: -x[1]):
        d = ded_by_id.get(did)
        if not d:
            print("  %s history_paid=%.0f -> NO DEDUCTION ROW" % (did[:8], paid))
            continue
        rem = max(0, float(d["total_amount"]) - paid)
        print(
            "  %s [%s] history=%.0f stored_rem=%s -> should_rem=%.0f fully_should=%s"
            % (
                did[:8],
                d["type"],
                paid,
                d["remaining_amount"],
                rem,
                rem < 1,
            )
        )

    if missing_id_lines:
        print("\nWARNING: lines without deductionId:")
        for line in missing_id_lines:
            print("  ", line)

    print("\nBY TYPE (all history):")
    for typ, amt in sorted(history_by_type.items(), key=lambda x: -x[1]):
        print("  %s: %.0f" % (typ, amt))

c.close()
