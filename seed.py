"""
QuickCommerce Simulation — MongoDB Seed Script
================================================
Populates all config collections + a sample Round 1 simulation with 6 players
matching the H..M columns of the Round1 sheet in QuickCommerce_Final.xlsx.

Usage:
    export MONGO_URI="mongodb://localhost:27017"
    export DB_NAME="quickcommerce"
    python seed_round1.py

Env vars (optional):
    RESET=1       -> drops the config + player collections before inserting
    SIM_NAME=...  -> name of the simulation doc (default: "QuickCommerce Round 1")
"""

import os
from datetime import datetime
from bson import ObjectId
from pymongo import MongoClient

# ------------------------------------------------------------------
# CONFIG
# ------------------------------------------------------------------
MONGO_URI = "mongodb://localhost:27017"
DB_NAME   = "quick-commerce"
RESET     = True
SIM_NAME  = "QuickCommerce Round 1"

client = MongoClient(MONGO_URI)
db     = client[DB_NAME]

CONFIG_COLLECTIONS = [
    "simulations", "groups", "users",
    "productcategories", "deliveryconfigs", "technologyconfigs",
    "marketingconfigs", "hrconfigs", "operationsstaffingconfigs",
    "pricingconfigs", "sourcingsuppliers",
    "businessmodeloptions", "marketpositionoptions",
    "employees", "features",
]
PLAYER_COLLECTIONS = [
    "playerstepones", "playerstepfours", "playerstepfives",
    "playerstepeights", "playerstepnines", "userselections",
    "playerproductcategories", "pricingdecisions",
    "teamprofiles",
]

if RESET:
    for c in CONFIG_COLLECTIONS + PLAYER_COLLECTIONS:
        db[c].drop()
    print("Dropped existing collections.")

now = datetime.utcnow()

# ==================================================================
# STEP 1  — Market / Product Categories
#   Sheet cells B3:E5 -> segment demand per category
#   Food(A3)   Premium=600  Standard=1250 Basic=1300 Discount=1800
#   Mobile(A4) Premium=700  Standard=800  Basic=700  Discount=900
#   Clothes(A5)Premium=200  Standard=500  Basic=700  Discount=1200
# ==================================================================
PRODUCT_CATEGORIES = [
    {
        "name": "Food",
        "isActive": True,
        "baseCost": 1200,                         # D78 in sheet
        "baseMonthlyDemand": 600 + 1250 + 1300 + 1800,
        "pricingTiers": {"premium": 600, "standard": 1250, "basic": 1300, "discount": 1800},
        "inventoryRanges": [
            {"label": "Low",    "min": 0,    "max": 1500},
            {"label": "Medium", "min": 1500, "max": 3500},
            {"label": "High",   "min": 3500, "max": 6000},
        ],
    },
    {
        "name": "Mobile",
        "isActive": True,
        "baseCost": 1200,
        "baseMonthlyDemand": 700 + 800 + 700 + 900,
        "pricingTiers": {"premium": 700, "standard": 800, "basic": 700, "discount": 900},
        "inventoryRanges": [
            {"label": "Low",    "min": 0,    "max": 1000},
            {"label": "Medium", "min": 1000, "max": 2500},
            {"label": "High",   "min": 2500, "max": 4000},
        ],
    },
    {
        "name": "Clothes",
        "isActive": True,
        "baseCost": 1200,
        "baseMonthlyDemand": 200 + 500 + 700 + 1200,
        "pricingTiers": {"premium": 200, "standard": 500, "basic": 700, "discount": 1200},
        "inventoryRanges": [
            {"label": "Low",    "min": 0,   "max": 800},
            {"label": "Medium", "min": 800, "max": 2000},
            {"label": "High",   "min": 2000,"max": 3500},
        ],
    },
]
cat_ids = {}
for c in PRODUCT_CATEGORIES:
    res = db.productcategories.insert_one(c)
    cat_ids[c["name"]] = res.inserted_id
print(f"Inserted {len(PRODUCT_CATEGORIES)} product categories.")

