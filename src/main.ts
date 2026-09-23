import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'productos',
      protoPath: join(__dirname, 'productos.proto'),
      url: '0.0.0.0:5000',
    },
  });

  const config = new DocumentBuilder()
    .setTitle('API Productos')
    .setDescription('REST + Swagger que consume el microservicio gRPC de productos')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  await app.startAllMicroservices();
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Swagger en http://localhost:${port}/docs | gRPC en 0.0.0.0:5000`);
}
bootstrap();