import { Project } from './project';

/** A simple IP-addressed device: modems and panneaux share this shape. */
export interface Device {
  _id: string;
  ip: string;
  nom: string;
  project?: Project;
  status: boolean;
  lastSeenAt: string | null;
}