# ==================================================================
# STEP 2  — Delivery / Fleet Config
#   Riders D11 = 30000 each; Bikes D12 = 25000 each
#   Route Opt (C13=1.10, D13=100000)
#   GPS      (C14=1.06, D14=80000)  applies Premium+Standard
#   Algo     (C15=1.08, D15=108000)
#   Warehouse(C16=1.07, D16=105000)
#   EV %     (C17=0.10 per unit, D17=2 divisor)
#   Bike-Rider ratio bands: C19=2.5, D19=3.5 -> 0.85 / 0.95 / 1.05
# ==================================================================
delivery_config = {
    "ownFleet": {
        "setupCost":         {"min": 50000, "max": 200000},
        "riders":            {"min": 1,     "max": 20},
        "riderCostPerMonth": {"min": 30000, "max": 30000},   # D11
        "bikes":             {"min": 1,     "max": 10},
        "bikeCost":          {"min": 25000, "max": 25000},   # D12
        "electricBikeConfig": {
            "electricBikePercent":         0.10,             # C17
            "electricBikeCostMultiplier":  2,                # D17
        },
    },
    "thirdPartyDelivery": {"costPerOrder": {"min": 40, "max": 80}},
    "logisticsOptimization": {
        "routeOptimization": {
            "cost": 100000,
            "multiplierBySegment": {"premium": 1.10, "standard": 1.10, "basic": 1.10, "discount": 1.10},
        },
        "gpsTracking": {
            "cost": 80000,
            "multiplierBySegment": {"premium": 1.06, "standard": 1.06, "basic": 1.00, "discount": 1.00},
        },
        "algorithmAssignment": {
            "cost": 108000,
            "multiplierBySegment": {"premium": 1.08, "standard": 1.08, "basic": 1.08, "discount": 1.08},
        },
        "warehousingSystem": {
            "cost": 105000,
            "multiplierBySegment": {"premium": 1.07, "standard": 1.07, "basic": 1.07, "discount": 1.07},
        },
    },
    # Bike-Rider Optimization ratio bands (Excel row 18 / C18-E18, C19-D19):
    #   V18 = IF(riders/bikes < 2.5, 0.85, IF(riders/bikes > 3.5, 0.95, 1.05))
    "bikeRiderRatioBands": {"lowThreshold": 2.5, "highThreshold": 3.5,
                            "belowMultiplier": 0.85, "optimalMultiplier": 1.05, "aboveMultiplier": 0.95},
}
db.deliveryconfigs.insert_one(delivery_config)
print("Inserted delivery config.")

# ==================================================================
# STEP 3  — Technology Config
#   Rows 24-31 in sheet
# ==================================================================
def tech_item(applies_to, cost, mult, segments=("premium","standard","basic","discount")):
    seg = {s: (mult if s in segments else 1) for s in ("premium","standard","basic","discount")}
    return {"appliesTo": applies_to, "cost": cost, "multiplierBySegment": seg}

technology_config = {
    "customerFacing": {
        "mobileApp":          tech_item("Mandatory",       140000, 1.15),                                # row 24
        "voiceOrdering":      tech_item("Premium,Standard", 80000, 1.06, ("premium","standard")),        # row 25
        "websiteDevelopment": {"appliesTo": "Slider", "cost": 35000,                                     # row 31
                               "multiplierBySegment": {"premium": 0.03, "standard": 0.03,
                                                       "basic": 0.03, "discount": 0.03}},
    },
    "operations": {
        "darkStoreSystem":      tech_item("All",     108000, 1.08),                                      # row 26
        "riderApp":             tech_item("All",     103500, 1.07),                                      # row 27
        "demandForecastingAI":  tech_item("All",     120000, 1.12),                                      # row 28
        "dynamicPricing":       tech_item("All",     120000, 1.12),                                      # row 29
        "supplyChainAnalytics": tech_item("All",      80000, 1.06),                                      # row 30
    },
}
db.technologyconfigs.insert_one(technology_config)
print("Inserted technology config.")

# ==================================================================
# STEP 4  — Sourcing / Suppliers
#   Rows 38-47: sustainability 5*→3* with different multipliers for
#   Premium vs Mass segments. Encoded as suppliers with sustainability rating.
# ==================================================================
SUPPLIERS = [
    {"name": "EcoFresh Organics", "logoUrl": "", "costPerUnit": 1440,  # +20% premium
     "deliveryTimeWeeks": 1, "turnoverBonusPercent": 5, "bonusThreshold": 500000,
     "reliability": 5, "sustainability": 5},
    {"name": "GreenLine Foods",   "logoUrl": "", "costPerUnit": 1320,  # +10% premium
     "deliveryTimeWeeks": 1, "turnoverBonusPercent": 4, "bonusThreshold": 400000,
     "reliability": 4, "sustainability": 4.5},
    {"name": "Standard Traders",  "logoUrl": "", "costPerUnit": 1200,  # neutral
     "deliveryTimeWeeks": 2, "turnoverBonusPercent": 3, "bonusThreshold": 300000,
     "reliability": 4, "sustainability": 4},
    {"name": "BudgetMart Supply", "logoUrl": "", "costPerUnit": 1140,  # -5%
     "deliveryTimeWeeks": 2, "turnoverBonusPercent": 2, "bonusThreshold": 250000,
     "reliability": 3, "sustainability": 3.5},
    {"name": "LowCost Wholesale", "logoUrl": "", "costPerUnit": 1080,  # -10%
     "deliveryTimeWeeks": 3, "turnoverBonusPercent": 1, "bonusThreshold": 200000,
     "reliability": 3, "sustainability": 3},
]
supplier_ids = []
for s in SUPPLIERS:
    supplier_ids.append(db.sourcingsuppliers.insert_one(s).inserted_id)
