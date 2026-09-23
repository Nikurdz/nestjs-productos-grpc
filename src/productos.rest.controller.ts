import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  OnModuleInit,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { lastValueFrom, Observable, toArray } from 'rxjs';

interface ProductoDto {
  id: number;
  nombre: string;
  precio: number;
}

interface ProductoServiceGrpc {
  obtenerProducto(data: { id: number }): Observable<ProductoDto>;
  listarProductos(data: object): Observable<ProductoDto>;
  buscarPorPrecioMaximo(data: { precioMaximo: number }): Observable<ProductoDto>;
}

@ApiTags('Productos (REST → gRPC)')
@Controller('api/v1/productos')
export class ProductosRestController implements OnModuleInit {
  private productoService: ProductoServiceGrpc;

  constructor(@Inject('PRODUCTO_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.productoService = this.client.getService<ProductoServiceGrpc>('ProductoService');
  }

  @Get()
  @ApiOperation({ summary: 'Lista todos los productos (server streaming gRPC)' })
  listar() {
    return lastValueFrom(this.productoService.listarProductos({}).pipe(toArray()));
  }

  @Get('buscar')
  @ApiOperation({ summary: 'Productos con precio <= precioMaximo (server streaming gRPC)' })
  @ApiQuery({ name: 'precioMaximo', type: Number, example: 50 })
  buscar(@Query('precioMaximo') precioMaximo: string) {
    return lastValueFrom(
      this.productoService.buscarPorPrecioMaximo({ precioMaximo: Number(precioMaximo) }).pipe(toArray()),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un producto por id (unary gRPC)' })
  async obtener(@Param('id', ParseIntPipe) id: number) {
    try {
      return await lastValueFrom(this.productoService.obtenerProducto({ id }));
    } catch (e: any) {
      if (e?.code === 5) {
        throw new NotFoundException(e.details ?? e.message);
      }
      throw e;
    }
  }
}