require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();
connectDB();

app.use(cors({
  origin: "*",        
  credentials: true
}));

app.use(express.json());
app.get("/", (req, res) => {
  res.send("Backend is running");
});
const supplierRoutes = require("./routes/supplier.routes");
const selectionRoutes = require("./routes/selection.routes");
const newsRoutes = require("./routes/newsroutes");
const teamProfileRoutes = require("./routes/teamProfileRoutes");
const incomeRoutes = require("./routes/incomeRoutes");
const balanceRoutes = require("./routes/balanceRoutes");
const cashFlowRoutes = require("./routes/cashFlowRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const staffRoutes = require("./routes/staffRoutes");
const scoreRoutes = require("./routes/scoreRoutes");

app.use("/api/scores", scoreRoutes);

app.use("/api/staff", staffRoutes);
app.use("/api/inventory", inventoryRoutes);

app.use("/api/cashflow", cashFlowRoutes);
app.use("/api/balance", balanceRoutes);
app.use("/api/simulation", require("./routes/simulation.routes"));
app.use("/api/income", incomeRoutes);
app.use("/api/team", teamProfileRoutes);
app.use("/api/group", require("./routes/group.routes"));
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/step-one", require("./routes/stepOne.routes"));
app.use("/api/admin", require("./routes/adminOptions.routes"));
app.use("/api/step-two", require("./routes/stepTwo.routes"));
const stepFourRoutes = require("./routes/stepFour.routes");
const deliveryConfigRoutes = require("./routes/deliveryConfig.routes");
const stepNineRoutes = require("./routes/stepNine.routes");
const pricingRoutes = require("./routes/pricing.routes");
app.use("/api/delivery-config", deliveryConfigRoutes);
app.use("/api/step-four", stepFourRoutes);
app.use("/api/step-five", require("./routes/stepFive.route"));
app.use("/api/technology-config", require("./routes/technologyConfig.routes"));
app.use("/api/step-eight", require("./routes/stepEight.routes"));
app.use("/api/marketing-config", require("./routes/marketingConfig.routes"));
app.use("/api", stepNineRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/selection", selectionRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/hr", require("./routes/hr.routes"));
const analysisRoutes = require("./routes/analysis.routes");
app.use("/api/category-analysis", require("./routes/categoryAnalysis.routes"));
app.use("/api/analysis", analysisRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/business-plan", require("./routes/businessPlanRoutes"));
const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