print(f"Inserted {len(SUPPLIERS)} suppliers.")

# ==================================================================
# STEP 5  — Marketing Config
#   Rows 52-63 in sheet
# ==================================================================
def mkt_item(applies_to, cost, mult, segments=("premium","standard","basic","discount")):
    seg = {s: (mult if s in segments else 1) for s in ("premium","standard","basic","discount")}
    return {"appliesTo": applies_to, "cost": cost, "multiplier": mult, "multiplierBySegment": seg}

marketing_config = {
    "acquisition":  {},
    "retention":    {},
    "partnerships": {},
    "marketing": {
        "googleAds":           mkt_item("Slider",             25000, 0.02),                               # row 52
        "facebookAds":         mkt_item("Slider",             20000, 0.02),                               # row 53
        "referralProgram":     mkt_item("All",               120000, 1.12),                               # row 54
        "firstOrderDiscount":  mkt_item("Standard,Basic,Discount", 150000, 1.15, ("standard","basic","discount")),  # row 55
        "influencerMarketing": mkt_item("Premium,Standard",  110000, 1.11, ("premium","standard")),       # row 56
        "cashbackOption":      mkt_item("Standard,Basic,Discount",  95000, 1.09, ("standard","basic","discount")),  # row 57
        "loyaltyProgram":      mkt_item("Premium,Standard",  156000, 1.16, ("premium","standard")),       # row 58
        "pushNotifications":   mkt_item("All",                80000, 1.07),                               # row 59
        "emailAndSMS":         mkt_item("All",                60000, 1.05),                               # row 60
        "creditCardOffers":    mkt_item("Premium,Standard",   85000, 1.08, ("premium","standard")),       # row 61
        "corporateTieUps":     mkt_item("Premium,Standard",  150000, 1.14, ("premium","standard")),       # row 62
        "housingSociety":      mkt_item("Standard,Basic",    120000, 1.13, ("standard","basic")),         # row 63
    },
    "totalInvestmentAverage": {
        "appliesTo": "Competitive",
        "multiplier": 0.9,   # C64
        "cost": 0,
    },
}
db.marketingconfigs.insert_one(marketing_config)
print("Inserted marketing config.")

# ==================================================================
# STEP 6  — Operations / Staffing + HR
#   Rows 69-73 in sheet
# ==================================================================
def role(mn, mx, sal_mn, sal_mx, boost):
    return {"min": mn, "max": mx, "salary": {"min": sal_mn, "max": sal_mx}, "boost": boost}

operations_staffing_config = {
    "darkStoreStaff": {
        "storeManager":   role(1, 2, 40000, 60000, 1.05),
        "pickersPackers": role(2, 8, 15000, 22000, 1.03),
        "inventoryStaff": role(1, 3, 18000, 25000, 1.02),
        "qualityCheckers":role(1, 2, 20000, 28000, 1.03),
        "cleaningStaff":  role(1, 2, 10000, 14000, 1.01),
    },
    "deliveryStaff": {
        "deliveryRiders":   role(3, 20, 18000, 30000, 1.00),
        "riderSupervisors": role(1, 3,  30000, 45000, 1.04),
    },
    "corporateTeam": {
        "founders":         role(1, 3, 0,      100000, 1.00),
        "categoryTeam":     role(1, 4, 40000,  70000,  1.03),
        "operationsTeam":   role(1, 5, 40000,  70000,  1.03),
        "techTeam":         role(1, 6, 50000,  90000,  1.05),
        "marketingTeam":    role(1, 5, 40000,  75000,  1.04),
        "supplyChainTeam":  role(1, 4, 40000,  70000,  1.03),
        "customerSupport":  role(1, 6, 20000,  35000,  1.02),
    },
}
db.operationsstaffingconfigs.insert_one(operations_staffing_config)
print("Inserted operations staffing config.")

# HRConfig – global training/bonus defaults (per-player instances get created during play)
hr_config_defaults = {
    "selectedEmployees": [],
    "trainingBudgetPerEmployee": 50000,   # D71
    "bonusPerEmployee":         0.05,     # C73 lower band
    "createdAt": now,
}
db.hrconfigs.insert_one(hr_config_defaults)
print("Inserted HR config defaults.")

# ==================================================================
# STEP 7  — Pricing Config
#   Rows 96-103 in sheet: Quality 1..7 -> CP multiplier 1.0,1.2,1.4,1.6,1.8,2.0,2.4
#   Base cost D78 = 1200
# ==================================================================
pricing_config = {
    "baseCostPerCategory": {"Food": 1200, "Mobile": 1200, "Clothes": 1200},   # D78
    "qualityMultipliers":  {"1": 1.0, "2": 1.2, "3": 1.4,
                            "4": 1.6, "5": 1.8, "6": 2.0, "7": 2.4},
    "maxBaseQuality": 7,
}
db.pricingconfigs.insert_one(pricing_config)
print("Inserted pricing config.")

