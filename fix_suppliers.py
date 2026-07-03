"""
Fix QuickCommerce sourcingsuppliers collection.

Root cause of "₹NaN Cr" in "Bonus rewarded after turnover":
  - The frontend reads an explicit `bonusRewardAfterTurnover` field.
  - Our seed never wrote that field, so it comes through as undefined
    -> any JS math on undefined yields NaN.

Fix:
  1. Store `bonusThreshold` in Crore units (the UI displays "Cr").
  2. Add explicit `bonusRewardAfterTurnover` = threshold * bonusPct / 100 (also in Cr).
  3. Keep reliability / sustainability as integers 1..5.

Run:
    export MONGO_URI="mongodb://localhost:27017"
    export DB_NAME="quickcommerce"
    python fix_suppliers.py
"""

import os
from pymongo import MongoClient

MONGO_URI = "mongodb://localhost:27017"
DB_NAME   = "quick-commerce"

db = MongoClient(MONGO_URI)[DB_NAME]

# (name, costPerUnit ₹, deliveryWeeks, bonusThreshold_Cr, turnoverBonusPct, reliability, sustainability)
SUPPLIERS = [
    ("EcoFresh Organics", 1440, 1, 500, 5, 5, 5),   # 500 Cr × 5% = 25 Cr reward
    ("GreenLine Foods",   1320, 1, 400, 4, 4, 5),   # 400 Cr × 4% = 16 Cr reward
    ("Standard Traders",  1200, 2, 300, 3, 4, 4),   # 300 Cr × 3% =  9 Cr reward
    ("BudgetMart Supply", 1140, 2, 250, 2, 3, 4),   # 250 Cr × 2% =  5 Cr reward
    ("LowCost Wholesale", 1080, 3, 200, 1, 3, 3),   # 200 Cr × 1% =  2 Cr reward
]

for name, cost, weeks, threshold_cr, bonus_pct, rel, sust in SUPPLIERS:
    reward_cr = round(threshold_cr * bonus_pct / 100, 2)   # in Cr

    result = db.sourcingsuppliers.update_one(
        {"name": name},
        {"$set": {
            "costPerUnit":               cost,
            "deliveryTimeWeeks":         weeks,
            "turnoverBonusPercent":      bonus_pct,
            "bonusThreshold":            threshold_cr,           # in Cr
            "bonusAfterTurnover":        reward_cr,              # in Cr  <-- the missing field
            "reliability":               rel,
            "sustainability":            sust,
        }},
        upsert=True,
    )
    print(f"{name:22s}  threshold=₹{threshold_cr} Cr  bonus={bonus_pct}%  reward=₹{reward_cr} Cr   "
          f"(matched={result.matched_count}, modified={result.modified_count})")

print("\nDone. Refresh the frontend — 'Bonus rewarded after turnover' should now show a real ₹ value.")