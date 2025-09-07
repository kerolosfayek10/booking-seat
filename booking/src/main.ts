import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend communication
  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 
      'https://booking-seat-six.vercel.app', 
      'https://booking-seat-six.vercel.app/',
      'https://booking-seat-git-stage-kerolos-projects-3e0137c1.vercel.app',
            'https://booking-seat-2b14.vercel.app'], // Allow frontend origins
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
  });
  
  // Enable validation globally (less strict for multipart forms)
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: false, // Don't remove extra properties
    forbidNonWhitelisted: false, // Allow extra properties
    skipMissingProperties: true, // Skip validation for missing properties
    disableErrorMessages: false
  }));
  
  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Booking API')
    .setDescription('API for seat booking system with receipt management')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'access-token', // اسم الـ security scheme
    )
    .build();

  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  //cc
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();