# ==================================================================
# Business Model + Market Position options (Step 1 player choice inputs)
# ==================================================================
BUSINESS_MODELS = [
    {"name": "Own Inventory + Own Delivery",
     "description": "You buy stock, you deliver.", "example": "Blinkit / Zepto model",
     "isActive": True},
    {"name": "Marketplace + 3PL",
     "description": "Aggregate sellers, outsource delivery.", "example": "Amazon Fresh",
     "isActive": True},
    {"name": "Hybrid",
     "description": "Own dark stores in top cities, 3PL elsewhere.", "example": "BigBasket",
     "isActive": True},
]
bm_ids = [db.businessmodeloptions.insert_one(b).inserted_id for b in BUSINESS_MODELS]

MARKET_POSITIONS = [
    {"name": "Premium Urban",   "description": "High-income metros",     "focus": "Imported, organic focus", "isActive": True},
    {"name": "Mass Metropolitan","description": "Middle-class metros",    "focus": "Everyday essentials",     "isActive": True},
    {"name": "Value Tier-2",    "description": "Price-conscious Tier-2", "focus": "Discounts, cashback",     "isActive": True},
    {"name": "Discount Rural",  "description": "Rural affordability",    "focus": "Basic staples",           "isActive": True},
]
mp_ids = [db.marketpositionoptions.insert_one(m).inserted_id for m in MARKET_POSITIONS]
print(f"Inserted {len(BUSINESS_MODELS)} business models + {len(MARKET_POSITIONS)} market positions.")

# ==================================================================
# Employees (roster for HR step)
# ==================================================================
EMPLOYEES = [
    {"name": "Ravi Sharma",   "role": "CEO",           "expertise": "Strategy",   "salaryPerMonth": 250000, "isTopManagement": True,  "profileImage": ""},
    {"name": "Priya Iyer",    "role": "COO",           "expertise": "Operations", "salaryPerMonth": 200000, "isTopManagement": True,  "profileImage": ""},
    {"name": "Arjun Mehta",   "role": "CTO",           "expertise": "Technology", "salaryPerMonth": 220000, "isTopManagement": True,  "profileImage": ""},
    {"name": "Neha Verma",    "role": "CMO",           "expertise": "Marketing",  "salaryPerMonth": 190000, "isTopManagement": True,  "profileImage": ""},
    {"name": "Karan Patel",   "role": "Head Supply",   "expertise": "Supply",     "salaryPerMonth": 170000, "isTopManagement": False, "profileImage": ""},
    {"name": "Ishita Rao",    "role": "Head Category", "expertise": "Category",   "salaryPerMonth": 160000, "isTopManagement": False, "profileImage": ""},
]
for e in EMPLOYEES:
    db.employees.insert_one(e)
print(f"Inserted {len(EMPLOYEES)} employees.")

# ==================================================================
# Features (Step 3 tech features as flat objects)
# ==================================================================
FEATURES = [
    {"key": "mobile_app",           "name": "Mobile App",            "cost": 140000, "benefit": "1.15x all",       "dependsOn": []},
    {"key": "voice_ordering",       "name": "Voice Ordering",        "cost": 80000,  "benefit": "1.06x premium+std","dependsOn": ["mobile_app"]},
    {"key": "dark_store_system",    "name": "Dark Store System",     "cost": 108000, "benefit": "1.08x all",       "dependsOn": []},
    {"key": "rider_app",            "name": "Rider App",             "cost": 103500, "benefit": "1.07x all",       "dependsOn": ["mobile_app"]},
    {"key": "demand_forecasting_ai","name": "Demand Forecasting AI", "cost": 120000, "benefit": "1.12x all",       "dependsOn": []},
    {"key": "dynamic_pricing",      "name": "Dynamic Pricing",       "cost": 120000, "benefit": "1.12x all",       "dependsOn": []},
    {"key": "supply_chain_analytics","name":"Supply Chain Analytics","cost": 80000,  "benefit": "1.06x all",       "dependsOn": []},
    {"key": "website_development",  "name": "Website Development",   "cost": 35000,  "benefit": "0.03x slider",    "dependsOn": []},
]
for f in FEATURES:
    db.features.insert_one(f)
print(f"Inserted {len(FEATURES)} features.")

# ==================================================================
# SIMULATION + GROUP + 6 USERS matching Player 1..6 in the sheet
# ==================================================================
simulation = {
    "name": SIM_NAME,
    "totalRounds": 3,
    "rounds": [
        {"roundNumber": 1, "name": "Round 1"},
        {"roundNumber": 2, "name": "Round 2"},
        {"roundNumber": 3, "name": "Round 3"},
    ],
    "createdAt": now,
    "updatedAt": now,
}
sim_id = db.simulations.insert_one(simulation).inserted_id

