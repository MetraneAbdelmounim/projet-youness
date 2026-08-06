import { Project } from './project';

/**
 * One telemetry sample.
 *
 * Every measurement is nullable: the poller records `null` when a register
 * could not be read, which keeps "unknown" distinct from a genuine reading of
 * zero. Templates should render a placeholder for null rather than "0 V".
 */
export interface Reading {
  Battery_Voltage: number | null;
  Charge_Current: number | null;
  Temperature_Ambient: number | null;
  Temperature_Battery: number | null;
  Array_Voltage: number | null;
  Sweep_Pmax: number | null;
  Load_Voltage: number | null;
  Load_Current: number | null;
  measuredAt: string | null;
  reachable: boolean;
  error: string | null;
}

export type Performance = 'UP' | 'MEDIUM' | 'DOWN' | 'UNKNOWN';

export interface Analysis {
  temperature_ext?: number;
  avg_remaining_cloud?: number;
  sun_hours?: number;
  remaining_sun_hours?: number;
  battery_type?: string;
  battery_capacity_loss?: number;
  solar_charge_loss_clouds?: number;
  solar_charge_efficiency?: number;
  predicted_end_day_voltage?: number | null;
  current_battery_voltage?: number | null;
  performance: Performance;
  computedAt?: string;
}

export interface Site {
  _id: string;
  ip: string;
  nom: string;
  Battery_Type: 'AGM' | 'LITHIUM';
  latitude: number;
  longitude: number;
  project?: Project;

  // Optional on purpose. The list endpoints use `.lean()`, which skips Mongoose
  // hydration and therefore does not apply schema defaults — a station document
  // written before these fields existed comes back without them, and one that
  // has never been polled has nothing to report yet.
  lastReading?: Reading;
  lastAnalysis?: Analysis;

  /** ICMP reachability as of the last sweep. */
  status: boolean;
  lastSeenAt: string | null;
}

/** A point from the time-series history endpoint. */
export interface HistoryPoint {
  ts: string;
  Battery_Voltage: number | null;
  Charge_Current: number | null;
  Array_Voltage: number | null;
  Load_Voltage: number | null;
  Load_Current: number | null;
  Temperature_Battery: number | null;
  Temperature_Ambient: number | null;
  Sweep_Pmax: number | null;
}
