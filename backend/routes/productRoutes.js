const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/productController");
const auth = require("../middleware/authMiddleware");

router.get("/",     auth, ctrl.getAll);
router.post("/",    auth, ctrl.create);
router.put("/:id",  auth, ctrl.update);
router.delete("/:id", auth, ctrl.delete);

module.exports = router;