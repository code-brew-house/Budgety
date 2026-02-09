import { Injectable } from '@nestjs/common';
import { auth } from './auth';
import { fromNodeHeaders } from 'better-auth/node';
import { IncomingHttpHeaders } from 'http';

@Injectable()
export class AuthService {
  async getSession(headers: IncomingHttpHeaders) {
    return auth.api.getSession({
      headers: fromNodeHeaders(headers),
    });
  }
}