group = {"name": "Cohort A", "simulationId": sim_id, "createdAt": now, "updatedAt": now}
group_id = db.groups.insert_one(group).inserted_id

USER_NAMES = ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5", "Player 6"]
user_ids = []
for name in USER_NAMES:
    uid = db.users.insert_one({
        "username": name.lower().replace(" ", ""),
        "email":    f"{name.lower().replace(' ', '')}@qc.local",
        "password": "seed-password-hash",         # replace with real hash in prod
        "simulationId": str(sim_id),
        "groupId":      str(group_id),
    }).inserted_id
    user_ids.append(uid)

    db.teamprofiles.insert_one({
        "companyName": f"{name} Ventures",
        "teamMembers": [{"name": name, "designation": "Founder"}],
        "createdAt": now,
    })

print(f"Created simulation, group, {len(user_ids)} users, {len(user_ids)} team profiles.")

# ==================================================================
# PLAYER SELECTIONS — mirror sheet columns H..M
# ==================================================================
# Sheet H..M rows → per-player raw inputs.
# Each dict below is one player's choice set for one step.

# Step 1 — which categories & positions
PLAYER_STEP_ONE = [
    {"business": 0, "positions": [0, 1]},  # Player 1
    {"business": 0, "positions": [1]},
    {"business": 2, "positions": [0, 1, 2]},
    {"business": 1, "positions": [1, 2]},
    {"business": 2, "positions": [0, 1]},
    {"business": 1, "positions": [2, 3]},
]

# Step 1 → PlayerProductCategory (Food/Mobile/Clothes selection from H3:M5)
# Sheet says: H3..M3 all 1 (all play Food); Mobile has K4=0 (player 4 skips);
# Clothes: H5..M5 -> 1,0,1,0,1,1
FOOD_PLAY    = [1, 1, 1, 1, 1, 1]
MOBILE_PLAY  = [1, 1, 1, 0, 1, 0]
CLOTHES_PLAY = [1, 0, 1, 0, 1, 1]

# Step 2 — fleet & logistics from rows 11-17
RIDERS  = [3, 3, 3, 3, 3, 3]
BIKES   = [1, 1, 1, 1, 1, 1]
ROUTE_OPT       = [1, 0, 0, 0, 0, 0]      # H13:M13
GPS_TRACKING    = [0, 1, 0, 0, 0, 1]      # H14:M14
ALGO_ASSIGN     = [0, 0, 1, 0, 1, 0]      # H15:M15
WAREHOUSING     = [0, 0, 0, 1, 0, 0]      # H16:M16
EV_PERCENT      = [0.10, 0.20, 0.30, 0.40, 0.30, 0.50]   # H17:M17

# Step 3 — tech from rows 24-31
MOBILE_APP      = [1, 0, 0, 0, 0, 0]
VOICE_ORDERING  = [0, 1, 0, 0, 0, 0]
DARK_STORE      = [0, 0, 1, 0, 0, 0]
RIDER_APP       = [0, 0, 0, 1, 0, 0]
DEMAND_AI       = [0, 0, 0, 0, 1, 0]
DYNAMIC_PRICING = [0, 0, 0, 0, 0, 1]
SUPPLY_CHAIN    = [0, 0, 0, 0, 1, 0]
WEBSITE_SLIDER  = [1, 2, 3, 2, 3, 1]      # H31:M31

# Step 5 — marketing from rows 52-63
GOOGLE_ADS      = [1, 2, 3, 4, 2, 2]      # H52:M52 slider units
FACEBOOK_ADS    = [1, 2, 1, 2, 2, 3]
REFERRAL        = [1, 0, 0, 0, 0, 0]
FIRST_ORDER     = [0, 1, 0, 0, 0, 0]
INFLUENCER      = [0, 0, 1, 0, 0, 0]
CASHBACK        = [0, 0, 0, 1, 0, 0]
LOYALTY         = [0, 0, 0, 0, 1, 0]
PUSH_NOTIF      = [0, 0, 0, 0, 0, 1]
EMAIL_SMS       = [0, 0, 0, 0, 1, 0]
CREDIT_CARD     = [0, 0, 0, 1, 0, 0]
CORP_TIE_UPS    = [0, 0, 1, 0, 0, 0]
HOUSING_SOC     = [0, 1, 0, 0, 0, 0]

# Step 6 — HR from rows 70-72
CORPORATE_SPEND = [50000, 40000, 80000, 70000, 60000, 100000]   # O70:T70
EDUCATION_BUDG  = [1, 2, 1, 2, 1, 0]                            # H71:M71 slider units
RIDER_BONUS_PCT = [0.02, 0.05, 0.10, 0.15, 0.20, 0.25]          # H72:M72

