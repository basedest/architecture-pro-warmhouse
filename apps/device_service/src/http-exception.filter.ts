import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

// Приводит тело ответа об ошибке к контракту OpenAPI: { "error": "<сообщение>" }.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') {
        message = response;
      } else if (
        response &&
        typeof response === 'object' &&
        'message' in response
      ) {
        const raw = response.message;
        if (Array.isArray(raw)) {
          message = raw.join(', ');
        } else if (typeof raw === 'string') {
          message = raw;
        }
      }
    }

    reply.status(status).send({ error: message });
  }
}
