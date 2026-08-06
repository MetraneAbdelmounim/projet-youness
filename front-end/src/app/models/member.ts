import { Project } from './project';

/** Note: the API never returns a password hash, so the model does not carry one. */
export interface Member {
  _id: string;
  username: string;
  actif: boolean;
  isAdmin: boolean;
  notification: boolean;
  mustChangePassword: boolean;
  /** Absent on legacy documents read through `.lean()`; treat as empty. */
  projects?: Project[];
}
