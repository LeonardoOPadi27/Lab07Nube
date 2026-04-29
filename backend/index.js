const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// rutas API
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const db = require("./db");

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);

// servir frontend (IMPORTANTE poner después de API)
app.use(express.static(path.join(__dirname, "frontend")));

// ruta principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend/login.html"));
});

// levantar servidor
db.ready
  .then(() => {
    app.listen(3000, () => {
      console.log("Servidor en http://localhost:3000");
    });
  })
  .catch((err) => {
    console.error("No se pudo iniciar el servidor por un error de base de datos:", err);
    process.exit(1);
  });