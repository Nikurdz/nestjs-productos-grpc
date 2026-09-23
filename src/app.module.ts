import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppController } from './app.controller';
import { ProductosRestController } from './productos.rest.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'PRODUCTO_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'productos',
          protoPath: join(__dirname, 'productos.proto'),
          url: process.env.GRPC_URL ?? '127.0.0.1:5000',
        },
      },
    ]),
  ],
  controllers: [AppController, ProductosRestController],
})
export class AppModule {}