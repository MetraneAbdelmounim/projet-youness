import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home/home.component';
import { DashbordComponent } from './dashbord/dashbord.component';
import { AnalysisComponent } from './analysis/analysis.component';
import { AnalysisDetailsComponent } from './analysis-details/analysis-details.component';
import { ModemsComponent } from './modems/modems.component';
import { PanneausComponent } from './panneaus/panneaus.component';
import { ListProjectsComponent } from './list-projects/list-projects.component';
import { LicenceComponent } from './licence/licence.component';
import { AdminSiteComponent } from './dashbord/admin-site/admin-site.component';
import { AdminMemberComponent } from './dashbord/admin-member/admin-member.component';
import { AdminModemsComponent } from './dashbord/admin-modems/admin-modems.component';
import { AdminPanneauComponent } from './dashbord/admin-panneau/admin-panneau.component';
import { AdminProjectComponent } from './dashbord/admin-project/admin-project.component';
import { ChangePasswordComponent } from './dashbord/change-password/change-password.component';

import { authGuard, adminGuard } from './services/auth-guard.service';
import { licenceGuard } from './services/licence-guard.service';

const authed = [licenceGuard, authGuard];
const admin = [licenceGuard, authGuard, adminGuard];

const routes: Routes = [
  { path: '', component: LoginComponent },

  { path: 'projects', component: ListProjectsComponent, canActivate: authed },
  { path: 'project/:id/mppt', component: HomeComponent, canActivate: authed },
  { path: 'project/:id/analysis', component: AnalysisComponent, canActivate: authed },
  { path: 'project/:id/modems', component: ModemsComponent, canActivate: authed },
  { path: 'project/:id/panneaux', component: PanneausComponent, canActivate: authed },
  { path: 'project/:id/dashbord', component: DashbordComponent, canActivate: authed },
  {
    path: 'project/:idProject/analysis/:idSite',
    component: AnalysisDetailsComponent,
    canActivate: authed,
  },

  // Reachable without a session and without a licence — this is the screen that
  // installs one on first start-up.
  { path: 'licence', component: LicenceComponent },
  { path: 'license-expired', redirectTo: 'licence' },
  { path: 'dashbord/licence', component: LicenceComponent, canActivate: [authGuard, adminGuard] },

  { path: 'dashbord/sites', component: AdminSiteComponent, canActivate: admin },
  { path: 'dashbord/members', component: AdminMemberComponent, canActivate: admin },
  { path: 'dashbord/modems', component: AdminModemsComponent, canActivate: admin },
  { path: 'dashbord/panneaux', component: AdminPanneauComponent, canActivate: admin },
  { path: 'dashbord/projects', component: AdminProjectComponent, canActivate: admin },
  { path: 'dashbord/change-password', component: ChangePasswordComponent, canActivate: authed },

  { path: '**', redirectTo: 'projects' },
];

@NgModule({
  // `useHash` is kept: the Express server serves index.html for unknown paths,
  // but switching away from hash URLs would invalidate every bookmark in use.
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
