const db = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.register = (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Todos los campos son requeridos" });
  }

  const hash = bcrypt.hashSync(password, 10);

  db.query(
    "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
    [name, email, hash],
    (err) => {
      if (err) {
        // Email duplicado
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ message: "El correo ya está registrado" });
        }
        return res.status(500).json({ message: "Error al registrar usuario" });
      }
      res.status(201).json({ message: "Usuario registrado" });
    }
  );
};

exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Todos los campos son requeridos" });
  }

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
    if (err) return res.status(500).json({ message: "Error del servidor" });

    if (result.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const user = result[0];

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    const token = jwt.sign({ id: user.id, name: user.name }, "secretkey", {
      expiresIn: "1h",
    });

    res.json({ token });
  });
};