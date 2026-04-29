const db = require("../db");

exports.getAll = (req, res) => {
  db.query("SELECT * FROM products", (err, result) => {
    if (err) return res.status(500).json({ message: "Error al obtener productos" });
    res.json(result); // result siempre es array aunque esté vacío
  });
};

exports.create = (req, res) => {
  const { name, price } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ message: "Nombre y precio son requeridos" });
  }

  db.query(
    "INSERT INTO products (name, price) VALUES (?, ?)",
    [name, price],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Error al crear producto" });
      res.status(201).json({ message: "Producto creado", id: result.insertId });
    }
  );
};

exports.delete = (req, res) => {
  db.query(
    "DELETE FROM products WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ message: "Error al eliminar producto" });
      res.json({ message: "Producto eliminado" });
    }
  );
};

exports.update = (req, res) => {
  const { name, price } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ message: "Nombre y precio son requeridos" });
  }

  db.query(
    "UPDATE products SET name=?, price=? WHERE id=?",
    [name, price, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ message: "Error al actualizar producto" });
      res.json({ message: "Producto actualizado" });
    }
  );
};