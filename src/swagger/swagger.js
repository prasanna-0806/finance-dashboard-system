const swaggerJsdoc = require('swagger-jsdoc');

const CATEGORIES = [
  'Salary', 'Freelance', 'Investment', 'Consulting',
  'Rent', 'Utilities', 'Groceries', 'Marketing',
  'Travel', 'Equipment', 'Insurance', 'Subscriptions', 'Other'
];

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
    servers: [
      { url: 'https://finance-dashboard-system-5noe.onrender.com', description: 'Production' },
      { url: 'http://localhost:3000', description: 'Local development' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste the token from /api/auth/login here',
        },
      },
      parameters: {
        typeParam: {
          in: 'query',
          name: 'type',
          schema: { type: 'string', enum: ['income', 'expense'] },
          description: 'Filter by record type'
        },
        categoryParam: {
          in: 'query',
          name: 'category',
          schema: { type: 'string', enum: CATEGORIES },
          description: 'Filter by category'
        },
        dateFromParam: {
          in: 'query',
          name: 'dateFrom',
          schema: { type: 'string', format: 'date' },
          description: 'Records on or after this date (YYYY-MM-DD)'
        },
        dateToParam: {
          in: 'query',
          name: 'dateTo',
          schema: { type: 'string', format: 'date' },
          description: 'Records on or before this date (YYYY-MM-DD)'
        },
        pageParam: {
          in: 'query',
          name: 'page',
          schema: { type: 'integer', default: 1 },
          description: 'Page number'
        },
        limitParam: {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', default: 20 },
          description: 'Records per page (max 100)'
        },
        searchParam: {
          in: 'query',
          name: 'search',
          schema: { type: 'string' },
          description: 'Search notes and category'
        }
      }
    },
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);