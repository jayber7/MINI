function errorHandler(err, req, res, next) {
  console.error(err.stack);

  if (err.name === 'SequelizeValidationError') {
    const errores = err.errors.map((e) => ({
      campo: e.path,
      mensaje: e.message,
    }));
    return res.status(400).json({
      error: 'Error de validación',
      detalles: errores,
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: 'Registro duplicado',
      mensaje: `Ya existe un registro con ${err.errors[0].path} igual`,
    });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      error: 'Referencia inválida',
      mensaje: 'La referencia a otro registro no es válida',
    });
  }

  res.status(500).json({
    error: 'Error interno del servidor',
    mensaje: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}

module.exports = errorHandler;
