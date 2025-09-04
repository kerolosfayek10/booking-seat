// This file serves as the entry point for Vercel serverless deployment
// It creates a NestJS application handler for serverless environment

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
const { ValidationPipe } = require('@nestjs/common');
const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');

let cachedApp;

module.exports = async (req, res) => {
  if (!cachedApp) {
    const app = await NestFactory.create(AppModule);
    
    // Enable CORS for frontend communication
    app.enableCors({
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://booking-seat-six.vercel.app', 'https://booking-seat-six.vercel.app/'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      credentials: true
    });
    
    // Enable validation globally
    app.useGlobalPipes(new ValidationPipe());
    
    // Swagger configuration
    const config = new DocumentBuilder()
      .setTitle('Booking API')
      .setDescription('API for seat booking system with receipt management')
      .setVersion('1.0')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
    
    await app.init();
    cachedApp = app;
  }
  
  return cachedApp.getHttpAdapter().getInstance()(req, res);
};
