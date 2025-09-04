import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend communication
  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://booking-seat-six.vercel.app', 'https://booking-seat-six.vercel.app/'], // Allow frontend origins
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
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

// For Vercel serverless deployment
export default async function handler(req: any, res: any) {
  if (!global.cachedApp) {
    const app = await NestFactory.create(AppModule);
    
    app.enableCors({
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://booking-seat-six.vercel.app', 'https://booking-seat-six.vercel.app/'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      credentials: true
    });
    
    app.useGlobalPipes(new ValidationPipe());
    
    const config = new DocumentBuilder()
      .setTitle('Booking API')
      .setDescription('API for seat booking system with receipt management')
      .setVersion('1.0')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
    
    await app.init();
    global.cachedApp = app;
  }
  
  return global.cachedApp.getHttpAdapter().getInstance()(req, res);
}

// Only run bootstrap in non-serverless environments
if (require.main === module) {
  bootstrap();
}
