const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Finance Dashboard API',
      version: '1.0.0',
      description:
        'Backend API for a finance dashboard with role-based access control. ' +
        'Roles: admin (full access), analyst (read + dashboard), viewer (dashboard only).',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Local development' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste the token from /api/auth/login here',
        },
      },
    },
  },
  // Pick up all JSDoc @swagger comments from route files
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
