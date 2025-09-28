/**
 * Middleware de gestion des erreurs globales
 */
const errorHandler = (error, req, res, next) => {
  console.error('💥 Server Error:', error);
  
  // Si les headers ont déjà été envoyés, déléguer à Express
  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

/**
 * Middleware pour les routes non trouvées
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`
  });
};

/**
 * Middleware de logging des requêtes
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log de la requête entrante
  console.log(`📥 ${req.method} ${req.path} - ${req.ip}`);
  
  // Log de la réponse quand elle est terminée
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const emoji = status >= 400 ? '❌' : status >= 300 ? '⚡' : '✅';
    console.log(`📤 ${emoji} ${req.method} ${req.path} - ${status} (${duration}ms)`);
  });
  
  next();
};

export {
  errorHandler,
  notFoundHandler,
  requestLogger
};