# Step 7 — quality & pricing
QUALITY_LEVEL   = [1, 2, 3, 4, 5, 5]      # H76:M76
SP_MULTIPLIER   = [2.0, 2.2, 2.5, 2.6, 2.8, 3.2]  # H79:M79

# Now insert per player
for i, uid in enumerate(user_ids):

    # --- Player Step One ---
    p1 = PLAYER_STEP_ONE[i]
    db.playerstepones.insert_one({
        "userId": uid,
        "simulationId": sim_id,
        "roundNumber": 1,
        "businessModelId": bm_ids[p1["business"]],
        "marketPositionIds": [mp_ids[j] for j in p1["positions"]],
        "createdAt": now, "updatedAt": now,
    })

    # --- Sourcing selection (Step 4) — cycle through the 5 seeded suppliers ---
    db.userselections.insert_one({
        "userId": uid,
        "simulationId": sim_id,
        "roundNumber": 1,
        "supplierId": supplier_ids[i % len(supplier_ids)],
        "createdAt": now, "updatedAt": now,
    })

    # --- Player Product Category (Step 1 category enablement) ---
    db.playerproductcategories.insert_one({
        "userId": uid,
        "simulationId": sim_id,
        "roundNumber": 1,
        "categories": [
            {"categoryId": cat_ids["Food"],    "enabled": bool(FOOD_PLAY[i]),
             "baseCost": 1200,
             "pricingTiers": {"premium": 600, "standard": 1250, "basic": 1300, "discount": 1800},
             "inventoryRange": "Medium", "monthlyDemand": 4950},
            {"categoryId": cat_ids["Mobile"],  "enabled": bool(MOBILE_PLAY[i]),
             "baseCost": 1200,
             "pricingTiers": {"premium": 700, "standard": 800, "basic": 700, "discount": 900},
             "inventoryRange": "Medium", "monthlyDemand": 3100},
            {"categoryId": cat_ids["Clothes"], "enabled": bool(CLOTHES_PLAY[i]),
             "baseCost": 1200,
             "pricingTiers": {"premium": 200, "standard": 500, "basic": 700, "discount": 1200},
             "inventoryRange": "Low",    "monthlyDemand": 2600},
        ],
    })

    # --- Player Step Four (Delivery/Fleet) ---
    fleet_cost = (
        RIDERS[i] * 30000 + BIKES[i] * 25000
        + ROUTE_OPT[i]    * 100000
        + GPS_TRACKING[i] * 80000
        + ALGO_ASSIGN[i]  * 108000
        + WAREHOUSING[i]  * 105000
        + EV_PERCENT[i]   * BIKES[i] * 25000 * 2   # electric surcharge
    )
    db.playerstepfours.insert_one({
        "userId": uid, "simulationId": sim_id, "roundNumber": 1,
        "deliveryFleet": {
            "ownFleet": True,
            "ridersPerCity": RIDERS[i],
            "bikesPerCity":  BIKES[i],
            "electricBikes": {
                "enabled":     EV_PERCENT[i] > 0,
                "percentage":  EV_PERCENT[i],
                "electricBikeCost": 25000 * 2,
            },
            "thirdPartyDelivery": False,
        },
        "logisticsOptimization": {
            "routeOptimization":    bool(ROUTE_OPT[i]),
            "realTimeTracking":     bool(GPS_TRACKING[i]),
            "batchingAlgorithm":    bool(ALGO_ASSIGN[i]),
            "hyperlocalWarehousing":bool(WAREHOUSING[i]),
        },
        "totalMonthlyCost": fleet_cost,
        "kpis": {
            "deliveryQuality": 60 + 10*ROUTE_OPT[i] + 5*GPS_TRACKING[i],
            "coverage": 70, "sustainability": int(EV_PERCENT[i]*100),
            "flexibility": 50, "deliverySpeed": 65 + 10*ALGO_ASSIGN[i],
            "costEfficiency": 60, "scalability": 55 + 15*WAREHOUSING[i],
            "customerSatisfaction": 62, "brandPerception": 60,
            "operationalComplexity": 40, "riskExposure": 30,
        },
        "createdAt": now, "updatedAt": now,
    })

    # --- Player Step Five (Technology) ---
    tech_cost = (
        MOBILE_APP[i]      * 140000 +
        VOICE_ORDERING[i]  * 80000  +
        DARK_STORE[i]      * 108000 +
        RIDER_APP[i]       * 103500 +
        DEMAND_AI[i]       * 120000 +
        DYNAMIC_PRICING[i] * 120000 +
        SUPPLY_CHAIN[i]    * 80000  +
        WEBSITE_SLIDER[i]  * 35000
    )
    db.playerstepfives.insert_one({
        "userId": uid, "simulationId": sim_id, "roundNumber": 1,
        "customerFacing": {
            "mobileApp":          bool(MOBILE_APP[i]),
            "voiceOrdering":      bool(VOICE_ORDERING[i]),
            "websiteDevelopment": WEBSITE_SLIDER[i],
        },
        "operations": {
            "darkStoreSystem":       bool(DARK_STORE[i]),
            "riderApp":              bool(RIDER_APP[i]),
            "demandForecastingAI":   bool(DEMAND_AI[i]),
            "dynamicPricing":        bool(DYNAMIC_PRICING[i]),
            "supplyChainAnalytics":  bool(SUPPLY_CHAIN[i]),
        },
        "technologyBreakdown": {
            "customerFacing": {
                "mobileApp":          MOBILE_APP[i]      * 140000,
                "voiceOrdering":      VOICE_ORDERING[i]  * 80000,
                "websiteDevelopment": WEBSITE_SLIDER[i]  * 35000,
            },
            "operations": {
                "darkStoreSystem":       DARK_STORE[i]      * 108000,
                "riderApp":              RIDER_APP[i]       * 103500,
                "demandForecastingAI":   DEMAND_AI[i]       * 120000,
                "dynamicPricing":        DYNAMIC_PRICING[i] * 120000,
                "supplyChainAnalytics":  SUPPLY_CHAIN[i]    * 80000,
            },
        },
        "totalTechnologyCost": tech_cost,
        "kpis": {
            "customerFacing": {"reach": 50 + 20*MOBILE_APP[i], "conversion": 45 + 10*VOICE_ORDERING[i]},
            "operations":     {"efficiency": 40 + 15*DEMAND_AI[i], "accuracy": 40 + 12*DYNAMIC_PRICING[i]},
        },
        "createdAt": now, "updatedAt": now,
    })

    # --- Player Step Eight (Marketing) ---
    # NOTE: shape mirrors controllers/stepEight.controller.js's calculateMarketing()
    # contract exactly (acquisition/retention/partnerships groups) — this is what
    # the real frontend (MarketingSection.tsx) actually sends, unlike a flat object.
    mkt_breakdown = {
        "googleAds":          GOOGLE_ADS[i]   * 25000,
        "facebookAds":        FACEBOOK_ADS[i] * 20000,
        "referralProgram":    REFERRAL[i]     * 120000,
        "firstOrderDiscount": FIRST_ORDER[i]  * 150000,
        "influencerMarketing":INFLUENCER[i]   * 110000,
        "cashbackOption":     CASHBACK[i]     * 95000,
        "loyaltyProgram":     LOYALTY[i]      * 156000,
        "pushNotifications":  PUSH_NOTIF[i]   * 80000,
        "emailAndSMS":        EMAIL_SMS[i]    * 60000,
        "creditCardOffers":   CREDIT_CARD[i]  * 85000,
        "corporateTieUps":    CORP_TIE_UPS[i] * 150000,
        "housingSociety":     HOUSING_SOC[i]  * 120000,
    }
    marketing_cost = sum(mkt_breakdown.values())
    db.playerstepeights.insert_one({
        "userId": str(uid), "simulationId": str(sim_id), "roundNumber": 1,
        "marketing": {
            "acquisition": {
                "googleAds":           {"enabled": GOOGLE_ADS[i] > 0,   "budget": GOOGLE_ADS[i] * 25000},
                "facebookAds":         {"enabled": FACEBOOK_ADS[i] > 0, "budget": FACEBOOK_ADS[i] * 20000},
                "referralProgram":     {"enabled": bool(REFERRAL[i])},
                "firstOrderDiscount":  {"enabled": bool(FIRST_ORDER[i])},
                "influencerMarketing": {"enabled": bool(INFLUENCER[i]), "budget": INFLUENCER[i] * 110000},
            },
            "retention": {
                "cashbackCoupons":    {"enabled": bool(CASHBACK[i]),   "cost": CASHBACK[i] * 95000},
                "loyaltyProgram":     {"enabled": bool(LOYALTY[i]),    "cost": LOYALTY[i] * 156000},
                "pushNotifications":  {"enabled": bool(PUSH_NOTIF[i]), "cost": PUSH_NOTIF[i] * 80000},
                "emailSms":           {"enabled": bool(EMAIL_SMS[i]),  "budget": EMAIL_SMS[i] * 60000},
            },
            "partnerships": {
                "creditCardOffers": {"enabled": bool(CREDIT_CARD[i])},
                "corporateTieups":  {"enabled": bool(CORP_TIE_UPS[i])},
                "housingComplexes": {"enabled": bool(HOUSING_SOC[i]), "cost": HOUSING_SOC[i] * 120000},
            },
        },
        "totalCost": marketing_cost,
        "breakdown": mkt_breakdown,
        "kpis": {"awareness": 50 + 5*GOOGLE_ADS[i], "retention": 40 + 8*LOYALTY[i]},
    })

    # --- Player Step Nine (Operations HR) ---
    # corporateTeam headcount buckets mirror OperationsStaffingConfig's keys
    # (matches OperationsSection.tsx's employee->bucket mapping: CEO->founders,
    # COO->operationsTeam, CTO->techTeam, CMO->marketingTeam,
    # Head Supply->supplyChainTeam, Head Category->categoryTeam).
    #
    # NOTE on Excel parity: the workbook's "Corporate Team Size" (row 70) is a
    # single flat dollar figure per player (50000/40000/80000/70000/60000/
    # 100000) used directly for both HR cost AND the group min/mid/max
    # multiplier lookup. This app replaced that with a real headcount x
    # role-salary cost model (a deliberate richer feature from the HR/Ops
    # rewire) — its minimum possible spend (all 6 mandatory roles at
    # headcount 1, ~342500) already exceeds the Excel's entire target range,
    # so the two can never match in absolute rupees. techTeam headcount is
    # varied per player (1..6) purely to reproduce the Excel's *relative*
    # ranking (player2 < player1 < player5 < player4 < player3 < player6) so
    # the group-relative min/mid/max mechanic is exercised non-degenerately
    # instead of leaving 5 of 6 players tied at the minimum.
    TECH_TEAM_HEADCOUNT = [2, 1, 5, 4, 3, 6]
    rider_bonus_cost = RIDER_BONUS_PCT[i] * RIDERS[i] * 30000
    edu_cost         = EDUCATION_BUDG[i]  * 50000
    hr_total = CORPORATE_SPEND[i] + rider_bonus_cost + edu_cost
    db.playerstepnines.insert_one({
        "userId": uid, "simulationId": sim_id, "roundNumber": 1,
        "darkStoreStaff": {"pickersPackers": 4, "storeManager": 1},
        "deliveryStaff":  {"deliveryRiders": RIDERS[i], "riderSupervisors": 1},
        "corporateTeam":  {"founders": 1, "operationsTeam": 1, "techTeam": TECH_TEAM_HEADCOUNT[i],
                           "marketingTeam": 1, "supplyChainTeam": 1, "categoryTeam": 1},
        "educationBudgetPerRider": edu_cost,
        "riderBonusBudget": rider_bonus_cost,
        "totalMonthlyCost": hr_total,
        "kpis": {"quality": 55 + 10*EDUCATION_BUDG[i],
                 "speed": 60, "coverage": 55, "scalability": 55,
                 "customerSatisfaction": 50 + int(RIDER_BONUS_PCT[i]*100)},
        "createdAt": now, "updatedAt": now,
    })

    # --- PricingDecision (Step 7) ---
    quality_lookup = {1:1.0, 2:1.2, 3:1.4, 4:1.6, 5:1.8, 6:2.0, 7:2.4}
    base_price = 1200
    q_mult   = quality_lookup[QUALITY_LEVEL[i]]
    q_price  = base_price * q_mult
    sp_final = q_price * SP_MULTIPLIER[i]

    categories_pricing = []
    for cname, plays, demand in [
        ("Food",    FOOD_PLAY[i],    4950),
        ("Mobile",  MOBILE_PLAY[i],  3100),
        ("Clothes", CLOTHES_PLAY[i], 2600),
    ]:
        if not plays:
            continue
        categories_pricing.append({
            "categoryId": cat_ids[cname],
            "name": cname,
            "basePrice": base_price,
            "baseMonthlyDemand": demand,
            "qualityLevel":    QUALITY_LEVEL[i],
            "qualityMultiplier": q_mult,
            "qualityPrice":    q_price,
            "marginMultiplier":SP_MULTIPLIER[i],
            "finalSellingPrice": sp_final,
            "monthlyRevenue":  sp_final * demand * 0.15,   # rough share estimate
        })

    db.pricingdecisions.insert_one({
        "userId": uid, "simulationId": sim_id, "round": 1,
        "categories": categories_pricing,
        "selectedFeatures": [
            k for k, chosen in [
                ("mobile_app",           MOBILE_APP[i]),
                ("voice_ordering",       VOICE_ORDERING[i]),
                ("dark_store_system",    DARK_STORE[i]),
                ("rider_app",            RIDER_APP[i]),
                ("demand_forecasting_ai",DEMAND_AI[i]),
                ("dynamic_pricing",      DYNAMIC_PRICING[i]),
                ("supply_chain_analytics",SUPPLY_CHAIN[i]),
            ] if chosen
        ],
        "rdInvestment": 0,
        "createdAt": now, "updatedAt": now,
    })

print(f"Inserted decisions for {len(user_ids)} players (steps 1, 4, 5, 8, 9 + pricing).")
print("\nSeed complete.")
print(f"   Simulation ID : {sim_id}")
print(f"   Group ID      : {group_id}")
print(f"   User IDs      : {[str(u) for u in user_ids]}")