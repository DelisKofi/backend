const swaggerOptions ={
definition: {
    openapi: '3.0.0',
  info: {
    title: 'Retail Pro API',
    version: '1.0.0',
    description: 'API for Retail Pro Point of Sale system',
  },
  servers: [
      {
        url: `http://localhost:${process.env.PORT || 8000}`,
      },
    ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
},
apis: ['./src/modules/*/*.route.ts', './src/index.ts'],
}

export { swaggerOptions }