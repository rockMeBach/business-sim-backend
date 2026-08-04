const router = require("express").Router();
const { login, me } = require("../controllers/auth.controller");

router.post("/login", login);
router.get("/me", me);

module.exports = router;
