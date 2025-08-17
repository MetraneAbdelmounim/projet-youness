export class Analysis {
  _id?: string; // Mongo ObjectId as string
  temperature_ext: number = 0;
  avg_remaining_cloud: number = 0;
  sun_hours: number = 0;
  remaining_sun_hours: number = 0;
  battery_type: string = '';
  battery_capacity_loss: number = 0;
  solar_charge_loss_clouds: number = 0;
  solar_charge_efficiency: number = 0;
  predicted_end_day_voltage: number = 0;
  current_battery_voltage: number = 0;
  performance: string = 'DOWN';

  constructor(init?: Partial<Analysis>) {
    Object.assign(this, init);
  }
}