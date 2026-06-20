import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix('api/v1')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  )

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  })

  const port = process.env.PORT ?? 3001
  await app.listen(port)

  console.log(`🚀 API running on http://localhost:${port}/api/v1`)
}

bootstrap()
