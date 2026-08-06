import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DeviceService } from './device.service';

@Injectable({ providedIn: 'root' })
export class PanneauService extends DeviceService {
  constructor(http: HttpClient) {
    super(http, 'panneaus');
  }
}
